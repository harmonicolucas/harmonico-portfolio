import { z } from "zod";

/**
 * Portfolio content model.
 * The whole public site is rendered from one validated JSON document.
 * The admin edits a draft copy; publishing copies the draft to the published copy
 * and stores a revision snapshot (backup / rollback).
 */

export const LANGS = ["pt", "en"] as const;
export type Lang = (typeof LANGS)[number];

const MAX_TEXT = 6000;

/** Only allow safe URL schemes (blocks javascript:, data:, vbscript: …). */
export function isSafeUrl(value: string): boolean {
  const v = value.trim();
  if (v === "") return true;
  if (v.startsWith("/") && !v.startsWith("//")) return true; // relative path
  if (v.startsWith("#")) return true; // in-page anchor
  return /^(https?:\/\/|mailto:|tel:)/i.test(v);
}

export const zUrl = z
  .string()
  .max(2048)
  .refine(isSafeUrl, { message: "URL inválido (use http(s)://, mailto:, tel: ou um caminho /relativo)" });

export const zL = z.object({
  pt: z.string().max(MAX_TEXT).default(""),
  en: z.string().max(MAX_TEXT).default(""),
});
export type L = z.infer<typeof zL>;

export const zId = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);

export const zLink = z.object({
  id: zId,
  label: zL,
  url: zUrl,
  kind: z.enum(["link", "certificate", "demo", "repo", "document", "video"]).default("link"),
});
export type LinkItem = z.infer<typeof zLink>;

export const zMedia = z.object({
  url: zUrl,
  type: z.enum(["image", "video"]).default("image"),
  alt: zL.default({ pt: "", en: "" }),
  caption: zL.default({ pt: "", en: "" }),
});
export type MediaRef = z.infer<typeof zMedia>;

/** Generic item used inside sections (experience, education, certificate, contact card…). */
export const zItem = z.object({
  id: zId,
  enabled: z.boolean().default(true),
  review: z.boolean().default(false),
  note: z.string().max(1000).default(""),
  title: zL,
  subtitle: zL.default({ pt: "", en: "" }),
  org: zL.default({ pt: "", en: "" }),
  date: zL.default({ pt: "", en: "" }),
  description: zL.default({ pt: "", en: "" }),
  value: z.string().max(500).default(""),
  url: zUrl.default(""),
  icon: z.string().max(64).default(""),
  /** Custom image shown instead of the built-in icon (certifications). */
  iconImage: zUrl.default(""),
  tags: z.array(z.string().max(80)).max(60).default([]),
  images: z.array(zMedia).max(30).default([]),
  video: zUrl.default(""),
  links: z.array(zLink).max(20).default([]),
  imageLeft: z.boolean().default(false),
});
export type Item = z.infer<typeof zItem>;

export const SECTION_STYLES = [
  "hero",
  "gallery",
  "capabilities",
  "about",
  "recognition",
  "timeline",
  "contact",
  "text",
  "archive",
  "digital",
  "cta",
] as const;
export type SectionStyle = (typeof SECTION_STYLES)[number];

export const SECTION_STYLE_LABELS: Record<SectionStyle, string> = {
  hero: "Hero (nome em movimento + fotografia)",
  gallery: "Galeria de projectos (álbum)",
  capabilities: "Competências (tecnologias + cartões)",
  about: "Sobre mim (perfil, estatísticas, traços)",
  recognition: "Reconhecimentos (colagem + lista)",
  timeline: "Percurso (cartões alternados com fotografias)",
  contact: "Contacto (título grande + cartões + formulário)",
  text: "Texto livre (título + parágrafos)",
  archive: "Arquivo de projectos técnicos (lista)",
  digital: "Grelha de projectos digitais",
  cta: "Chamada para acção",
};

export const zTech = z.object({
  id: zId,
  name: z.string().max(80),
  icon: zUrl.default(""),
  review: z.boolean().default(false),
  /** Starts a new labelled segment, such as Frontend. */
  breakBefore: z.boolean().default(false),
  /** Segment title. Used on the item that starts the group. */
  group: zL.default({ pt: "", en: "" }),
});

export const zStat = z.object({ id: zId, label: zL, value: zL });
export const zCurrently = z.object({ id: zId, icon: z.string().max(40).default("code"), label: zL, detail: zL });

export const zSectionSettings = z
  .object({
    // hero
    marquee: z.string().max(80).optional(),
    image: zUrl.optional(),
    imageAlt: zL.optional(),
    showText: z.boolean().optional(),
    heroName: zL.optional(),
    heroSubtitle: zL.optional(),
    heroStatement: zL.optional(),
    scrollLabel: zL.optional(),
    // gallery / archive / digital
    buttonLabel: zL.optional(),
    buttonHref: zUrl.optional(),
    linkLabel: zL.optional(),
    projectFilter: z.enum(["featured", "technical", "digital", "all"]).optional(),
    // capabilities
    tech: z.array(zTech).max(60).optional(),
    techLabel: zL.optional(),
    // about
    name: z.string().max(120).optional(),
    verified: z.boolean().optional(),
    bio: zL.optional(),
    stats: z.array(zStat).max(6).optional(),
    resumeLabel: zL.optional(),
    currentlyLabel: zL.optional(),
    currently: z.array(zCurrently).max(6).optional(),
    traitsLabel: zL.optional(),
    traits: z.array(zL).max(20).optional(),
    // recognition
    collage: z.array(zMedia).max(12).optional(),
    // contact / cta
    eyebrow: zL.optional(),
    headline: zL.optional(),
    headlineAccent: zL.optional(),
    secondary: zL.optional(),
    formLabel: zL.optional(),
    meta: zL.optional(),
    description: zL.optional(),
  })
  .default({});
export type SectionSettings = z.infer<typeof zSectionSettings>;

export const zSection = z.object({
  id: zId,
  style: z.enum(SECTION_STYLES),
  page: z.enum(["home", "work"]).default("home"),
  anchor: z
    .string()
    .max(60)
    .regex(/^[a-z0-9-]*$/, "Use apenas letras minúsculas, números e hífenes")
    .default(""),
  enabled: z.boolean().default(true),
  review: z.boolean().default(false),
  note: z.string().max(1000).default(""),
  label: zL.default({ pt: "", en: "" }),
  title: zL.default({ pt: "", en: "" }),
  description: zL.default({ pt: "", en: "" }),
  settings: zSectionSettings,
  items: z.array(zItem).max(80).default([]),
});
export type Section = z.infer<typeof zSection>;

export const zProject = z.object({
  id: zId,
  enabled: z.boolean().default(true),
  featured: z.boolean().default(true),
  review: z.boolean().default(false),
  note: z.string().max(1000).default(""),
  kind: z.enum(["technical", "digital"]).default("technical"),
  title: zL,
  category: zL.default({ pt: "", en: "" }),
  date: zL.default({ pt: "", en: "" }),
  description: zL.default({ pt: "", en: "" }),
  tech: z.array(z.string().max(60)).max(30).default([]),
  awards: z.array(zL).max(10).default([]),
  cover: zUrl.default(""),
  coverAlt: zL.default({ pt: "", en: "" }),
  gallery: z.array(zMedia).max(30).default([]),
  video: zUrl.default(""),
  demoUrl: zUrl.default(""),
  repoUrl: zUrl.default(""),
  links: z.array(zLink).max(10).default([]),
});
export type Project = z.infer<typeof zProject>;

export const zNavItem = z.object({ id: zId, label: zL, href: zUrl, visible: z.boolean().default(true) });
export type NavItem = z.infer<typeof zNavItem>;

export const zSettings = z.object({
  brand: z.object({ letter: z.string().max(3), name: z.string().max(40) }),
  person: z.object({
    displayName: z.string().max(120),
    fullName: z.string().max(160),
    title: zL,
    location: zL,
    email: z.string().max(200).default(""),
    review: z.boolean().default(false),
  }),
  seo: z.object({
    title: zL,
    description: zL,
    keywords: zL.default({ pt: "", en: "" }),
    ogImage: zUrl.default(""),
    /** Public origin, e.g. https://harmonico.manus.space — required for canonical/og:url tags. */
    siteUrl: z
      .string()
      .max(200)
      .regex(/^(https:\/\/[a-z0-9.-]+(:\d+)?)?$/i, "Use apenas a origem, ex.: https://exemplo.com")
      .default(""),
  }),
  nav: z.object({
    items: z.array(zNavItem).max(12),
    workItems: z.array(zNavItem).max(12).default([]),
    cta: z.object({ label: zL, href: zUrl, visible: z.boolean().default(true) }),
  }),
  footer: z.object({
    enabled: z.boolean().default(true),
    tagline: zL,
    copyright: zL,
    links: z.array(zLink).max(12).default([]),
  }),
  cv: z.object({ pt: zUrl.default(""), en: zUrl.default(""), review: z.boolean().default(false) }),
  coffee: z.object({ enabled: z.boolean().default(true), label: zL }),
  defaultLang: z.enum(LANGS).default("pt"),
  ui: z.record(z.string(), zL).default({}),
});
export type SiteSettings = z.infer<typeof zSettings>;

export const zContent = z.object({
  version: z.literal(1).default(1),
  settings: zSettings,
  sections: z.array(zSection).max(40),
  projects: z.array(zProject).max(80),
});
export type SiteContent = z.infer<typeof zContent>;

/** Pick the requested language, falling back to the other one when the translation is missing. */
export function tr(value: L | undefined | null, lang: Lang): string {
  if (!value) return "";
  const primary = value[lang]?.trim();
  if (primary) return value[lang];
  const other = lang === "pt" ? value.en : value.pt;
  return other ?? "";
}

/** Walks the content and lists localized fields with a missing translation. */
export function findMissingTranslations(content: SiteContent): string[] {
  const missing: string[] = [];
  const walk = (node: unknown, path: string) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, `${path}[${i}]`));
      return;
    }
    const obj = node as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 2 && "pt" in obj && "en" in obj) {
      const pt = String(obj.pt ?? "").trim();
      const en = String(obj.en ?? "").trim();
      if ((pt && !en) || (!pt && en)) missing.push(path);
      return;
    }
    for (const k of keys) walk(obj[k], path ? `${path}.${k}` : k);
  };
  walk(content, "");
  return missing;
}

/** Counts every element flagged as provisional ("a rever"). */
export function findReviewFlags(content: SiteContent): { path: string; label: string }[] {
  const out: { path: string; label: string }[] = [];
  if (content.settings.person.review) out.push({ path: "settings.person", label: "Dados pessoais" });
  if (content.settings.cv.review) out.push({ path: "settings.cv", label: "Currículo (PDF)" });
  content.sections.forEach(s => {
    const sName = s.title.pt || s.label.pt || s.id;
    if (s.review) out.push({ path: `sections.${s.id}`, label: `Secção: ${sName}` });
    s.items.forEach(it => {
      if (it.review) out.push({ path: `sections.${s.id}.items.${it.id}`, label: `${sName} › ${it.title.pt || it.id}` });
    });
    s.settings.tech?.forEach(t => {
      if (t.review) out.push({ path: `sections.${s.id}.tech.${t.id}`, label: `${sName} › Tecnologia: ${t.name}` });
    });
  });
  content.projects.forEach(p => {
    if (p.review) out.push({ path: `projects.${p.id}`, label: `Projecto: ${p.title.pt || p.id}` });
  });
  return out;
}

export function newId(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

/** Media upload policy shared by client (pre-validation) and server (enforcement). */
export const UPLOAD_POLICY = {
  image: { mimes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"], maxBytes: 10 * 1024 * 1024 },
  video: { mimes: ["video/mp4", "video/webm", "video/quicktime"], maxBytes: 80 * 1024 * 1024 },
  document: { mimes: ["application/pdf"], maxBytes: 20 * 1024 * 1024 },
} as const;
export type MediaKind = keyof typeof UPLOAD_POLICY;

export function mediaKindForMime(mime: string): MediaKind | null {
  for (const [kind, rule] of Object.entries(UPLOAD_POLICY)) {
    if ((rule.mimes as readonly string[]).includes(mime)) return kind as MediaKind;
  }
  return null;
}

export const zContactMessage = z.object({
  name: z.string().trim().min(2, "Nome demasiado curto").max(120),
  email: z.string().trim().email("E-mail inválido").max(200),
  subject: z.string().trim().max(200).default(""),
  message: z.string().trim().min(10, "Mensagem demasiado curta").max(5000),
  lang: z.enum(LANGS).default("pt"),
  website: z.string().max(0).optional(), // honeypot – must stay empty
});
