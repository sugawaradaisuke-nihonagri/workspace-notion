import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { router, protectedProcedure } from "../init";
import { notifications, users } from "@/lib/db/schema";

export const notificationsRouter = router({
  /** List notifications for current user */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).optional().default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: notifications.id,
          type: notifications.type,
          title: notifications.title,
          message: notifications.message,
          pageId: notifications.pageId,
          actorId: notifications.actorId,
          isRead: notifications.isRead,
          createdAt: notifications.createdAt,
          actorName: users.name,
          actorImage: users.image,
        })
        .from(notifications)
        .leftJoin(users, eq(notifications.actorId, users.id))
        .where(eq(notifications.userId, ctx.user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit);

      return rows;
    }),

  /** Count unread */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false),
        ),
      );
    return { count: rows.length };
  }),

  /** Mark single as read */
  markRead: protectedProcedure
    .input(z.object({ notificationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.id, input.notificationId),
            eq(notifications.userId, ctx.user.id),
          ),
        );
      return { success: true };
    }),

  /** Mark all as read */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false),
        ),
      );
    return { success: true };
  }),

  /** Create notification (internal, called from other routers) */
  _create: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        type: z.enum(["mention", "comment", "reply", "share", "page_update"]),
        title: z.string(),
        message: z.string().optional(),
        pageId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [notif] = await ctx.db
        .insert(notifications)
        .values({
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          pageId: input.pageId,
          actorId: ctx.user.id,
        })
        .returning();
      return notif;
    }),
});
