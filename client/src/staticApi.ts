import superjson from "superjson";
import { findMissingTranslations, findReviewFlags, type SiteContent } from "@shared/content";

const DOC_KEY = "pf-pages-doc";
const SESSION_KEY = "pf-pages-session";

type Revision = {
  id: number;
  kind: "publish" | "import" | "restore" | "seed" | "backup";
  note: string | null;
  data: SiteContent;
  createdBy: string;
  createdAt: string;
};

type Message = {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  lang: string;
  isRead: boolean;
  createdAt: string;
};

type Doc = {
  draft: SiteContent;
  published: SiteContent;
  seed: SiteContent;
  draftUpdatedAt: string;
  publishedAt: string;
  publishedBy: string | null;
  revisions: Revision[];
  messages: Message[];
};

type Gate = { emails: string[]; passwordSha256: string };

function readEmbedded(): SiteContent | null {
  try {
    const el = document.getElementById("pf-data");
    if (!el?.textContent) return null;
    return JSON.parse(el.textContent) as SiteContent;
  } catch {
    return null;
  }
}

function readGate(): Gate | null {
  try {
    const el = document.getElementById("pf-gate");
    if (!el?.textContent) return null;
    const gate = JSON.parse(el.textContent) as Gate;
    if (!gate.passwordSha256 || !Array.isArray(gate.emails)) return null;
    return gate;
  } catch {
    return null;
  }
}

function loadDoc(): Doc {
  const seed = readEmbedded();
  try {
    const raw = JSON.parse(localStorage.getItem(DOC_KEY) || "") as Doc;
    if (raw?.draft && raw?.published) {
      return { ...raw, messages: raw.messages ?? [], revisions: raw.revisions ?? [], seed: raw.seed ?? seed ?? raw.published };
    }
  } catch {
    /* start from the page embedded in the site */
  }
  if (!seed) throw new Error("O conteúdo do site não está disponível.");
  const now = new Date().toISOString();
  const doc: Doc = {
    draft: seed,
    published: seed,
    seed,
    draftUpdatedAt: now,
    publishedAt: now,
    publishedBy: "site",
    revisions: [{ id: 1, kind: "seed", note: "Conteúdo publicado", data: seed, createdBy: "site", createdAt: now }],
    messages: [],
  };
  localStorage.setItem(DOC_KEY, JSON.stringify(doc));
  return doc;
}

function saveDoc(doc: Doc) {
  localStorage.setItem(DOC_KEY, JSON.stringify(doc));
}

function loggedIn() {
  return localStorage.getItem(SESSION_KEY) === "1";
}

function user() {
  const email = readGate()?.emails[0] ?? "";
  const now = new Date().toISOString();
  return {
    id: 1,
    openId: "local-admin",
    name: "Harmónico Lucas",
    email,
    loginMethod: "password",
    role: "admin" as const,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

async function sha256(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function pushRevision(doc: Doc, kind: Revision["kind"], data: SiteContent, note: string) {
  const id = doc.revisions.reduce((max, rev) => Math.max(max, rev.id), 0) + 1;
  doc.revisions.unshift({ id, kind, note, data, createdBy: "Harmónico Lucas", createdAt: new Date().toISOString() });
  doc.revisions = doc.revisions.slice(0, 60);
}

function editorState(doc: Doc) {
  return {
    draft: doc.draft,
    draftUpdatedAt: doc.draftUpdatedAt,
    publishedAt: doc.publishedAt,
    publishedBy: doc.publishedBy,
    hasUnpublishedChanges: JSON.stringify(doc.draft) !== JSON.stringify(doc.published),
    missingTranslations: findMissingTranslations(doc.draft),
    reviewFlags: findReviewFlags(doc.draft),
    unreadMessages: doc.messages.filter(m => !m.isRead).length,
  };
}

function trpcError(message: string, code: string) {
  return {
    error: {
      json: {
        message,
        code: -32001,
        data: { code, httpStatus: code === "UNAUTHORIZED" ? 401 : 400, stack: "" },
      },
    },
  };
}

async function call(path: string, input: unknown) {
  const needsAdmin = path.startsWith("portfolio.admin.") || path.startsWith("portfolio.access.");
  if (needsAdmin && !loggedIn()) return trpcError("Sessão em falta.", "UNAUTHORIZED");

  if (path === "auth.me") return loggedIn() ? user() : null;
  if (path === "auth.logout") {
    localStorage.removeItem(SESSION_KEY);
    return { success: true };
  }
  if (path === "auth.login") {
    const gate = readGate();
    const body = (input ?? {}) as { email?: string; password?: string };
    if (!gate) return trpcError("O login local não está configurado.", "PRECONDITION_FAILED");
    const email = String(body.email ?? "").trim().toLowerCase();
    const passwordOk = (await sha256(String(body.password ?? ""))) === gate.passwordSha256;
    if (!gate.emails.includes(email) || !passwordOk) return trpcError("E-mail ou senha incorrectos.", "UNAUTHORIZED");
    localStorage.setItem(SESSION_KEY, "1");
    return { ok: true };
  }

  if (path === "portfolio.access.status") return { isAdmin: true, adminExists: true };
  if (path === "portfolio.content") {
    const doc = loadDoc();
    const preview = Boolean((input as { preview?: boolean } | null)?.preview) && loggedIn();
    return { content: preview ? doc.draft : doc.published, publishedAt: doc.publishedAt, preview };
  }
  if (path === "portfolio.sendMessage") {
    const msg = (input ?? {}) as { name?: string; email?: string; subject?: string; message?: string; lang?: string; website?: string };
    if (msg.website) return { ok: true };
    const doc = loadDoc();
    const id = doc.messages.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    doc.messages.unshift({
      id,
      name: String(msg.name ?? ""),
      email: String(msg.email ?? ""),
      subject: msg.subject || null,
      message: String(msg.message ?? ""),
      lang: msg.lang || "pt",
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    saveDoc(doc);
    return { ok: true };
  }
  if (path === "portfolio.coffee.get") return { count: 0 };
  if (path === "portfolio.coffee.add") return { count: 0 };

  const doc = loadDoc();
  if (path === "portfolio.admin.state") return editorState(doc);
  if (path === "portfolio.admin.saveDraft") {
    doc.draft = (input as { content: SiteContent }).content;
    doc.draftUpdatedAt = new Date().toISOString();
    saveDoc(doc);
    return { ok: true, savedAt: doc.draftUpdatedAt, missingTranslations: findMissingTranslations(doc.draft), reviewFlags: findReviewFlags(doc.draft) };
  }
  if (path === "portfolio.admin.publish") {
    doc.published = doc.draft;
    doc.publishedAt = new Date().toISOString();
    doc.publishedBy = "Harmónico Lucas";
    pushRevision(doc, "publish", doc.draft, String((input as { note?: string } | null)?.note || "Publicação"));
    saveDoc(doc);
    return { ok: true, publishedAt: doc.publishedAt };
  }
  if (path === "portfolio.admin.discardDraft") {
    doc.draft = doc.published;
    doc.draftUpdatedAt = new Date().toISOString();
    saveDoc(doc);
    return { ok: true };
  }
  if (path === "portfolio.admin.backup") {
    pushRevision(doc, "backup", doc.draft, String((input as { note?: string } | null)?.note || "Cópia de segurança"));
    saveDoc(doc);
    return { ok: true };
  }
  if (path === "portfolio.admin.revisions") {
    return doc.revisions.map(({ data: _data, ...rev }) => rev);
  }
  if (path === "portfolio.admin.revision") {
    const rev = doc.revisions.find(item => item.id === (input as { id: number }).id);
    if (!rev) return trpcError("Revisão não encontrada", "NOT_FOUND");
    return rev;
  }
  if (path === "portfolio.admin.restoreRevision" || path === "portfolio.admin.importContent" || path === "portfolio.admin.resetToDefault") {
    let next = doc.seed;
    let note = "Reposição do conteúdo inicial";
    let kind: Revision["kind"] = "restore";
    if (path === "portfolio.admin.restoreRevision") {
      const rev = doc.revisions.find(item => item.id === (input as { id: number }).id);
      if (!rev) return trpcError("Revisão não encontrada", "NOT_FOUND");
      next = rev.data;
      note = `Restaurada a revisão #${rev.id}`;
    } else if (path === "portfolio.admin.importContent") {
      next = (input as { content: SiteContent }).content;
      note = "Importação de ficheiro JSON";
      kind = "import";
    }
    pushRevision(doc, "backup", doc.draft, `Antes de: ${note}`);
    doc.draft = next;
    doc.draftUpdatedAt = new Date().toISOString();
    pushRevision(doc, kind, next, note);
    saveDoc(doc);
    return { ok: true };
  }
  if (path === "portfolio.admin.messages.list") return doc.messages;
  if (path === "portfolio.admin.messages.setRead") {
    const body = input as { id: number; isRead: boolean };
    const msg = doc.messages.find(item => item.id === body.id);
    if (msg) msg.isRead = body.isRead;
    saveDoc(doc);
    return { ok: true };
  }
  if (path === "portfolio.admin.messages.remove") {
    doc.messages = doc.messages.filter(item => item.id !== (input as { id: number }).id);
    saveDoc(doc);
    return { ok: true };
  }
  if (path === "portfolio.admin.media.list") return [];
  if (path === "portfolio.admin.media.update" || path === "portfolio.admin.media.remove") return { ok: true };
  return trpcError("Operação indisponível neste site.", "NOT_FOUND");
}

function isError(value: unknown): value is { error: unknown } {
  return Boolean(value && typeof value === "object" && "error" in value);
}

export async function staticFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response | null> {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(raw, window.location.origin);
  if (!url.pathname.startsWith("/api/trpc/")) return null;

  const paths = decodeURIComponent(url.pathname.slice("/api/trpc/".length)).split(",").filter(Boolean);
  let payload: Record<string, { json?: unknown; meta?: { values?: unknown; referentialEqualities?: unknown } }> = {};
  const encoded = url.searchParams.get("input");
  if (encoded) payload = JSON.parse(encoded);
  else if (typeof init?.body === "string" && init.body) payload = JSON.parse(init.body);

  const results = [];
  for (let i = 0; i < paths.length; i++) {
    const entry = payload[String(i)] ?? payload[i] ?? {};
    const data = entry && typeof entry === "object" && "meta" in entry && entry.meta ? superjson.deserialize(entry as never) : entry?.json;
    const value = await call(paths[i]!, data);
    results.push(isError(value) ? value : { result: { data: { json: value } } });
  }
  return new Response(JSON.stringify(results), { status: 200, headers: { "content-type": "application/json" } });
}
