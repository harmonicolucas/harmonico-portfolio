import fs from "node:fs";
import path from "node:path";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { mediaKindForMime, UPLOAD_POLICY } from "../../shared/content";
import { sdk } from "../_core/sdk";
import { storageGetSignedUrl, storagePut } from "../storage";
import { PUBLIC_ROUTES, renderHtml } from "./seo";
import * as store from "./store";

export const CSRF_HEADER = "x-pf-client";

/** Basic hardening headers. Framing must stay allowed for the Manus Preview iframe. */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

/**
 * CSRF protection: every state-changing API request must carry a custom header.
 * Browsers cannot attach custom headers to cross-site requests without a CORS
 * pre-flight, which this server never approves.
 */
export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  if (req.headers[CSRF_HEADER] !== "1") {
    res.status(403).json({ error: "Pedido rejeitado (CSRF)." });
    return;
  }
  next();
}

/** Checks the file signature so a renamed file cannot pass as another type. */
function sniffMime(buf: Buffer): string | null {
  const b = (i: number) => buf[i];
  if (buf.length < 12) return null;
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "image/png";
  if (buf.subarray(0, 3).toString("ascii") === "GIF") return "image/gif";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.subarray(0, 4).toString("ascii") === "%PDF") return "application/pdf";
  if (b(0) === 0x1a && b(1) === 0x45 && b(2) === 0xdf && b(3) === 0xa3) return "video/webm";
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii");
    if (brand.startsWith("avi")) return "image/avif";
    if (brand.startsWith("qt")) return "video/quicktime";
    return "video/mp4";
  }
  return null;
}

const COMPAT: Record<string, string[]> = {
  "video/mp4": ["video/mp4", "video/quicktime"],
  "video/quicktime": ["video/quicktime", "video/mp4"],
};

function safeName(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w.\-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "ficheiro"
  );
}

const MEDIA_ARCHIVE = path.resolve(import.meta.dirname, "../../portfolio-media/manus-storage");

/** Archived copies use plain names; the published keys add a storage hash or an async-images path. */
const ARCHIVE_ALIASES: Record<string, string> = {
  "async-images/wapusYJwxYPR5WfIh8B9vf/image-1.webp": "project-gallery-1.webp",
  "async-images/wapusYJwxYPR5WfIh8B9vf/image-2.webp": "project-gallery-2.webp",
  "async-images/wapusYJwxYPR5WfIh8B9vf/image-3.webp": "project-gallery-3.webp",
  "async-images/wapusYJwxYPR5WfIh8B9vf/image-4.webp": "project-gallery-4.webp",
  "async-images/wapusYJwxYPR5WfIh8B9vf/image-5.webp": "project-gallery-5.webp",
  "async-images/fpwI6wTEgdeTM0rp3FH788/image-1.webp": "profile-timeline-1.webp",
  "async-images/fpwI6wTEgdeTM0rp3FH788/image-2.webp": "profile-timeline-2.webp",
  "async-images/fpwI6wTEgdeTM0rp3FH788/image-3.webp": "profile-timeline-3.webp",
  "async-images/fpwI6wTEgdeTM0rp3FH788/image-4.webp": "profile-timeline-4.webp",
  "async-images/fpwI6wTEgdeTM0rp3FH788/image-5.webp": "profile-timeline-5.webp",
};

function localArchiveFile(key: string): string | null {
  const base = path.basename(key);
  const stripped = base.replace(/_[0-9a-f]{8}(?=\.[^.]+$)/i, "");
  const names = [ARCHIVE_ALIASES[key], base, stripped].filter((name): name is string => !!name);
  const root = path.resolve(MEDIA_ARCHIVE);
  for (const name of names) {
    if (name.includes("..") || name.includes("/") || name.includes("\\")) continue;
    const file = path.resolve(root, name);
    if (file !== root && !file.startsWith(root + path.sep)) continue;
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

function safePublicOrigin(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return "";
    return url.origin;
  } catch {
    return "";
  }
}

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function registerPortfolioHttp(app: Express) {
  app.use(securityHeaders);
  app.use("/api", csrfGuard);

  app.get("/robots.txt", async (_req: Request, res: Response) => {
    try {
      const { content } = await store.getPublished();
      const origin = safePublicOrigin(content.settings.seo.siteUrl);
      const lines = ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /api/"];
      if (origin) lines.push(`Sitemap: ${origin}/sitemap.xml`);
      res.set("Cache-Control", "no-cache").type("text/plain").send(`${lines.join("\n")}\n`);
    } catch {
      res.set("Cache-Control", "no-cache").type("text/plain").send("User-agent: *\nDisallow: /\n");
    }
  });

  app.get("/sitemap.xml", async (_req: Request, res: Response) => {
    try {
      const { content } = await store.getPublished();
      const origin = safePublicOrigin(content.settings.seo.siteUrl);
      const urls = origin
        ? PUBLIC_ROUTES.map(route => `<url><loc>${xmlEscape(`${origin}${route.path}`)}</loc></url>`).join("")
        : "";
      const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
      res.set("Cache-Control", "no-cache").type("application/xml").send(xml);
    } catch {
      res.set("Cache-Control", "no-cache").type("application/xml").send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
  });

  // Development-only fallback: the platform resolves /manus-storage/* before the app in
  // Preview and production. Direct requests to the dev port (local tests) are redirected
  // to a short-lived signed download URL instead of returning the SPA 404.
  if (process.env.NODE_ENV !== "production") {
    app.get(/^\/manus-storage\/(.+)$/, async (req: Request, res: Response) => {
      try {
        const key = decodeURIComponent((req.params as Record<string, string>)[0] ?? "");
        if (!key || key.includes("..")) {
          res.status(400).end();
          return;
        }
        const local = localArchiveFile(key);
        if (local) {
          res.sendFile(local);
          return;
        }
        res.redirect(302, await storageGetSignedUrl(key));
      } catch {
        res.status(404).end();
      }
    });
  }

  const maxBytes = Math.max(...Object.values(UPLOAD_POLICY).map(p => p.maxBytes));
  app.post(
    "/api/admin/upload",
    express.raw({ type: () => true, limit: maxBytes }),
    async (req: Request, res: Response) => {
      try {
        let user;
        try {
          user = await sdk.authenticateRequest(req);
        } catch {
          user = null;
        }
        if (!user || user.role !== "admin") {
          res.status(403).json({ error: "Apenas o administrador pode carregar ficheiros." });
          return;
        }
        const declared = String(req.headers["content-type"] ?? "").split(";")[0]!.trim().toLowerCase();
        const kind = mediaKindForMime(declared);
        if (!kind) {
          res.status(415).json({ error: "Formato não suportado. Use JPG, PNG, WEBP, GIF, AVIF, MP4, WEBM, MOV ou PDF." });
          return;
        }
        const body = req.body as Buffer;
        if (!Buffer.isBuffer(body) || body.length === 0) {
          res.status(400).json({ error: "Ficheiro vazio." });
          return;
        }
        if (body.length > UPLOAD_POLICY[kind].maxBytes) {
          res.status(413).json({ error: `Ficheiro demasiado grande (máx. ${Math.round(UPLOAD_POLICY[kind].maxBytes / 1048576)} MB).` });
          return;
        }
        const sniffed = sniffMime(body);
        const allowed = COMPAT[declared] ?? [declared];
        if (!sniffed || !allowed.includes(sniffed)) {
          res.status(415).json({ error: "O conteúdo do ficheiro não corresponde ao formato indicado." });
          return;
        }
        const original = safeName(decodeURIComponent(String(req.query.name ?? "ficheiro")));
        const { key, url } = await storagePut(`portfolio/${kind}/${original}`, body, declared);
        const title = String(req.query.title ?? "").slice(0, 255) || original;
        const id = await store.insertMedia({
          storageKey: key,
          url,
          kind,
          mime: declared,
          size: body.length,
          originalName: original,
          title,
          uploadedBy: (user.name || user.email || user.openId).slice(0, 200),
        });
        res.json({ id, url, kind, mime: declared, size: body.length, title });
      } catch (error) {
        console.error("[upload] failed", error);
        res.status(500).json({ error: "Falha no carregamento. Tente novamente." });
      }
    },
  );

  // Uploaded payloads above the limit
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/api/admin/upload" && err && typeof err === "object" && (err as { type?: string }).type === "entity.too.large") {
      res.status(413).json({ error: "Ficheiro demasiado grande." });
      return;
    }
    next(err);
  });
}

/** Injects per-route SEO tags, crawler-visible content and the published document into index.html. */
export async function renderPage(template: string, pathname: string) {
  try {
    const { content } = await store.getPublished();
    return renderHtml(template, content, pathname);
  } catch (error) {
    console.warn("[seo] could not load content", error);
    return { html: template, status: 200 };
  }
}
