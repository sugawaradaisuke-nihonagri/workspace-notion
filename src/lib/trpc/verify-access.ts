import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { pages, workspaceMembers, pageShares } from "@/lib/db/schema";
import { hasRole, can, type Role } from "@/lib/permissions";
import type { Database } from "@/lib/db";

interface AccessResult {
  workspaceId: string;
  role: Role;
}

/**
 * Resolve the effective role for a user on a page.
 * Priority: page_shares > workspace_members (takes the higher of the two).
 */
function resolveEffectiveRole(
  workspaceRole: Role | null,
  pageRole: Role | null,
): Role | null {
  if (!workspaceRole && !pageRole) return null;
  if (!workspaceRole) return pageRole;
  if (!pageRole) return workspaceRole;
  // Return the higher of the two roles
  return hasRole(pageRole, workspaceRole) ? pageRole : workspaceRole;
}

/**
 * Verify that a user has access to a page's workspace and return their role.
 * Checks both workspace membership and page-level shares, using the higher role.
 * Throws TRPCError if page not found or user has no access.
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

  // Check workspace membership
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

  // Check page-level share
  const share = await db
    .select({ role: pageShares.role })
    .from(pageShares)
    .where(and(eq(pageShares.pageId, pageId), eq(pageShares.userId, userId)))
    .then((rows: { role: string }[]) => rows[0]);

  const effectiveRole = resolveEffectiveRole(
    member ? (member.role as Role) : null,
    share ? (share.role as Role) : null,
  );

  if (!effectiveRole) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return { workspaceId: page.workspaceId, role: effectiveRole };
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
