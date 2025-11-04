import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Single-row document store for the portfolio content.
 * `draft` is edited in the admin; `published` is what the public site renders.
 */
export const siteContent = mysqlTable("site_content", {
  id: int("id").primaryKey(),
  draft: json("draft").notNull(),
  published: json("published").notNull(),
  draftUpdatedAt: timestamp("draftUpdatedAt").defaultNow().notNull(),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  publishedBy: varchar("publishedBy", { length: 200 }),
});

/** Every publication/import/restore creates a snapshot — the backup & recovery history. */
export const contentRevisions = mysqlTable("content_revisions", {
  id: int("id").autoincrement().primaryKey(),
  kind: mysqlEnum("kind", ["publish", "import", "restore", "seed", "backup"]).notNull(),
  note: varchar("note", { length: 300 }),
  data: json("data").notNull(),
  createdBy: varchar("createdBy", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Uploaded files (images, videos, PDFs). Files live in object storage; only metadata is stored here. */
export const media = mysqlTable("media", {
  id: int("id").autoincrement().primaryKey(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  kind: mysqlEnum("kind", ["image", "video", "document"]).notNull(),
  mime: varchar("mime", { length: 120 }).notNull(),
  size: int("size").notNull(),
  originalName: varchar("originalName", { length: 255 }),
  title: varchar("title", { length: 255 }),
  altPt: varchar("altPt", { length: 500 }),
  altEn: varchar("altEn", { length: 500 }),
  captionPt: text("captionPt"),
  captionEn: text("captionEn"),
  uploadedBy: varchar("uploadedBy", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type Media = typeof media.$inferSelect;

/** Contact form submissions. */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  subject: varchar("subject", { length: 200 }),
  message: text("message").notNull(),
  lang: varchar("lang", { length: 4 }).default("pt").notNull(),
  ipHash: varchar("ipHash", { length: 64 }),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Message = typeof messages.$inferSelect;

/** Small key/value store (coffee counter, admin bootstrap code hash…). */
export const appKv = mysqlTable("app_kv", {
  k: varchar("k", { length: 64 }).primaryKey(),
  v: text("v").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
