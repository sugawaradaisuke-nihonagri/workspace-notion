import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { comments, users } from "@/lib/db/schema";
import { requirePageRole } from "../verify-access";
import type { Database } from "@/lib/db";

export const commentsRouter = router({
  /** List comments for a page (top-level + nested replies) */
  list: protectedProcedure
    .input(z.object({ pageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await requirePageRole(
        ctx.db as Database,
        input.pageId,
        ctx.user.id,
        "viewer",
      );

      // Fetch all comments for this page with author info
      const rows = await ctx.db
        .select({
          id: comments.id,
          pageId: comments.pageId,
          parentId: comments.parentId,
          authorId: comments.authorId,
          authorName: users.name,
          authorImage: users.image,
          content: comments.content,
          inlineRef: comments.inlineRef,
          isResolved: comments.isResolved,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
        })
        .from(comments)
        .leftJoin(users, eq(comments.authorId, users.id))
        .where(eq(comments.pageId, input.pageId))
        .orderBy(asc(comments.createdAt));

      // Build tree: top-level comments with nested replies
      const topLevel = rows.filter((r) => !r.parentId);
      const replies = rows.filter((r) => !!r.parentId);

      return topLevel.map((comment) => ({
        ...comment,
        replies: replies.filter((r) => r.parentId === comment.id),
      }));
    }),

  /** Create a comment (or reply to an existing one) */
  create: protectedProcedure
    .input(
      z.object({
        pageId: z.string().uuid(),
        content: z.string().min(1).max(10000),
        parentId: z.string().uuid().nullable().optional(),
        inlineRef: z
          .object({
            blockId: z.string().optional(),
            text: z.string().optional(),
            from: z.number().optional(),
            to: z.number().optional(),
          })
          .nullable()
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requirePageRole(
        ctx.db as Database,
        input.pageId,
        ctx.user.id,
        "commenter",
      );

      // If replying, verify parent exists and belongs to same page
      if (input.parentId) {
        const parent = await ctx.db
          .select({ id: comments.id, pageId: comments.pageId })
          .from(comments)
          .where(eq(comments.id, input.parentId))
          .then((rows) => rows[0]);

        if (!parent || parent.pageId !== input.pageId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Parent comment not found",
          });
        }
      }

      const [comment] = await ctx.db
        .insert(comments)
        .values({
          pageId: input.pageId,
          authorId: ctx.user.id,
          content: input.content,
          parentId: input.parentId ?? null,
          inlineRef: input.inlineRef ?? null,
        })
        .returning();

      return comment;
    }),

  /** Update a comment's content */
  update: protectedProcedure
    .input(
      z.object({
        commentId: z.string().uuid(),
        content: z.string().min(1).max(10000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db
        .select()
        .from(comments)
        .where(eq(comments.id, input.commentId))
        .then((rows) => rows[0]);

      if (!comment) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Only the author can edit
      if (comment.authorId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not the author" });
      }

      const [updated] = await ctx.db
        .update(comments)
        .set({ content: input.content, updatedAt: new Date() })
        .where(eq(comments.id, input.commentId))
        .returning();

      return updated;
    }),

  /** Resolve or unresolve a comment thread */
  resolve: protectedProcedure
    .input(
      z.object({
        commentId: z.string().uuid(),
        isResolved: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db
        .select()
        .from(comments)
        .where(eq(comments.id, input.commentId))
        .then((rows) => rows[0]);

      if (!comment) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await requirePageRole(
        ctx.db as Database,
        comment.pageId,
        ctx.user.id,
        "commenter",
      );

      const [updated] = await ctx.db
        .update(comments)
        .set({ isResolved: input.isResolved, updatedAt: new Date() })
        .where(eq(comments.id, input.commentId))
        .returning();

      return updated;
    }),

  /** Delete a comment */
  delete: protectedProcedure
    .input(z.object({ commentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db
        .select()
        .from(comments)
        .where(eq(comments.id, input.commentId))
        .then((rows) => rows[0]);

      if (!comment) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Only the author can delete
      if (comment.authorId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not the author" });
      }

      // Delete replies first, then the comment itself
      await ctx.db
        .delete(comments)
        .where(eq(comments.parentId, input.commentId));
      await ctx.db.delete(comments).where(eq(comments.id, input.commentId));

      return { success: true };
    }),
});
