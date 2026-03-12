import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generateKeyBetween } from "fractional-indexing";
import { router, protectedProcedure } from "../init";
import { databaseProperties } from "@/lib/db/schema";
import { requireDatabaseRole } from "../verify-access";
import type { Database } from "@/lib/db";

const propertyTypeSchema = z.enum([
  "title",
  "text",
  "number",
  "select",
  "multi_select",
  "status",
  "date",
  "person",
  "files",
  "checkbox",
  "url",
  "email",
  "phone",
  "relation",
  "rollup",
  "formula",
  "created_time",
  "created_by",
  "last_edited_time",
  "last_edited_by",
  "unique_id",
  "button",
]);

export const databasePropertiesRouter = router({
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
        .from(databaseProperties)
        .where(eq(databaseProperties.databaseId, input.databaseId))
        .orderBy(asc(databaseProperties.position));
    }),

  create: protectedProcedure
    .input(
      z.object({
        databaseId: z.string().uuid(),
        name: z.string().min(1).max(200),
        type: propertyTypeSchema,
        config: z.record(z.string(), z.unknown()).optional().default({}),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireDatabaseRole(
        ctx.db as Database,
        input.databaseId,
        ctx.user.id,
        "editor",
      );

      // 最後の position を取得
      const siblings = await ctx.db
        .select({ position: databaseProperties.position })
        .from(databaseProperties)
        .where(eq(databaseProperties.databaseId, input.databaseId))
        .orderBy(asc(databaseProperties.position));

      const lastPosition =
        siblings.length > 0 ? siblings[siblings.length - 1].position : null;
      const newPosition = generateKeyBetween(lastPosition, null);

      const [property] = await ctx.db
        .insert(databaseProperties)
        .values({
          databaseId: input.databaseId,
          name: input.name,
          type: input.type,
          config: input.config,
          position: newPosition,
        })
        .returning();

      return property;
    }),

  update: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        config: z.record(z.string(), z.unknown()).optional(),
        width: z.number().int().min(50).max(800).optional(),
        isVisible: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const property = await ctx.db
        .select()
        .from(databaseProperties)
        .where(eq(databaseProperties.id, input.propertyId))
        .then((rows) => rows[0]);

      if (!property) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await requireDatabaseRole(
        ctx.db as Database,
        property.databaseId,
        ctx.user.id,
        "editor",
      );

      const setData: Record<string, unknown> = {};
      if (input.name !== undefined) setData.name = input.name;
      if (input.config !== undefined) setData.config = input.config;
      if (input.width !== undefined) setData.width = input.width;
      if (input.isVisible !== undefined) setData.isVisible = input.isVisible;

      if (Object.keys(setData).length === 0) {
        return property;
      }

      const [updated] = await ctx.db
        .update(databaseProperties)
        .set(setData)
        .where(eq(databaseProperties.id, input.propertyId))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const property = await ctx.db
        .select()
        .from(databaseProperties)
        .where(eq(databaseProperties.id, input.propertyId))
        .then((rows) => rows[0]);

      if (!property) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (property.type === "title") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete the title property",
        });
      }

      await requireDatabaseRole(
        ctx.db as Database,
        property.databaseId,
        ctx.user.id,
        "editor",
      );

      await ctx.db
        .delete(databaseProperties)
        .where(eq(databaseProperties.id, input.propertyId));

      return { success: true };
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        afterPropertyId: z.string().uuid().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const property = await ctx.db
        .select()
        .from(databaseProperties)
        .where(eq(databaseProperties.id, input.propertyId))
        .then((rows) => rows[0]);

      if (!property) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await requireDatabaseRole(
        ctx.db as Database,
        property.databaseId,
        ctx.user.id,
        "editor",
      );

      const siblings = await ctx.db
        .select({
          id: databaseProperties.id,
          position: databaseProperties.position,
        })
        .from(databaseProperties)
        .where(eq(databaseProperties.databaseId, property.databaseId))
        .orderBy(asc(databaseProperties.position));

      let before: string | null = null;
      let after: string | null = null;

      if (input.afterPropertyId === null) {
        after = siblings.length > 0 ? siblings[0].position : null;
      } else {
        const idx = siblings.findIndex((s) => s.id === input.afterPropertyId);
        if (idx !== -1) {
          before = siblings[idx].position;
          after = idx + 1 < siblings.length ? siblings[idx + 1].position : null;
        }
      }

      const newPosition = generateKeyBetween(before, after);

      const [updated] = await ctx.db
        .update(databaseProperties)
        .set({ position: newPosition })
        .where(eq(databaseProperties.id, input.propertyId))
        .returning();

      return updated;
    }),
});
