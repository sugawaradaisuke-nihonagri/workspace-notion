import { z } from "zod";
import { eq, and, asc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generateKeyBetween } from "fractional-indexing";
import { router, protectedProcedure } from "../init";
import {
  pages,
  databaseProperties,
  databaseCellValues,
  workspaceMembers,
} from "@/lib/db/schema";

/** databaseId のページが存在し、ユーザーがアクセスできることを確認 */
async function verifyDatabaseAccess(
  db: ReturnType<typeof import("@/lib/db").getDb>,
  databaseId: string,
  userId: string,
) {
  const page = await db
    .select({ workspaceId: pages.workspaceId, type: pages.type })
    .from(pages)
    .where(eq(pages.id, databaseId))
    .then((rows: { workspaceId: string; type: string }[]) => rows[0]);

  if (!page) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Database not found" });
  }

  const member = await db
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

export const databaseRowsRouter = router({
  /** データベース行の一覧取得 (フィルタ/ソートはクライアント側で適用) */
  list: protectedProcedure
    .input(
      z.object({
        databaseId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const dbPage = await verifyDatabaseAccess(
        ctx.db,
        input.databaseId,
        ctx.user.id,
      );

      // database_row ページを取得
      const rows = await ctx.db
        .select()
        .from(pages)
        .where(
          and(
            eq(pages.databaseId, input.databaseId),
            eq(pages.type, "database_row"),
            eq(pages.isDeleted, false),
          ),
        )
        .orderBy(asc(pages.position));

      if (rows.length === 0) {
        return { rows: [], cells: [], properties: [] };
      }

      // プロパティ一覧
      const properties = await ctx.db
        .select()
        .from(databaseProperties)
        .where(eq(databaseProperties.databaseId, input.databaseId))
        .orderBy(asc(databaseProperties.position));

      // 全セル値を取得
      const rowIds = rows.map((r) => r.id);
      const cells = await ctx.db
        .select()
        .from(databaseCellValues)
        .where(inArray(databaseCellValues.pageId, rowIds));

      return { rows, cells, properties };
    }),

  /** 新しい行 (database_row ページ) を作成 */
  create: protectedProcedure
    .input(
      z.object({
        databaseId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const dbPage = await verifyDatabaseAccess(
        ctx.db,
        input.databaseId,
        ctx.user.id,
      );

      // 既存の行の最後の position を取得
      const siblings = await ctx.db
        .select({ position: pages.position })
        .from(pages)
        .where(
          and(
            eq(pages.databaseId, input.databaseId),
            eq(pages.type, "database_row"),
            eq(pages.isDeleted, false),
          ),
        )
        .orderBy(asc(pages.position));

      const lastPosition =
        siblings.length > 0 ? siblings[siblings.length - 1].position : null;
      const newPosition = generateKeyBetween(lastPosition, null);

      // databaseId の workspaceId を取得
      const database = await ctx.db
        .select({ workspaceId: pages.workspaceId })
        .from(pages)
        .where(eq(pages.id, input.databaseId))
        .then((rows: { workspaceId: string }[]) => rows[0]);

      const [row] = await ctx.db
        .insert(pages)
        .values({
          workspaceId: database!.workspaceId,
          parentId: input.databaseId,
          databaseId: input.databaseId,
          title: "Untitled",
          icon: null,
          type: "database_row",
          position: newPosition,
          createdBy: ctx.user.id,
          lastEditedBy: ctx.user.id,
        })
        .returning();

      return row;
    }),

  /** セル値を更新 (upsert) */
  updateCell: protectedProcedure
    .input(
      z.object({
        pageId: z.string().uuid(),
        propertyId: z.string().uuid(),
        value: z.unknown(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 行ページが存在し、database_row であることを確認
      const row = await ctx.db
        .select({
          databaseId: pages.databaseId,
          workspaceId: pages.workspaceId,
          type: pages.type,
        })
        .from(pages)
        .where(eq(pages.id, input.pageId))
        .then(
          (
            rows: {
              databaseId: string | null;
              workspaceId: string;
              type: string;
            }[],
          ) => rows[0],
        );

      if (!row || row.type !== "database_row" || !row.databaseId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Page is not a database row",
        });
      }

      // ワークスペースメンバーシップチェック
      const member = await ctx.db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, row.workspaceId),
            eq(workspaceMembers.userId, ctx.user.id),
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

      // 既存のセル値を確認 (upsert)
      const existing = await ctx.db
        .select({ id: databaseCellValues.id })
        .from(databaseCellValues)
        .where(
          and(
            eq(databaseCellValues.pageId, input.pageId),
            eq(databaseCellValues.propertyId, input.propertyId),
          ),
        )
        .then((rows: { id: string }[]) => rows[0]);

      if (existing) {
        const [updated] = await ctx.db
          .update(databaseCellValues)
          .set({
            value: input.value as Record<string, unknown>,
            updatedAt: new Date(),
          })
          .where(eq(databaseCellValues.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(databaseCellValues)
        .values({
          pageId: input.pageId,
          propertyId: input.propertyId,
          value: input.value as Record<string, unknown>,
        })
        .returning();

      // 行ページの updatedAt を更新
      await ctx.db
        .update(pages)
        .set({ updatedAt: new Date(), lastEditedBy: ctx.user.id })
        .where(eq(pages.id, input.pageId));

      return created;
    }),

  /** 行 (database_row ページ) を削除 (soft delete) */
  delete: protectedProcedure
    .input(z.object({ pageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db
        .select({
          databaseId: pages.databaseId,
          workspaceId: pages.workspaceId,
          type: pages.type,
        })
        .from(pages)
        .where(eq(pages.id, input.pageId))
        .then(
          (
            rows: {
              databaseId: string | null;
              workspaceId: string;
              type: string;
            }[],
          ) => rows[0],
        );

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const member = await ctx.db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, row.workspaceId),
            eq(workspaceMembers.userId, ctx.user.id),
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
});
