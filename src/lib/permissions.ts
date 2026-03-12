/**
 * Permission system — 5-level role-based access control
 *
 * Role hierarchy (highest → lowest):
 *   owner > admin > editor > commenter > viewer
 *
 * Capabilities:
 *   owner     — 全権限 + ワークスペース削除 + メンバー管理
 *   admin     — ページ/DB CRUD + メンバー招待/ロール変更 (owner除く)
 *   editor    — ページ/ブロック/DB CRUD + コメント
 *   commenter — 閲覧 + コメント (編集不可)
 *   viewer    — 閲覧のみ
 */

export type Role = "owner" | "admin" | "editor" | "commenter" | "viewer";

const ROLE_LEVEL: Record<Role, number> = {
  owner: 5,
  admin: 4,
  editor: 3,
  commenter: 2,
  viewer: 1,
};

/** Check if the user's role meets the minimum required level */
export function hasRole(userRole: string, minRole: Role): boolean {
  const level = ROLE_LEVEL[userRole as Role];
  const required = ROLE_LEVEL[minRole];
  if (level === undefined || required === undefined) return false;
  return level >= required;
}

/** Permission checks for specific actions */
export const can = {
  /** View pages and content */
  view: (role: string) => hasRole(role, "viewer"),

  /** Add comments */
  comment: (role: string) => hasRole(role, "commenter"),

  /** Edit pages, blocks, database cells */
  edit: (role: string) => hasRole(role, "editor"),

  /** Create/delete pages, manage DB properties/views */
  manage: (role: string) => hasRole(role, "editor"),

  /** Invite members, change roles (except owner) */
  admin: (role: string) => hasRole(role, "admin"),

  /** Delete workspace, transfer ownership */
  owner: (role: string) => hasRole(role, "owner"),
} as const;
