import { tr, type Lang, type SiteContent } from "../../shared/content";

/** Public page routes per language. */
export const PUBLIC_ROUTES: { path: string; lang: Lang; page: "home" | "work" }[] = [
  { path: "/", lang: "pt", page: "home" },
  { path: "/projectos", lang: "pt", page: "work" },
  { path: "/en", lang: "en", page: "home" },
  { path: "/en/projects", lang: "en", page: "work" },
];

export function altPath(page: "home" | "work", lang: Lang) {
  return PUBLIC_ROUTES.find(r => r.page === page && r.lang === lang)!.path;
}

export function matchRoute(pathname: string) {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return PUBLIC_ROUTES.find(r => r.path === clean) ?? null;
}

export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Serialises JSON safely for embedding in a <script type="application/json"> tag. */
export function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function abs(origin: string, url: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (!origin) return "";
  return origin.replace(/\/+$/, "") + (url.startsWith("/") ? url : `/${url}`);
}

export function buildHead(content: SiteContent, pathname: string): { head: string; lang: Lang; status: number } {
  const route = matchRoute(pathname);
  const isAdmin = pathname.startsWith("/admin");
  const lang: Lang = route?.lang ?? (pathname.startsWith("/en") ? "en" : "pt");
  const s = content.settings;
  const origin = s.seo.siteUrl?.trim() ?? "";
  const name = s.person.displayName;
  let title = tr(s.seo.title, lang);
  let description = tr(s.seo.description, lang);

  if (route?.page === "work") {
    const archive = content.sections.find(x => x.page === "work" && x.style === "archive");
    title = `${tr(archive?.title, lang) || (lang === "pt" ? "Projectos" : "Projects")} — ${name}`;
    description = tr(archive?.description, lang) || description;
  }

  const tags: string[] = [];
  if (isAdmin) {
    tags.push(`<title>${esc(lang === "pt" ? "Painel de administração" : "Admin panel")} — ${esc(name)}</title>`);
    tags.push(`<meta name="robots" content="noindex, nofollow" />`);
    return { head: tags.join("\n    "), lang: "pt", status: 200 };
  }
  if (!route) {
    tags.push(`<title>${esc(tr(s.ui.notFoundTitle, lang) || "404")} — ${esc(name)}</title>`);
    tags.push(`<meta name="robots" content="noindex" />`);
    return { head: tags.join("\n    "), lang, status: 404 };
  }

  const keywords = tr(s.seo.keywords, lang);
  const ogImage = abs(origin, s.seo.ogImage);
  tags.push(`<title>${esc(title)}</title>`);
  tags.push(`<meta name="description" content="${esc(description)}" />`);
  if (keywords) tags.push(`<meta name="keywords" content="${esc(keywords)}" />`);
  tags.push(`<meta name="author" content="${esc(name)}" />`);
  tags.push(`<meta property="og:type" content="${route.page === "home" ? "profile" : "website"}" />`);
  tags.push(`<meta property="og:site_name" content="${esc(name)}" />`);
  tags.push(`<meta property="og:title" content="${esc(title)}" />`);
  tags.push(`<meta property="og:description" content="${esc(description)}" />`);
  tags.push(`<meta property="og:locale" content="${lang === "pt" ? "pt_PT" : "en_US"}" />`);
  tags.push(`<meta name="twitter:card" content="summary_large_image" />`);
  tags.push(`<meta name="twitter:title" content="${esc(title)}" />`);
  tags.push(`<meta name="twitter:description" content="${esc(description)}" />`);
  if (ogImage) {
    tags.push(`<meta property="og:image" content="${esc(ogImage)}" />`);
    tags.push(`<meta name="twitter:image" content="${esc(ogImage)}" />`);
  }
  if (origin) {
    tags.push(`<link rel="canonical" href="${esc(abs(origin, route.path))}" />`);
    tags.push(`<meta property="og:url" content="${esc(abs(origin, route.path))}" />`);
    tags.push(`<link rel="alternate" hreflang="pt" href="${esc(abs(origin, altPath(route.page, "pt")))}" />`);
    tags.push(`<link rel="alternate" hreflang="en" href="${esc(abs(origin, altPath(route.page, "en")))}" />`);
    tags.push(`<link rel="alternate" hreflang="x-default" href="${esc(abs(origin, altPath(route.page, "pt")))}" />`);
  }
  // Structured data (Person)
  const sameAs = content.sections
    .filter(x => x.style === "contact")
    .flatMap(x => x.items)
    .filter(i => i.enabled && /^https?:\/\//.test(i.url))
    .map(i => i.url);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle: tr(s.person.title, lang),
    address: { "@type": "PostalAddress", addressLocality: tr(s.person.location, lang) },
    sameAs,
  };
  tags.push(`<script type="application/ld+json">${safeJson(ld)}</script>`);
  return { head: tags.join("\n    "), lang, status: 200 };
}

/** Crawler-visible body summary (replaced by the React app on load). */
export function buildBody(content: SiteContent, pathname: string): string {
  const route = matchRoute(pathname);
  if (!route) return "";
  const lang = route.lang;
  const s = content.settings;
  const parts: string[] = [];
  parts.push(`<h1>${esc(s.person.displayName)} — ${esc(tr(s.person.title, lang))}</h1>`);
  const secs = content.sections.filter(x => x.enabled && x.page === route.page);
  for (const sec of secs) {
    const heading = tr(sec.title, lang) || tr(sec.settings.headline, lang);
    if (heading) parts.push(`<h2>${esc(heading.replace(/\n/g, " "))}</h2>`);
    const desc = tr(sec.description, lang) || tr(sec.settings.bio, lang);
    if (desc) parts.push(`<p>${esc(desc)}</p>`);
    for (const it of sec.items.filter(i => i.enabled)) {
      parts.push(`<p><strong>${esc(tr(it.title, lang))}</strong> ${esc(tr(it.org, lang))} ${esc(tr(it.date, lang))} ${esc(tr(it.description, lang))}</p>`);
    }
    if (["gallery", "archive", "digital"].includes(sec.style)) {
      const filter = sec.settings.projectFilter ?? "all";
      content.projects
        .filter(p => p.enabled)
        .filter(p => (filter === "featured" ? p.featured : filter === "all" ? true : p.kind === filter))
        .forEach(p => parts.push(`<h3>${esc(tr(p.title, lang))}</h3><p>${esc(tr(p.description, lang))}</p>`));
    }
  }
  return `<div class="seo-fallback" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">${parts.join("")}</div>`;
}

export function renderHtml(template: string, content: SiteContent, pathname: string) {
  const { head, lang, status } = buildHead(content, pathname);
  let html = template.replace(/<!--seo-start-->[\s\S]*?<!--seo-end-->/, head);
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${lang === "pt" ? "pt" : "en"}"`);
  if (!pathname.startsWith("/admin")) {
    const data = `<script id="pf-data" type="application/json">${safeJson(content)}</script>`;
    html = html.replace(`<div id="root"></div>`, `<div id="root">${buildBody(content, pathname)}</div>\n    ${data}`);
  }
  return { html, status };
}
