import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, protectedProcedure } from "../init";
import { favorites, pages } from "@/lib/db/schema";

export const favoritesRouter = router({
  /** List current user's favorited pages */
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: favorites.id,
          pageId: favorites.pageId,
          createdAt: favorites.createdAt,
          title: pages.title,
          icon: pages.icon,
          type: pages.type,
        })
        .from(favorites)
        .innerJoin(pages, eq(favorites.pageId, pages.id))
        .where(
          and(
            eq(favorites.userId, ctx.user.id),
            eq(pages.workspaceId, input.workspaceId),
            eq(pages.isDeleted, false),
          ),
        );

      return rows;
    }),

  /** Toggle favorite (add if not exists, remove if exists) */
  toggle: protectedProcedure
    .input(z.object({ pageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(favorites)
        .where(
          and(
            eq(favorites.userId, ctx.user.id),
            eq(favorites.pageId, input.pageId),
          ),
        )
        .then((rows) => rows[0]);

      if (existing) {
        await ctx.db.delete(favorites).where(eq(favorites.id, existing.id));
        return { favorited: false };
      }

      await ctx.db.insert(favorites).values({
        userId: ctx.user.id,
        pageId: input.pageId,
      });
      return { favorited: true };
    }),

  /** Check if a page is favorited */
  isFavorited: protectedProcedure
    .input(z.object({ pageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db
        .select({ id: favorites.id })
        .from(favorites)
        .where(
          and(
            eq(favorites.userId, ctx.user.id),
            eq(favorites.pageId, input.pageId),
          ),
        )
        .then((rows) => rows[0]);

      return { favorited: !!row };
    }),
});
