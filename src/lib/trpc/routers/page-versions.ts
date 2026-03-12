import { z } from "zod";
import { eq, desc, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { pageVersions, pages, blocks, users } from "@/lib/db/schema";
import { requirePageRole } from "../verify-access";
import type { Database } from "@/lib/db";

export const pageVersionsRouter = router({
  /** List versions for a page */
  list: protectedProcedure
    .input(z.object({ pageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await requirePageRole(
        ctx.db as Database,
        input.pageId,
        ctx.user.id,
        "viewer",
      );

      const rows = await ctx.db
        .select({
          id: pageVersions.id,
          title: pageVersions.title,
          editedBy: pageVersions.editedBy,
          createdAt: pageVersions.createdAt,
          editorName: users.name,
          editorImage: users.image,
        })
        .from(pageVersions)
        .leftJoin(users, eq(pageVersions.editedBy, users.id))
        .where(eq(pageVersions.pageId, input.pageId))
        .orderBy(desc(pageVersions.createdAt))
        .limit(50);

      return rows;
    }),

  /** Get a specific version's content */
  get: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const version = await ctx.db
        .select()
        .from(pageVersions)
        .where(eq(pageVersions.id, input.versionId))
        .then((rows) => rows[0]);

      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await requirePageRole(
        ctx.db as Database,
        version.pageId,
        ctx.user.id,
        "viewer",
      );

      return version;
    }),

  /** Create a snapshot of the current page state */
  create: protectedProcedure
    .input(z.object({ pageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await requirePageRole(
        ctx.db as Database,
        input.pageId,
        ctx.user.id,
        "editor",
      );

      const page = await ctx.db
        .select({ title: pages.title })
        .from(pages)
        .where(eq(pages.id, input.pageId))
        .then((r) => r[0]);

      const currentBlocks = await ctx.db
        .select()
        .from(blocks)
        .where(eq(blocks.pageId, input.pageId))
        .orderBy(asc(blocks.position));

      const [version] = await ctx.db
        .insert(pageVersions)
        .values({
          pageId: input.pageId,
          title: page?.title ?? "Untitled",
          blocksSnapshot: currentBlocks,
          editedBy: ctx.user.id,
        })
        .returning();

      return version;
    }),

  /** Restore a version — overwrites current blocks with snapshot */
  restore: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const version = await ctx.db
        .select()
        .from(pageVersions)
        .where(eq(pageVersions.id, input.versionId))
        .then((rows) => rows[0]);

      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await requirePageRole(
        ctx.db as Database,
        version.pageId,
        ctx.user.id,
        "editor",
      );

      // Save current state as a new version before overwriting
      const currentBlocks = await ctx.db
        .select()
        .from(blocks)
        .where(eq(blocks.pageId, version.pageId))
        .orderBy(asc(blocks.position));

      const currentPage = await ctx.db
        .select({ title: pages.title })
        .from(pages)
        .where(eq(pages.id, version.pageId))
        .then((r) => r[0]);

      await ctx.db.insert(pageVersions).values({
        pageId: version.pageId,
        title: currentPage?.title ?? "Untitled",
        blocksSnapshot: currentBlocks,
        editedBy: ctx.user.id,
      });

      // Delete current blocks
      await ctx.db.delete(blocks).where(eq(blocks.pageId, version.pageId));

      // Restore blocks from snapshot
      const snapshot = version.blocksSnapshot as Array<{
        id: string;
        pageId: string;
        parentId: string | null;
        type: string;
        content: Record<string, unknown>;
        props: Record<string, unknown>;
        position: string;
        createdBy: string | null;
      }>;

      if (snapshot.length > 0) {
        await ctx.db.insert(blocks).values(
          snapshot.map((b) => ({
            pageId: version.pageId,
            parentId: b.parentId,
            type: b.type as typeof blocks.$inferInsert.type,
            content: b.content,
            props: b.props,
            position: b.position,
            createdBy: b.createdBy,
          })),
        );
      }

      // Restore title if stored
      if (version.title) {
        await ctx.db
          .update(pages)
          .set({ title: version.title, updatedAt: new Date() })
          .where(eq(pages.id, version.pageId));
      }

      return { success: true, pageId: version.pageId };
    }),
});
