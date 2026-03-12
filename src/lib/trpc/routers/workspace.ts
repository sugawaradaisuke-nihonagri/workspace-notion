import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { workspaces, workspaceMembers, users } from "@/lib/db/schema";

export const workspaceRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        icon: z.string().optional().default("📦"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [workspace] = await ctx.db
        .insert(workspaces)
        .values({
          name: input.name,
          icon: input.icon,
        })
        .returning();

      // 作成者を owner として追加
      await ctx.db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: ctx.user.id,
        role: "owner",
      });

      return workspace;
    }),

  get: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // 所属チェック
      const member = await ctx.db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, input.workspaceId))
        .then((rows) => rows.find((r) => r.userId === ctx.user.id));

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }

      const workspace = await ctx.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, input.workspaceId))
        .then((rows) => rows[0]);

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return { ...workspace, role: member.role };
    }),

  update: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        icon: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // owner/admin チェック
      const member = await ctx.db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, input.workspaceId))
        .then((rows) => rows.find((r) => r.userId === ctx.user.id));

      if (!member || !["owner", "admin"].includes(member.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can update workspace settings",
        });
      }

      const [updated] = await ctx.db
        .update(workspaces)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.icon !== undefined && { icon: input.icon }),
        })
        .where(eq(workspaces.id, input.workspaceId))
        .returning();

      return updated;
    }),

  /** List workspace members — used for @mentions */
  members: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // 所属チェック
      const self = await ctx.db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, input.workspaceId))
        .then((rows) => rows.find((r) => r.userId === ctx.user.id));

      if (!self) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }

      const rows = await ctx.db
        .select({
          userId: workspaceMembers.userId,
          role: workspaceMembers.role,
          name: users.name,
          image: users.image,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(workspaceMembers.userId, users.id))
        .where(eq(workspaceMembers.workspaceId, input.workspaceId));

      return rows;
    }),
});
