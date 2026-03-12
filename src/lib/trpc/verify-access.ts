import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { pages, workspaceMembers } from "@/lib/db/schema";
import { can, type Role } from "@/lib/permissions";
import type { Database } from "@/lib/db";

interface AccessResult {
  workspaceId: string;
  role: Role;
}

/**
 * Verify that a user has access to a page's workspace and return their role.
 * Throws TRPCError if page not found or user is not a member.
 */
export async function verifyPageAccess(
  db: Database,
  pageId: string,
  userId: string,
): Promise<AccessResult> {
  const page = await db
    .select({ workspaceId: pages.workspaceId })
    .from(pages)
    .where(eq(pages.id, pageId))
    .then((rows: { workspaceId: string }[]) => rows[0]);

  if (!page) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
  }

  const member = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, page.workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .then((rows: { role: string }[]) => rows[0]);

  if (!member) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return { workspaceId: page.workspaceId, role: member.role as Role };
}

/**
 * Verify page access with a minimum role requirement.
 * Throws FORBIDDEN if the user doesn't have sufficient permissions.
 */
export async function requirePageRole(
  db: Database,
  pageId: string,
  userId: string,
  minRole: Role,
): Promise<AccessResult> {
  const access = await verifyPageAccess(db, pageId, userId);

  if (!can.view(access.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No access" });
  }

  // Check specific capability based on minRole
  const roleCheck: Record<Role, (role: string) => boolean> = {
    viewer: can.view,
    commenter: can.comment,
    editor: can.edit,
    admin: can.admin,
    owner: can.owner,
  };

  if (!roleCheck[minRole](access.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Requires ${minRole} role or higher`,
    });
  }

  return access;
}

/**
 * Verify that a user has access to a database page's workspace with a minimum role.
 * Also validates that the page is of type "database".
 * Throws TRPCError if not found, not a database, or insufficient permissions.
 */
export async function requireDatabaseRole(
  db: Database,
  databaseId: string,
  userId: string,
  minRole: Role,
): Promise<AccessResult & { type: string }> {
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
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, page.workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .then((rows: { role: string }[]) => rows[0]);

  if (!member) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  const access = { workspaceId: page.workspaceId, role: member.role as Role };

  const roleCheck: Record<Role, (role: string) => boolean> = {
    viewer: can.view,
    commenter: can.comment,
    editor: can.edit,
    admin: can.admin,
    owner: can.owner,
  };

  if (!roleCheck[minRole](access.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Requires ${minRole} role or higher`,
    });
  }

  return { ...access, type: page.type };
}
