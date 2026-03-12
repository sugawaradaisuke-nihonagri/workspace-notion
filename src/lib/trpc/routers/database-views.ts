import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generateKeyBetween } from "fractional-indexing";
import { router, protectedProcedure } from "../init";
import { databaseViews, pages, workspaceMembers } from "@/lib/db/schema";

const viewLayoutSchema = z.enum([
  "table",
  "board",
  "calendar",
  "gallery",
  "list",
  "timeline",
  "chart",
]);

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

export const databaseViewsRouter = router({
  list: protectedProcedure
    .input(z.object({ databaseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyDatabaseAccess(ctx.db, input.databaseId, ctx.user.id);

      return ctx.db
        .select()
        .from(databaseViews)
        .where(eq(databaseViews.databaseId, input.databaseId))
        .orderBy(asc(databaseViews.position));
    }),

  create: protectedProcedure
    .input(
      z.object({
        databaseId: z.string().uuid(),
        name: z.string().min(1).max(200),
        layout: viewLayoutSchema.optional().default("table"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyDatabaseAccess(ctx.db, input.databaseId, ctx.user.id);

      const siblings = await ctx.db
        .select({ position: databaseViews.position })
        .from(databaseViews)
        .where(eq(databaseViews.databaseId, input.databaseId))
        .orderBy(asc(databaseViews.position));

      const lastPosition =
        siblings.length > 0 ? siblings[siblings.length - 1].position : null;
      const newPosition = generateKeyBetween(lastPosition, null);

      const [view] = await ctx.db
        .insert(databaseViews)
        .values({
          databaseId: input.databaseId,
          name: input.name,
          layout: input.layout,
          position: newPosition,
        })
        .returning();

      return view;
    }),

  update: protectedProcedure
    .input(
      z.object({
        viewId: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        layout: viewLayoutSchema.optional(),
        filter: z.record(z.string(), z.unknown()).optional(),
        sort: z.array(z.record(z.string(), z.unknown())).optional(),
        groupBy: z.record(z.string(), z.unknown()).optional(),
        visibleProperties: z.array(z.string().uuid()).optional(),
        isLocked: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const view = await ctx.db
        .select()
        .from(databaseViews)
        .where(eq(databaseViews.id, input.viewId))
        .then((rows) => rows[0]);

      if (!view) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await verifyDatabaseAccess(ctx.db, view.databaseId, ctx.user.id);

      const setData: Record<string, unknown> = {};
      if (input.name !== undefined) setData.name = input.name;
      if (input.layout !== undefined) setData.layout = input.layout;
      if (input.filter !== undefined) setData.filter = input.filter;
      if (input.sort !== undefined) setData.sort = input.sort;
      if (input.groupBy !== undefined) setData.groupBy = input.groupBy;
      if (input.visibleProperties !== undefined)
        setData.visibleProperties = input.visibleProperties;
      if (input.isLocked !== undefined) setData.isLocked = input.isLocked;

      if (Object.keys(setData).length === 0) {
        return view;
      }

      const [updated] = await ctx.db
        .update(databaseViews)
        .set(setData)
        .where(eq(databaseViews.id, input.viewId))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ viewId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const view = await ctx.db
        .select()
        .from(databaseViews)
        .where(eq(databaseViews.id, input.viewId))
        .then((rows) => rows[0]);

      if (!view) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await verifyDatabaseAccess(ctx.db, view.databaseId, ctx.user.id);

      // 最後のビューは削除不可
      const viewCount = await ctx.db
        .select({ id: databaseViews.id })
        .from(databaseViews)
        .where(eq(databaseViews.databaseId, view.databaseId))
        .then((rows) => rows.length);

      if (viewCount <= 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete the last view",
        });
      }

      await ctx.db
        .delete(databaseViews)
        .where(eq(databaseViews.id, input.viewId));

      return { success: true };
    }),
});
