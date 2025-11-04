import fs from "node:fs";
import path from "node:path";
import { zContent, type SiteContent } from "../../shared/content";
import { buildDefaultContent } from "../defaultContent";

const FILE = path.resolve(import.meta.dirname, "../../.local/site-content.json");

type Revision = {
  id: number;
  kind: "publish" | "import" | "restore" | "seed" | "backup";
  note: string | null;
  data: SiteContent;
  createdBy: string;
  createdAt: string;
};

type Doc = {
  draft: SiteContent;
  published: SiteContent;
  draftUpdatedAt: string;
  publishedAt: string;
  publishedBy: string | null;
  revisions: Revision[];
};

function emptyDoc(): Doc {
  const initial = buildDefaultContent();
  const now = new Date().toISOString();
  return {
    draft: initial,
    published: initial,
    draftUpdatedAt: now,
    publishedAt: now,
    publishedBy: "seed",
    revisions: [{ id: 1, kind: "seed", note: "Conteúdo inicial", data: initial, createdBy: "seed", createdAt: now }],
  };
}

function read(): Doc {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8")) as Doc;
    const draft = zContent.safeParse(raw.draft);
    const published = zContent.safeParse(raw.published);
    if (!draft.success || !published.success) return emptyDoc();
    return {
      draft: draft.data,
      published: published.data,
      draftUpdatedAt: raw.draftUpdatedAt || new Date().toISOString(),
      publishedAt: raw.publishedAt || new Date().toISOString(),
      publishedBy: raw.publishedBy ?? null,
      revisions: Array.isArray(raw.revisions) ? raw.revisions : [],
    };
  } catch {
    const doc = emptyDoc();
    write(doc);
    return doc;
  }
}

function write(doc: Doc) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(doc));
}

function pushRevision(doc: Doc, kind: Revision["kind"], data: SiteContent, by: string, note?: string) {
  const nextId = doc.revisions.reduce((max, rev) => Math.max(max, rev.id), 0) + 1;
  doc.revisions.unshift({
    id: nextId,
    kind,
    note: note?.slice(0, 300) ?? null,
    data,
    createdBy: by.slice(0, 200),
    createdAt: new Date().toISOString(),
  });
  doc.revisions = doc.revisions.slice(0, 60);
}

export function localPublished() {
  const doc = read();
  return { content: doc.published, publishedAt: new Date(doc.publishedAt) };
}

export function localEditorState() {
  const doc = read();
  return {
    draft: doc.draft,
    draftUpdatedAt: new Date(doc.draftUpdatedAt),
    publishedAt: new Date(doc.publishedAt),
    publishedBy: doc.publishedBy,
    hasUnpublishedChanges: JSON.stringify(doc.draft) !== JSON.stringify(doc.published),
  };
}

export function localSaveDraft(content: SiteContent) {
  const doc = read();
  doc.draft = content;
  doc.draftUpdatedAt = new Date().toISOString();
  write(doc);
}

export function localPublish(by: string, note?: string) {
  const doc = read();
  doc.published = doc.draft;
  doc.publishedAt = new Date().toISOString();
  doc.publishedBy = by.slice(0, 200);
  pushRevision(doc, "publish", doc.draft, by, note || "Publicação");
  write(doc);
}

export function localDiscard() {
  const doc = read();
  doc.draft = doc.published;
  doc.draftUpdatedAt = new Date().toISOString();
  write(doc);
}

export function localBackup(by: string, note?: string) {
  const doc = read();
  pushRevision(doc, "backup", doc.draft, by, note || "Cópia de segurança manual");
  write(doc);
}

export function localImport(content: SiteContent, by: string, kind: "import" | "restore", note: string) {
  const doc = read();
  pushRevision(doc, "backup", doc.draft, by, `Antes de: ${note}`);
  doc.draft = content;
  doc.draftUpdatedAt = new Date().toISOString();
  pushRevision(doc, kind, content, by, note);
  write(doc);
}

export function localRevisions() {
  return read().revisions.map(rev => ({
    id: rev.id,
    kind: rev.kind,
    note: rev.note,
    createdBy: rev.createdBy,
    createdAt: new Date(rev.createdAt),
  }));
}

export function localRevision(id: number) {
  const rev = read().revisions.find(item => item.id === id);
  if (!rev) return null;
  const parsed = zContent.safeParse(rev.data);
  if (!parsed.success) return null;
  return { ...rev, data: parsed.data, createdAt: new Date(rev.createdAt) };
}
