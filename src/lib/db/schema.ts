import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  pgEnum,
  primaryKey,
  customType,
} from "drizzle-orm/pg-core";

/** Custom type for PostgreSQL bytea columns (binary data) */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});
import type { AdapterAccountType } from "next-auth/adapters";

// === Enums ===
export const roleEnum = pgEnum("role", [
  "owner",
  "admin",
  "editor",
  "commenter",
  "viewer",
]);

export const pageTypeEnum = pgEnum("page_type", [
  "page",
  "database",
  "database_row",
]);

export const blockTypeEnum = pgEnum("block_type", [
  "paragraph",
  "heading1",
  "heading2",
  "heading3",
  "todo",
  "bullet",
  "numbered",
  "toggle",
  "quote",
  "callout",
  "divider",
  "code",
  "image",
  "video",
  "audio",
  "file",
  "bookmark",
  "embed",
  "table_simple",
  "synced_block",
  "column_layout",
  "child_page",
  "child_database",
]);

export const propertyTypeEnum = pgEnum("property_type", [
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

export const viewLayoutEnum = pgEnum("view_layout", [
  "table",
  "board",
  "calendar",
  "gallery",
  "list",
  "timeline",
  "chart",
]);

// === Tables ===
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  icon: text("icon").default("📦"),
  plan: text("plan").default("free"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === Auth.js Tables ===
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires").notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  role: roleEnum("role").default("editor").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  parentId: uuid("parent_id"),
  title: text("title").default("Untitled").notNull(),
  icon: text("icon").default("📄"),
  coverUrl: text("cover_url"),
  type: pageTypeEnum("type").default("page").notNull(),
  databaseId: uuid("database_id"),
  position: text("position").default("a0").notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  lastEditedBy: uuid("last_edited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const blocks = pgTable("blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageId: uuid("page_id")
    .references(() => pages.id, { onDelete: "cascade" })
    .notNull(),
  parentId: uuid("parent_id"),
  type: blockTypeEnum("type").default("paragraph").notNull(),
  content: jsonb("content").default({}).notNull(),
  props: jsonb("props").default({}).notNull(),
  position: text("position").default("a0").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const databaseProperties = pgTable("database_properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  databaseId: uuid("database_id")
    .references(() => pages.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  type: propertyTypeEnum("type").notNull(),
  config: jsonb("config").default({}).notNull(),
  position: text("position").default("a0").notNull(),
  isVisible: boolean("is_visible").default(true).notNull(),
  width: integer("width").default(200),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const databaseCellValues = pgTable("database_cell_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageId: uuid("page_id")
    .references(() => pages.id, { onDelete: "cascade" })
    .notNull(),
  propertyId: uuid("property_id")
    .references(() => databaseProperties.id, { onDelete: "cascade" })
    .notNull(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const databaseViews = pgTable("database_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  databaseId: uuid("database_id")
    .references(() => pages.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  layout: viewLayoutEnum("layout").default("table").notNull(),
  filter: jsonb("filter").default({}),
  sort: jsonb("sort").default([]),
  groupBy: jsonb("group_by").default({}),
  visibleProperties: jsonb("visible_properties").default([]),
  position: text("position").default("a0").notNull(),
  isLocked: boolean("is_locked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageId: uuid("page_id")
    .references(() => pages.id, { onDelete: "cascade" })
    .notNull(),
  parentId: uuid("parent_id"),
  authorId: uuid("author_id")
    .references(() => users.id)
    .notNull(),
  content: text("content").notNull(),
  inlineRef: jsonb("inline_ref"),
  isResolved: boolean("is_resolved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Page-level sharing — overrides workspace role for specific pages */
export const pageShares = pgTable("page_shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageId: uuid("page_id")
    .references(() => pages.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  role: roleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Stores Yjs CRDT binary state per page for persistence across server restarts */
export const yjsDocuments = pgTable("yjs_documents", {
  pageId: uuid("page_id")
    .references(() => pages.id, { onDelete: "cascade" })
    .primaryKey(),
  state: bytea("state").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pageVersions = pgTable("page_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageId: uuid("page_id")
    .references(() => pages.id, { onDelete: "cascade" })
    .notNull(),
  blocksSnapshot: jsonb("blocks_snapshot").notNull(),
  editedBy: uuid("edited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
