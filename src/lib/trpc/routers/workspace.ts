import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { workspaces, workspaceMembers, users } from "@/lib/db/schema";
import { hasRole } from "@/lib/permissions";

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
          userName: users.name,
          userImage: users.image,
          userEmail: users.email,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(workspaceMembers.userId, users.id))
        .where(eq(workspaceMembers.workspaceId, input.workspaceId));

      return rows;
    }),

  /** Invite a user by email */
  invite: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        email: z.string().email(),
        role: z.enum(["admin", "editor", "commenter", "viewer"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check admin permission
      const self = await ctx.db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, input.workspaceId))
        .then((rows) => rows.find((r) => r.userId === ctx.user.id));

      if (!self || !hasRole(self.role, "admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Requires admin role or higher",
        });
      }

      // Find user by email
      const targetUser = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .then((rows) => rows[0]);

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found with this email",
        });
      }

      // Check not already a member
      const existing = await ctx.db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, input.workspaceId),
            eq(workspaceMembers.userId, targetUser.id),
          ),
        )
        .then((rows) => rows[0]);

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is already a member",
        });
      }

      const [member] = await ctx.db
        .insert(workspaceMembers)
        .values({
          workspaceId: input.workspaceId,
          userId: targetUser.id,
          role: input.role,
        })
        .returning();

      return member;
    }),

  /** Update member role */
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum(["admin", "editor", "commenter", "viewer"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const self = await ctx.db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, input.workspaceId))
        .then((rows) => rows.find((r) => r.userId === ctx.user.id));

      if (!self || !hasRole(self.role, "admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Requires admin role or higher",
        });
      }

      // Cannot change owner's role
      const target = await ctx.db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, input.workspaceId),
            eq(workspaceMembers.userId, input.userId),
          ),
        )
        .then((rows) => rows[0]);

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (target.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot change owner's role",
        });
      }

      const [updated] = await ctx.db
        .update(workspaceMembers)
        .set({ role: input.role })
        .where(
          and(
            eq(workspaceMembers.workspaceId, input.workspaceId),
            eq(workspaceMembers.userId, input.userId),
          ),
        )
        .returning();

      return updated;
    }),

  /** Remove a member */
  removeMember: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        userId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const self = await ctx.db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, input.workspaceId))
        .then((rows) => rows.find((r) => r.userId === ctx.user.id));

      if (!self || !hasRole(self.role, "admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Requires admin role or higher",
        });
      }

      // Cannot remove self or owner
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove yourself",
        });
      }

      const target = await ctx.db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, input.workspaceId),
            eq(workspaceMembers.userId, input.userId),
          ),
        )
        .then((rows) => rows[0]);

      if (target?.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove the owner",
        });
      }

      await ctx.db
        .delete(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, input.workspaceId),
            eq(workspaceMembers.userId, input.userId),
          ),
        );

      return { success: true };
    }),
});
