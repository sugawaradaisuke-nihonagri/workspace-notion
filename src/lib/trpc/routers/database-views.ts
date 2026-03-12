import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generateKeyBetween } from "fractional-indexing";
import { router, protectedProcedure } from "../init";
import { databaseViews } from "@/lib/db/schema";
import { requireDatabaseRole } from "../verify-access";
import type { Database } from "@/lib/db";

const viewLayoutSchema = z.enum([
  "table",
  "board",
  "calendar",
  "gallery",
  "list",
  "timeline",
  "chart",
]);

export const databaseViewsRouter = router({
  list: protectedProcedure
    .input(z.object({ databaseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await requireDatabaseRole(
        ctx.db as Database,
        input.databaseId,
        ctx.user.id,
        "viewer",
      );

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
      await requireDatabaseRole(
        ctx.db as Database,
        input.databaseId,
        ctx.user.id,
        "editor",
      );

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

      await requireDatabaseRole(
        ctx.db as Database,
        view.databaseId,
        ctx.user.id,
        "editor",
      );

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

      await requireDatabaseRole(
        ctx.db as Database,
        view.databaseId,
        ctx.user.id,
        "editor",
      );

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
