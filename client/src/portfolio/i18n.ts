import { useLocation } from "wouter";
import type { Lang } from "@shared/content";

export type PageKind = "home" | "work";

const ROUTES: Record<Lang, Record<PageKind, string>> = {
  pt: { home: "/", work: "/projectos" },
  en: { home: "/en", work: "/en/projects" },
};

export function pathFor(page: PageKind, lang: Lang) {
  return ROUTES[lang][page];
}

export function langFromPath(pathname: string): Lang {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "pt";
}

export function pageFromPath(pathname: string): PageKind | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  for (const lang of ["pt", "en"] as const) {
    for (const page of ["home", "work"] as const) {
      if (ROUTES[lang][page] === clean) return page;
    }
  }
  return null;
}

export function useLang(): Lang {
  const [location] = useLocation();
  return langFromPath(location);
}

/**
 * Converts content links (written for the Portuguese site, e.g. "/#contacto" or "/projectos")
 * into the current language. External links and in-page anchors are returned untouched.
 */
export function localizeHref(href: string, lang: Lang): string {
  if (!href) return href;
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const [pathPart, hash] = href.split("#");
  const path = (pathPart || "/").replace(/\/+$/, "") || "/";
  let page: PageKind | null = null;
  if (path === "/" || path === "/en") page = "home";
  if (path === "/projectos" || path === "/en/projects" || path === "/work") page = "work";
  if (!page) return href;
  const target = pathFor(page, lang);
  return hash !== undefined ? `${target === "/" ? "/" : target}#${hash}` : target;
}

export function isExternal(href: string) {
  return /^(https?:)?\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
}

/** Links to an in-page anchor of the current route (smooth scroll handled by CSS). */
export function isSamePageAnchor(href: string, currentPath: string) {
  if (href.startsWith("#")) return true;
  const [p, hash] = href.split("#");
  if (hash === undefined) return false;
  const a = (p || "/").replace(/\/+$/, "") || "/";
  const b = currentPath.replace(/\/+$/, "") || "/";
  return a === b;
}
