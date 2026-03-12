import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { pageShares, users } from "@/lib/db/schema";
import { requirePageRole } from "../verify-access";
import type { Database } from "@/lib/db";

const roleSchema = z.enum(["owner", "admin", "editor", "commenter", "viewer"]);

export const pageSharesRouter = router({
  /** List all shares for a page */
  list: protectedProcedure
    .input(z.object({ pageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Any viewer can see who has access
      await requirePageRole(
        ctx.db as Database,
        input.pageId,
        ctx.user.id,
        "viewer",
      );

      const rows = await ctx.db
        .select({
          id: pageShares.id,
          pageId: pageShares.pageId,
          userId: pageShares.userId,
          role: pageShares.role,
          userName: users.name,
          userImage: users.image,
          userEmail: users.email,
          createdAt: pageShares.createdAt,
        })
        .from(pageShares)
        .leftJoin(users, eq(pageShares.userId, users.id))
        .where(eq(pageShares.pageId, input.pageId));

      return rows;
    }),

  /** Share a page with a user (or update existing share) */
  create: protectedProcedure
    .input(
      z.object({
        pageId: z.string().uuid(),
        userId: z.string().uuid(),
        role: roleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Only admin+ can manage page shares
      await requirePageRole(
        ctx.db as Database,
        input.pageId,
        ctx.user.id,
        "admin",
      );

      // Can't share with yourself
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot share a page with yourself",
        });
      }

      // Check if share already exists → update
      const existing = await ctx.db
        .select({ id: pageShares.id })
        .from(pageShares)
        .where(
          and(
            eq(pageShares.pageId, input.pageId),
            eq(pageShares.userId, input.userId),
          ),
        )
        .then((rows) => rows[0]);

      if (existing) {
        const [updated] = await ctx.db
          .update(pageShares)
          .set({ role: input.role })
          .where(eq(pageShares.id, existing.id))
          .returning();
        return updated;
      }

      const [share] = await ctx.db
        .insert(pageShares)
        .values({
          pageId: input.pageId,
          userId: input.userId,
          role: input.role,
        })
        .returning();

      return share;
    }),

  /** Update the role of an existing share */
  update: protectedProcedure
    .input(
      z.object({
        shareId: z.string().uuid(),
        role: roleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const share = await ctx.db
        .select()
        .from(pageShares)
        .where(eq(pageShares.id, input.shareId))
        .then((rows) => rows[0]);

      if (!share) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await requirePageRole(
        ctx.db as Database,
        share.pageId,
        ctx.user.id,
        "admin",
      );

      const [updated] = await ctx.db
        .update(pageShares)
        .set({ role: input.role })
        .where(eq(pageShares.id, input.shareId))
        .returning();

      return updated;
    }),

  /** Remove a share */
  delete: protectedProcedure
    .input(z.object({ shareId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const share = await ctx.db
        .select()
        .from(pageShares)
        .where(eq(pageShares.id, input.shareId))
        .then((rows) => rows[0]);

      if (!share) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await requirePageRole(
        ctx.db as Database,
        share.pageId,
        ctx.user.id,
        "admin",
      );

      await ctx.db.delete(pageShares).where(eq(pageShares.id, input.shareId));

      return { success: true };
    }),
});
