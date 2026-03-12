import { z } from "zod";
import { eq, and, asc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generateKeyBetween } from "fractional-indexing";
import { router, protectedProcedure } from "../init";
import { blocks, pages, workspaceMembers } from "@/lib/db/schema";

const blockTypeSchema = z.enum([
  "paragraph",
  "heading1",
  "heading2",
  "heading3",
  "todo",
  "bullet",
  "numbered",
  "toggle",
  "quote",
  "callout",
  "divider",
  "code",
  "image",
  "video",
  "audio",
  "file",
  "bookmark",
  "embed",
  "table_simple",
  "synced_block",
  "column_layout",
  "child_page",
  "child_database",
]);

/** ページの所属ワークスペースメンバーシップを確認するヘルパー */
async function verifyPageAccess(
  db: Parameters<typeof protectedProcedure.query>[0] extends (
    opts: infer O,
  ) => unknown
    ? O extends { ctx: { db: infer D } }
      ? D
      : never
    : never,
  pageId: string,
  userId: string,
) {
  const page = await (db as ReturnType<typeof import("@/lib/db").getDb>)
    .select({ workspaceId: pages.workspaceId })
    .from(pages)
    .where(eq(pages.id, pageId))
    .then((rows: { workspaceId: string }[]) => rows[0]);

  if (!page) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
  }

  const member = await (db as ReturnType<typeof import("@/lib/db").getDb>)
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, page.workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .then(
      (
        rows: {
          id: string;
          workspaceId: string;
          userId: string;
          role: string;
        }[],
      ) => rows[0],
    );

  if (!member) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return page;
}

export const blocksRouter = router({
  list: protectedProcedure
    .input(z.object({ pageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyPageAccess(ctx.db, input.pageId, ctx.user.id);

      return ctx.db
        .select()
        .from(blocks)
        .where(eq(blocks.pageId, input.pageId))
        .orderBy(asc(blocks.position));
    }),

  create: protectedProcedure
    .input(
      z.object({
        pageId: z.string().uuid(),
        type: blockTypeSchema.optional().default("paragraph"),
        content: z.record(z.string(), z.unknown()).optional().default({}),
        props: z.record(z.string(), z.unknown()).optional().default({}),
        parentId: z.string().uuid().nullable().optional(),
        afterBlockId: z.string().uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyPageAccess(ctx.db, input.pageId, ctx.user.id);

      // 兄弟ブロックを position 順で取得
      const siblings = await ctx.db
        .select({ id: blocks.id, position: blocks.position })
        .from(blocks)
        .where(eq(blocks.pageId, input.pageId))
        .orderBy(asc(blocks.position));

      let before: string | null = null;
      let after: string | null = null;

      if (!input.afterBlockId) {
        // 末尾に追加
        before =
          siblings.length > 0 ? siblings[siblings.length - 1].position : null;
      } else {
        const idx = siblings.findIndex((s) => s.id === input.afterBlockId);
        if (idx !== -1) {
          before = siblings[idx].position;
          after = idx + 1 < siblings.length ? siblings[idx + 1].position : null;
        }
      }

      const newPosition = generateKeyBetween(before, after);

      const [block] = await ctx.db
        .insert(blocks)
        .values({
          pageId: input.pageId,
          parentId: input.parentId ?? null,
          type: input.type,
          content: input.content,
          props: input.props,
          position: newPosition,
          createdBy: ctx.user.id,
        })
        .returning();

      // ページの updatedAt を更新
      await ctx.db
        .update(pages)
        .set({ updatedAt: new Date(), lastEditedBy: ctx.user.id })
        .where(eq(pages.id, input.pageId));

      return block;
    }),

  update: protectedProcedure
    .input(
      z.object({
        blockId: z.string().uuid(),
        content: z.record(z.string(), z.unknown()).optional(),
        props: z.record(z.string(), z.unknown()).optional(),
        type: blockTypeSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const block = await ctx.db
        .select()
        .from(blocks)
        .where(eq(blocks.id, input.blockId))
        .then((rows) => rows[0]);

      if (!block) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await verifyPageAccess(ctx.db, block.pageId, ctx.user.id);

      const setData: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (input.content !== undefined) setData.content = input.content;
      if (input.props !== undefined) setData.props = input.props;
      if (input.type !== undefined) setData.type = input.type;

      const [updated] = await ctx.db
        .update(blocks)
        .set(setData)
        .where(eq(blocks.id, input.blockId))
        .returning();

      // ページの updatedAt を更新
      await ctx.db
        .update(pages)
        .set({ updatedAt: new Date(), lastEditedBy: ctx.user.id })
        .where(eq(pages.id, block.pageId));

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ blockId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const block = await ctx.db
        .select()
        .from(blocks)
        .where(eq(blocks.id, input.blockId))
        .then((rows) => rows[0]);

      if (!block) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await verifyPageAccess(ctx.db, block.pageId, ctx.user.id);

      await ctx.db.delete(blocks).where(eq(blocks.id, input.blockId));

      await ctx.db
        .update(pages)
        .set({ updatedAt: new Date(), lastEditedBy: ctx.user.id })
        .where(eq(pages.id, block.pageId));

      return { success: true };
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        blockId: z.string().uuid(),
        afterBlockId: z.string().uuid().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const block = await ctx.db
        .select()
        .from(blocks)
        .where(eq(blocks.id, input.blockId))
        .then((rows) => rows[0]);

      if (!block) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await verifyPageAccess(ctx.db, block.pageId, ctx.user.id);

      const siblings = await ctx.db
        .select({ id: blocks.id, position: blocks.position })
        .from(blocks)
        .where(eq(blocks.pageId, block.pageId))
        .orderBy(asc(blocks.position));

      let before: string | null = null;
      let after: string | null = null;

      if (input.afterBlockId === null) {
        // 先頭に移動
        after = siblings.length > 0 ? siblings[0].position : null;
      } else {
        const idx = siblings.findIndex((s) => s.id === input.afterBlockId);
        if (idx !== -1) {
          before = siblings[idx].position;
          after = idx + 1 < siblings.length ? siblings[idx + 1].position : null;
        }
      }

      const newPosition = generateKeyBetween(before, after);

      const [updated] = await ctx.db
        .update(blocks)
        .set({ position: newPosition, updatedAt: new Date() })
        .where(eq(blocks.id, input.blockId))
        .returning();

      return updated;
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ blockIds: z.array(z.string().uuid()).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      // 最初のブロックのページからアクセス権を確認
      const firstBlock = await ctx.db
        .select()
        .from(blocks)
        .where(eq(blocks.id, input.blockIds[0]))
        .then((rows) => rows[0]);

      if (!firstBlock) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await verifyPageAccess(ctx.db, firstBlock.pageId, ctx.user.id);

      await ctx.db.delete(blocks).where(inArray(blocks.id, input.blockIds));

      await ctx.db
        .update(pages)
        .set({ updatedAt: new Date(), lastEditedBy: ctx.user.id })
        .where(eq(pages.id, firstBlock.pageId));

      return { deleted: input.blockIds.length };
    }),
});
