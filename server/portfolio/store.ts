import crypto from "node:crypto";
import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import {
  appKv,
  contentRevisions,
  media,
  messages,
  siteContent,
  users,
} from "../../drizzle/schema";
import { zContent, type SiteContent } from "../../shared/content";
import { getDb } from "../db";
import { buildDefaultContent, UI_DEFAULTS } from "../defaultContent";
import * as local from "./localContent";

const noDatabase = () => !process.env.DATABASE_URL;

const CONTENT_ROW_ID = 1;
const MAX_REVISIONS = 60;

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database is not available");
  return d;
}

/** Validates stored JSON and fills defaults (forward compatible with new optional fields). */
export function normalizeContent(raw: unknown): SiteContent {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch (error) {
      console.warn("[content] stored JSON could not be parsed, using defaults", error);
      return buildDefaultContent();
    }
  }
  const parsed = zContent.safeParse(value);
  if (parsed.success) {
    // make sure newly added UI strings exist
    parsed.data.settings.ui = { ...UI_DEFAULTS, ...parsed.data.settings.ui };
    return parsed.data;
  }
  console.warn("[content] stored content failed validation, using defaults", parsed.error.issues.slice(0, 3));
  return buildDefaultContent();
}

type ContentRow = typeof siteContent.$inferSelect;

async function ensureRow(): Promise<ContentRow> {
  const d = await db();
  const rows = await d.select().from(siteContent).where(eq(siteContent.id, CONTENT_ROW_ID)).limit(1);
  if (rows[0]) return rows[0];
  const initial = buildDefaultContent();
  await d
    .insert(siteContent)
    .values({ id: CONTENT_ROW_ID, draft: initial, published: initial, publishedBy: "seed" })
    .onDuplicateKeyUpdate({ set: { id: CONTENT_ROW_ID } });
  await d.insert(contentRevisions).values({ kind: "seed", note: "Conteúdo inicial", data: initial, createdBy: "seed" });
  const again = await d.select().from(siteContent).where(eq(siteContent.id, CONTENT_ROW_ID)).limit(1);
  return again[0]!;
}

// ---- short in-memory cache for the public document ----
let publishedCache: { at: number; value: { content: SiteContent; publishedAt: Date } } | null = null;
const CACHE_MS = 4000;

export async function getPublished(): Promise<{ content: SiteContent; publishedAt: Date }> {
  if (publishedCache && Date.now() - publishedCache.at < CACHE_MS) return publishedCache.value;
  // Local preview has no MySQL. The bundled document is the same seed the database would store.
  if (noDatabase()) {
    const value = local.localPublished();
    publishedCache = { at: Date.now(), value };
    return value;
  }
  const row = await ensureRow();
  const value = { content: normalizeContent(row.published), publishedAt: row.publishedAt };
  publishedCache = { at: Date.now(), value };
  return value;
}

export function invalidatePublishedCache() {
  publishedCache = null;
}

export async function getEditorState() {
  if (noDatabase()) return local.localEditorState();
  const row = await ensureRow();
  const draft = normalizeContent(row.draft);
  const published = normalizeContent(row.published);
  return {
    draft,
    draftUpdatedAt: row.draftUpdatedAt,
    publishedAt: row.publishedAt,
    publishedBy: row.publishedBy,
    hasUnpublishedChanges: JSON.stringify(draft) !== JSON.stringify(published),
  };
}

export async function saveDraft(content: SiteContent) {
  if (noDatabase()) {
    local.localSaveDraft(content);
    return;
  }
  await ensureRow();
  const d = await db();
  await d
    .update(siteContent)
    .set({ draft: content, draftUpdatedAt: new Date() })
    .where(eq(siteContent.id, CONTENT_ROW_ID));
}

async function addRevision(kind: "publish" | "import" | "restore" | "seed" | "backup", data: SiteContent, by: string, note?: string) {
  const d = await db();
  await d.insert(contentRevisions).values({ kind, data, createdBy: by, note: note?.slice(0, 300) ?? null });
  // keep the history bounded
  const old = await d
    .select({ id: contentRevisions.id })
    .from(contentRevisions)
    .orderBy(desc(contentRevisions.id))
    .limit(1000)
    .offset(MAX_REVISIONS);
  if (old.length) {
    const minKeep = old[0]!.id;
    await d.delete(contentRevisions).where(sql`${contentRevisions.id} <= ${minKeep} AND ${contentRevisions.kind} <> 'seed'`);
  }
}

export async function publishDraft(by: string, note?: string) {
  if (noDatabase()) {
    local.localPublish(by, note);
    invalidatePublishedCache();
    return;
  }
  const row = await ensureRow();
  const draft = normalizeContent(row.draft);
  const d = await db();
  await d
    .update(siteContent)
    .set({ published: draft, publishedAt: new Date(), publishedBy: by })
    .where(eq(siteContent.id, CONTENT_ROW_ID));
  await addRevision("publish", draft, by, note || "Publicação");
  invalidatePublishedCache();
}

export async function discardDraft() {
  if (noDatabase()) {
    local.localDiscard();
    return;
  }
  const row = await ensureRow();
  const d = await db();
  await d
    .update(siteContent)
    .set({ draft: normalizeContent(row.published), draftUpdatedAt: new Date() })
    .where(eq(siteContent.id, CONTENT_ROW_ID));
}

export async function createBackup(by: string, note?: string) {
  if (noDatabase()) {
    local.localBackup(by, note);
    return;
  }
  const row = await ensureRow();
  await addRevision("backup", normalizeContent(row.draft), by, note || "Cópia de segurança manual");
}

export async function importIntoDraft(content: SiteContent, by: string, kind: "import" | "restore", note: string) {
  if (noDatabase()) {
    local.localImport(content, by, kind, note);
    return;
  }
  // keep a backup of the current draft before replacing it
  const row = await ensureRow();
  await addRevision("backup", normalizeContent(row.draft), by, `Antes de: ${note}`);
  await saveDraft(content);
  await addRevision(kind, content, by, note);
}

export async function listRevisions() {
  if (noDatabase()) return local.localRevisions();
  const d = await db();
  return d
    .select({
      id: contentRevisions.id,
      kind: contentRevisions.kind,
      note: contentRevisions.note,
      createdBy: contentRevisions.createdBy,
      createdAt: contentRevisions.createdAt,
    })
    .from(contentRevisions)
    .orderBy(desc(contentRevisions.id))
    .limit(MAX_REVISIONS);
}

export async function getRevision(id: number) {
  if (noDatabase()) return local.localRevision(id);
  const d = await db();
  const rows = await d.select().from(contentRevisions).where(eq(contentRevisions.id, id)).limit(1);
  if (!rows[0]) return null;
  return { ...rows[0], data: normalizeContent(rows[0].data) };
}

// ---- media ----
export async function insertMedia(m: typeof media.$inferInsert) {
  const d = await db();
  const res = await d.insert(media).values(m);
  const id = Number((res as unknown as [{ insertId: number }])[0]?.insertId ?? 0);
  return id;
}

export async function listMedia() {
  if (noDatabase()) return [];
  const d = await db();
  return d.select().from(media).where(isNull(media.deletedAt)).orderBy(desc(media.id)).limit(500);
}

export async function updateMedia(id: number, patch: Partial<typeof media.$inferInsert>) {
  const d = await db();
  await d.update(media).set(patch).where(eq(media.id, id));
}

export async function softDeleteMedia(id: number) {
  const d = await db();
  await d.update(media).set({ deletedAt: new Date() }).where(eq(media.id, id));
}

export async function getMedia(id: number) {
  const d = await db();
  const rows = await d.select().from(media).where(eq(media.id, id)).limit(1);
  return rows[0] ?? null;
}

// ---- messages ----
export async function insertMessage(m: typeof messages.$inferInsert) {
  if (noDatabase()) return;
  const d = await db();
  await d.insert(messages).values(m);
}

export async function countRecentMessagesFrom(ipHash: string, sinceMs: number) {
  if (noDatabase()) return 0;
  const d = await db();
  const rows = await d
    .select({ n: count() })
    .from(messages)
    .where(and(eq(messages.ipHash, ipHash), gte(messages.createdAt, new Date(Date.now() - sinceMs))));
  return Number(rows[0]?.n ?? 0);
}

export async function listMessages() {
  if (noDatabase()) return [];
  const d = await db();
  return d.select().from(messages).orderBy(desc(messages.id)).limit(500);
}

export async function setMessageRead(id: number, isRead: boolean) {
  const d = await db();
  await d.update(messages).set({ isRead }).where(eq(messages.id, id));
}

export async function deleteMessage(id: number) {
  const d = await db();
  await d.delete(messages).where(eq(messages.id, id));
}

export async function unreadMessageCount() {
  if (noDatabase()) return 0;
  const d = await db();
  const rows = await d.select({ n: count() }).from(messages).where(eq(messages.isRead, false));
  return Number(rows[0]?.n ?? 0);
}

// ---- key/value ----
const memoryKv = new Map<string, string>();

export async function kvGet(k: string): Promise<string | null> {
  if (!process.env.DATABASE_URL) return memoryKv.get(k) ?? null;
  const d = await db();
  const rows = await d.select().from(appKv).where(eq(appKv.k, k)).limit(1);
  return rows[0]?.v ?? null;
}

export async function kvSet(k: string, v: string) {
  const d = await db();
  await d.insert(appKv).values({ k, v }).onDuplicateKeyUpdate({ set: { v } });
}

export async function incrementCounter(k: string): Promise<number> {
  if (!process.env.DATABASE_URL) {
    const next = Number(memoryKv.get(k) ?? 0) + 1;
    memoryKv.set(k, String(next));
    return next;
  }
  const d = await db();
  await d
    .insert(appKv)
    .values({ k, v: "1" })
    .onDuplicateKeyUpdate({ set: { v: sql`CAST(CAST(${appKv.v} AS UNSIGNED) + 1 AS CHAR)` } });
  return Number((await kvGet(k)) ?? 0);
}

// ---- admin bootstrap ----
export async function adminCount() {
  if (noDatabase()) return process.env.ADMIN_EMAIL ? 1 : 0;
  const d = await db();
  const rows = await d.select({ n: count() }).from(users).where(eq(users.role, "admin"));
  return Number(rows[0]?.n ?? 0);
}

/** Atomically lets only one verified account claim the first administrator role. */
export async function claimFirstAdmin(userId: number, code: string): Promise<"claimed" | "taken" | "invalid"> {
  if (!(await verifySetupCode(code))) return "invalid";
  const d = await db();
  return d.transaction(async tx => {
    const key = "admin_bootstrap_claim";
    // The app_kv primary key serializes concurrent claims across app instances.
    await tx.insert(appKv).values({ k: key, v: String(userId) }).onDuplicateKeyUpdate({ set: { k: key } });
    const claim = await tx.select().from(appKv).where(eq(appKv.k, key)).limit(1);
    if (claim[0]?.v !== String(userId)) return "taken";
    const admins = await tx.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
    if (admins.length > 0 && admins[0]!.id !== userId) return "taken";
    await tx.update(users).set({ role: "admin" }).where(eq(users.id, userId));
    return "claimed";
  });
}

export async function promoteToAdmin(userId: number) {
  const d = await db();
  await d.update(users).set({ role: "admin" }).where(eq(users.id, userId));
}

export function hashSecret(value: string, salt: string) {
  return crypto.createHash("sha256").update(`${salt}:${value.trim().toUpperCase()}`).digest("hex");
}

/** Verifies the one-time admin setup code (env ADMIN_SETUP_CODE or stored hash). */
export async function verifySetupCode(code: string): Promise<boolean> {
  const envCode = process.env.ADMIN_SETUP_CODE;
  const candidates: { expected: string; actual: string }[] = [];
  if (envCode) {
    candidates.push({ expected: hashSecret(envCode, "env"), actual: hashSecret(code, "env") });
  }
  const stored = await kvGet("admin_setup_hash");
  if (stored) {
    const [salt, hash] = stored.split(":");
    if (salt && hash) candidates.push({ expected: hash, actual: hashSecret(code, salt) });
  }
  return candidates.some(c => {
    const a = Buffer.from(c.expected, "hex");
    const b = Buffer.from(c.actual, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}
