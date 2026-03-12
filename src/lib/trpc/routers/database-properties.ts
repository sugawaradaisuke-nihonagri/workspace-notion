import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generateKeyBetween } from "fractional-indexing";
import { router, protectedProcedure } from "../init";
import { databaseProperties, pages, workspaceMembers } from "@/lib/db/schema";

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
  if (page.type !== "database") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Page is not a database",
    });
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

export const databasePropertiesRouter = router({
  list: protectedProcedure
    .input(z.object({ databaseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyDatabaseAccess(ctx.db, input.databaseId, ctx.user.id);

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
      await verifyDatabaseAccess(ctx.db, input.databaseId, ctx.user.id);

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

      await verifyDatabaseAccess(ctx.db, property.databaseId, ctx.user.id);

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

      await verifyDatabaseAccess(ctx.db, property.databaseId, ctx.user.id);

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

      await verifyDatabaseAccess(ctx.db, property.databaseId, ctx.user.id);

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
