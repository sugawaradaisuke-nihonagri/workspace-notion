import { z } from "zod";
import { eq, and, asc, desc, ilike, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generateKeyBetween } from "fractional-indexing";
import { router, workspaceProcedure, protectedProcedure } from "../init";
import { pages, blocks, users } from "@/lib/db/schema";
import { requirePageRole } from "../verify-access";
import type { Database } from "@/lib/db";

const pageTypeSchema = z.enum(["page", "database", "database_row"]);

export const pagesRouter = router({
  list: workspaceProcedure.query(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select()
      .from(pages)
      .where(
        and(
          eq(pages.workspaceId, input.workspaceId),
          eq(pages.isDeleted, false),
        ),
      )
      .orderBy(asc(pages.position));

    // フラットリストを返す（クライアント側で parentId を使いツリー構築）
    return rows;
  }),

  get: protectedProcedure
    .input(z.object({ pageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await requirePageRole(
        ctx.db as Database,
        input.pageId,
        ctx.user.id,
        "viewer",
      );

      const page = await ctx.db
        .select()
        .from(pages)
        .where(eq(pages.id, input.pageId))
        .then((rows) => rows[0]);

      if (!page) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const pageBlocks = await ctx.db
        .select()
        .from(blocks)
        .where(eq(blocks.pageId, input.pageId))
        .orderBy(asc(blocks.position));

      return { ...page, blocks: pageBlocks };
    }),

  create: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        parentId: z.string().uuid().nullable().optional(),
        title: z.string().max(500).optional().default("Untitled"),
        icon: z.string().optional().default("📄"),
        type: pageTypeSchema.optional().default("page"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 同じ親の最後のページの position を取得
      const siblings = await ctx.db
        .select({ position: pages.position })
        .from(pages)
        .where(
          and(
            eq(pages.workspaceId, input.workspaceId),
            input.parentId
              ? eq(pages.parentId, input.parentId)
              : sql`${pages.parentId} IS NULL`,
            eq(pages.isDeleted, false),
          ),
        )
        .orderBy(asc(pages.position));

      const lastPosition =
        siblings.length > 0 ? siblings[siblings.length - 1].position : null;
      const newPosition = generateKeyBetween(lastPosition, null);

      const [page] = await ctx.db
        .insert(pages)
        .values({
          workspaceId: input.workspaceId,
          parentId: input.parentId ?? null,
          title: input.title,
          icon: input.icon,
          type: input.type,
          position: newPosition,
          createdBy: ctx.user.id,
          lastEditedBy: ctx.user.id,
        })
        .returning();

      return page;
    }),

  update: protectedProcedure
    .input(
      z.object({
        pageId: z.string().uuid(),
        title: z.string().max(500).optional(),
        icon: z.string().optional(),
        coverUrl: z.string().url().nullable().optional(),
        parentId: z.string().uuid().nullable().optional(),
        position: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requirePageRole(
        ctx.db as Database,
        input.pageId,
        ctx.user.id,
        "editor",
      );

      const { pageId, ...updates } = input;
      const setData: Record<string, unknown> = {
        updatedAt: new Date(),
        lastEditedBy: ctx.user.id,
      };
      if (updates.title !== undefined) setData.title = updates.title;
      if (updates.icon !== undefined) setData.icon = updates.icon;
      if (updates.coverUrl !== undefined) setData.coverUrl = updates.coverUrl;
      if (updates.parentId !== undefined) setData.parentId = updates.parentId;
      if (updates.position !== undefined) setData.position = updates.position;

      const [updated] = await ctx.db
        .update(pages)
        .set(setData)
        .where(eq(pages.id, pageId))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ pageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await requirePageRole(
        ctx.db as Database,
        input.pageId,
        ctx.user.id,
        "editor",
      );

      const [deleted] = await ctx.db
        .update(pages)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          lastEditedBy: ctx.user.id,
        })
        .where(eq(pages.id, input.pageId))
        .returning();

      return deleted;
    }),

  restore: protectedProcedure
    .input(z.object({ pageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await requirePageRole(
        ctx.db as Database,
        input.pageId,
        ctx.user.id,
        "editor",
      );

      const [restored] = await ctx.db
        .update(pages)
        .set({
          isDeleted: false,
          deletedAt: null,
          lastEditedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(pages.id, input.pageId))
        .returning();

      return restored;
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        pageId: z.string().uuid(),
        afterPageId: z.string().uuid().nullable(),
        parentId: z.string().uuid().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const access = await requirePageRole(
        ctx.db as Database,
        input.pageId,
        ctx.user.id,
        "editor",
      );

      const page = await ctx.db
        .select()
        .from(pages)
        .where(eq(pages.id, input.pageId))
        .then((rows) => rows[0]);

      if (!page) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // 同じ親の兄弟を position 順で取得
      const siblings = await ctx.db
        .select({ id: pages.id, position: pages.position })
        .from(pages)
        .where(
          and(
            eq(pages.workspaceId, page.workspaceId),
            input.parentId
              ? eq(pages.parentId, input.parentId)
              : sql`${pages.parentId} IS NULL`,
            eq(pages.isDeleted, false),
          ),
        )
        .orderBy(asc(pages.position));

      // afterPageId の position と、その次の position を取得
      let before: string | null = null;
      let after: string | null = null;

      if (input.afterPageId === null) {
        // 先頭に移動
        after = siblings.length > 0 ? siblings[0].position : null;
      } else {
        const idx = siblings.findIndex((s) => s.id === input.afterPageId);
        if (idx !== -1) {
          before = siblings[idx].position;
          after = idx + 1 < siblings.length ? siblings[idx + 1].position : null;
        }
      }

      const newPosition = generateKeyBetween(before, after);

      const [updated] = await ctx.db
        .update(pages)
        .set({
          position: newPosition,
          parentId: input.parentId,
          updatedAt: new Date(),
        })
        .where(eq(pages.id, input.pageId))
        .returning();

      return updated;
    }),

  search: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        query: z.string().min(1).max(200),
      }),
    )
    .query(async ({ ctx, input }) => {
      const results = await ctx.db
        .select({
          id: pages.id,
          title: pages.title,
          icon: pages.icon,
          parentId: pages.parentId,
          type: pages.type,
          updatedAt: pages.updatedAt,
        })
        .from(pages)
        .where(
          and(
            eq(pages.workspaceId, input.workspaceId),
            eq(pages.isDeleted, false),
            ilike(pages.title, `%${input.query}%`),
          ),
        )
        .orderBy(pages.updatedAt)
        .limit(20);

      return results;
    }),

  /** List deleted pages (trash) */
  trash: workspaceProcedure.query(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select({
        id: pages.id,
        title: pages.title,
        icon: pages.icon,
        type: pages.type,
        deletedAt: pages.deletedAt,
        lastEditedBy: pages.lastEditedBy,
        editorName: users.name,
      })
      .from(pages)
      .leftJoin(users, eq(pages.lastEditedBy, users.id))
      .where(
        and(
          eq(pages.workspaceId, input.workspaceId),
          eq(pages.isDeleted, true),
        ),
      )
      .orderBy(desc(pages.deletedAt))
      .limit(100);

    return rows;
  }),

  /** Permanently delete a page (irreversible) */
  permanentDelete: protectedProcedure
    .input(z.object({ pageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await requirePageRole(
        ctx.db as Database,
        input.pageId,
        ctx.user.id,
        "admin",
      );

      // Blocks are cascade-deleted by FK
      await ctx.db.delete(pages).where(eq(pages.id, input.pageId));

      return { success: true };
    }),
});
