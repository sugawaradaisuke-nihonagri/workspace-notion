import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { workspaceMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import superjson from "superjson";

export async function createContext() {
  const session = await auth();
  return { session, db: getDb() };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.session.user,
      db: ctx.db,
    },
  });
});

/** workspaceId を必須にし、所属チェックを行う procedure */
export const workspaceProcedure = protectedProcedure
  .input(z.object({ workspaceId: z.string().uuid() }))
  .use(async ({ ctx, input, next }) => {
    const member = await ctx.db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, input.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id),
        ),
      )
      .then((rows) => rows[0]);

    if (!member) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a member of this workspace",
      });
    }

    return next({
      ctx: {
        ...ctx,
        member,
      },
    });
  });
