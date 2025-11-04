import { useEffect } from "react";
import { useLocation } from "wouter";
import type { Section } from "@shared/content";
import { ContentProvider, useContent, useT } from "./content";
import { langFromPath, pathFor, pageFromPath } from "./i18n";
import { Nav, SmartLink } from "./Nav";
import { PortfolioThemeProvider } from "./theme";
import { GallerySection, HeroSection } from "./sections/HeroGallery";
import { AboutSection, CapabilitiesSection, RecognitionSection, TextSection, TimelineSection } from "./sections/Profile";
import { ArchiveSection, ContactSection, CtaSection, DigitalSection } from "./sections/ContactWork";

const RENDERERS: Record<Section["style"], (p: { section: Section }) => React.ReactElement> = {
  hero: HeroSection,
  gallery: GallerySection,
  capabilities: CapabilitiesSection,
  about: AboutSection,
  recognition: RecognitionSection,
  timeline: TimelineSection,
  contact: ContactSection,
  text: TextSection,
  archive: ArchiveSection,
  digital: DigitalSection,
  cta: CtaSection,
};

function BgLines() {
  // Same decorative wave lines as the reference (viewBox 0 0 1440 5000)
  const groups: { op: number; paths: [string, number][] }[] = [
    { op: 0.28, paths: [["M-100 200 C 200 100, 500 300, 800 200 C 1100 100, 1300 280, 1540 180", 1.5], ["M0 350 C 300 250, 600 400, 900 320 C 1200 240, 1400 380, 1440 300", 1], ["M-80 500 C 240 420, 540 580, 840 500 C 1140 420, 1360 560, 1500 480", 1.5]] },
    { op: 0.32, paths: [["M0 700 C 320 620, 620 780, 920 700 C 1220 620, 1420 760, 1440 680", 1], ["M-100 850 C 260 780, 560 920, 860 860 C 1160 800, 1380 940, 1540 880", 1.5], ["M0 1000 C 300 940, 600 1060, 900 1000 C 1200 940, 1400 1080, 1440 1020", 1]] },
    { op: 0.22, paths: [["M-120 1250 C 200 1180, 500 1320, 820 1260 C 1140 1200, 1340 1340, 1560 1280", 1.5], ["M0 1400 C 280 1340, 580 1460, 880 1400 C 1180 1340, 1380 1480, 1440 1420", 1], ["M-60 1550 C 240 1490, 540 1610, 840 1550 C 1140 1490, 1360 1630, 1500 1570", 1.5], ["M0 1700 C 320 1640, 620 1760, 920 1700 C 1220 1640, 1420 1780, 1440 1720", 1]] },
    { op: 0.3, paths: [["M-140 1950 C 220 1880, 520 2020, 860 1960 C 1200 1900, 1400 2040, 1580 1980", 1.5], ["M0 2100 C 300 2040, 600 2160, 900 2100 C 1200 2040, 1400 2180, 1440 2120", 1], ["M-80 2250 C 240 2190, 540 2310, 840 2250 C 1140 2190, 1360 2330, 1500 2270", 1.5]] },
    { op: 0.26, paths: [["M0 2500 C 320 2440, 620 2560, 920 2500 C 1220 2440, 1420 2580, 1440 2520", 1], ["M-100 2650 C 260 2590, 560 2710, 860 2650 C 1160 2590, 1380 2730, 1540 2670", 1.5], ["M0 2800 C 300 2740, 600 2860, 900 2800 C 1200 2740, 1400 2880, 1440 2820", 1], ["M-60 2950 C 240 2890, 540 3010, 840 2950 C 1140 2890, 1360 3030, 1500 2970", 1.5]] },
    { op: 0.34, paths: [["M-120 3250 C 200 3180, 500 3320, 820 3260 C 1140 3200, 1340 3340, 1560 3280", 1.5], ["M0 3400 C 280 3340, 580 3460, 880 3400 C 1180 3340, 1380 3480, 1440 3420", 1], ["M-80 3550 C 240 3490, 540 3610, 840 3550 C 1140 3490, 1360 3630, 1500 3570", 1.5], ["M0 3700 C 320 3640, 620 3760, 920 3700 C 1220 3640, 1420 3780, 1440 3720", 1]] },
    { op: 0.24, paths: [["M-100 4050 C 260 3990, 560 4110, 860 4050 C 1160 3990, 1380 4130, 1540 4070", 1.5], ["M0 4200 C 300 4140, 600 4260, 900 4200 C 1200 4140, 1400 4280, 1440 4220", 1], ["M-60 4350 C 240 4290, 540 4410, 840 4350 C 1140 4290, 1360 4430, 1500 4370", 1.5]] },
    { op: 0.3, paths: [["M-140 4600 C 220 4540, 520 4660, 860 4600 C 1200 4540, 1400 4680, 1580 4620", 1.5], ["M0 4750 C 300 4690, 600 4810, 900 4750 C 1200 4690, 1400 4830, 1440 4770", 1]] },
  ];
  return (
    <svg className="bg-lines" viewBox="0 0 1440 5000" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }} aria-hidden="true">
      {groups.map((g, i) => (
        <g key={i} opacity={g.op}>
          {g.paths.map(([d, w], j) => (
            <path key={j} d={d} stroke="var(--light-gray)" strokeWidth={w} fill="none" />
          ))}
        </g>
      ))}
    </svg>
  );
}

function Footer() {
  const { content } = useContent();
  const { t, lang } = useT();
  const [location, navigate] = useLocation();
  if (!content || !content.settings.footer.enabled) return null;
  const f = content.settings.footer;
  const page = pageFromPath(location) ?? "home";
  const year = String(new Date().getFullYear());
  return (
    <footer className="footer">
      <div className="pf-footer-inner">
        {t(f.tagline) && <p className="footer-text">{t(f.tagline)}</p>}
        <nav className="pf-footer-links" aria-label="Rodapé">
          {f.links
            .filter(l => l.url)
            .map(l => (
              <SmartLink key={l.id} href={l.url} className="footer-text pf-footer-link">
                {t(l.label)}
              </SmartLink>
            ))}
          {content.settings.cv[lang] && (
            <a href={content.settings.cv[lang]} target="_blank" rel="noopener noreferrer" className="footer-text pf-footer-link">
              CV (PDF)
            </a>
          )}
        </nav>
        <div className="pf-footer-lang" role="group" aria-label="Idioma / Language">
          {(["pt", "en"] as const).map(l => (
            <button
              key={l}
              type="button"
              className={`footer-text pf-footer-link${l === lang ? " is-active" : ""}`}
              aria-pressed={l === lang}
              onClick={() => navigate(pathFor(page, l))}
            >
              {l === "pt" ? "Português" : "English"}
            </button>
          ))}
        </div>
        <p className="footer-text">{t(f.copyright).replace("{year}", year)}</p>
      </div>
    </footer>
  );
}

function PreviewBanner() {
  const { preview } = useContent();
  const { ui } = useT();
  if (!preview) return null;
  return (
    <div className="pf-preview-banner" role="status">
      <span>{ui("previewBanner")}</span>
      <a href="/admin">{ui("previewExit")}</a>
    </div>
  );
}

function StatusScreen({ kind }: { kind: "loading" | "error" }) {
  const { refetch } = useContent();
  const lang = langFromPath(typeof window !== "undefined" ? window.location.pathname : "/");
  return (
    <div className="pf-status" role={kind === "error" ? "alert" : "status"}>
      {kind === "loading" ? (
        <>
          <div className="pf-spinner" aria-hidden="true" />
          <p className="footer-text">{lang === "pt" ? "A carregar…" : "Loading…"}</p>
        </>
      ) : (
        <>
          <p className="section-desc">{lang === "pt" ? "Não foi possível carregar o conteúdo." : "We couldn't load the content."}</p>
          <button className="nav-cta" onClick={refetch}>
            {lang === "pt" ? "Tentar novamente" : "Try again"}
          </button>
        </>
      )}
    </div>
  );
}

function useDocumentMeta(page: "home" | "work" | null) {
  const { content } = useContent();
  const { t, lang } = useT();
  useEffect(() => {
    document.documentElement.lang = lang;
    if (!content) return;
    const s = content.settings;
    const archive = content.sections.find(x => x.page === "work" && x.style === "archive");
    if (page === "work") {
      document.title = `${t(archive?.title) || (lang === "pt" ? "Projectos" : "Projects")} — ${s.person.displayName}`;
    } else if (page === "home") {
      document.title = t(s.seo.title);
    } else {
      document.title = `${t(s.ui.notFoundTitle)} — ${s.person.displayName}`;
    }
    const description = page === "work" ? t(archive?.description) || t(s.seo.description) : page === "home" ? t(s.seo.description) : t(s.ui.notFoundText);
    const meta = (key: string, value: string | undefined, attr: "name" | "property" = "name") => {
      const selector = `meta[${attr}="${key}"]`;
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!value) {
        el?.remove();
        return;
      }
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = value;
    };
    const link = (rel: string, href: string | undefined, hreflang?: string) => {
      const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
      let el = document.head.querySelector<HTMLLinkElement>(selector);
      if (!href) {
        el?.remove();
        return;
      }
      if (!el) {
        el = document.createElement("link");
        el.rel = rel;
        if (hreflang) el.hreflang = hreflang;
        document.head.appendChild(el);
      }
      el.href = href;
    };
    const origin = (() => {
      try {
        const url = new URL(s.seo.siteUrl);
        return url.protocol === "https:" && !url.username && !url.password ? url.origin : "";
      } catch {
        return "";
      }
    })();
    const route = page ? new URL(pathFor(page, lang), origin || window.location.origin).href : "";
    const image = s.seo.ogImage ? (origin ? new URL(s.seo.ogImage, origin).href : s.seo.ogImage) : "";
    meta("description", description);
    meta("keywords", page ? t(s.seo.keywords) : undefined);
    meta("robots", page ? undefined : "noindex,follow");
    meta("author", page ? s.person.displayName : undefined);
    meta("og:type", page === "home" ? "profile" : page === "work" ? "website" : undefined, "property");
    meta("og:site_name", page ? s.person.displayName : undefined, "property");
    meta("og:title", page ? document.title : undefined, "property");
    meta("og:description", page ? description : undefined, "property");
    meta("og:locale", page ? (lang === "pt" ? "pt_PT" : "en_US") : undefined, "property");
    meta("og:image", page ? image : undefined, "property");
    meta("og:url", origin && page ? route : undefined, "property");
    meta("twitter:card", page ? "summary_large_image" : undefined);
    meta("twitter:title", page ? document.title : undefined);
    meta("twitter:description", page ? description : undefined);
    meta("twitter:image", page ? image : undefined);
    link("canonical", origin && page ? route : undefined);
    for (const alternate of ["pt", "en"] as const) {
      link("alternate", origin && page ? new URL(pathFor(page, alternate), origin).href : undefined, alternate);
    }
    link("alternate", origin && page ? new URL(pathFor(page, "pt"), origin).href : undefined, "x-default");
  }, [content, lang, page, t]);
}

function scrollToHashOnLoad() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  setTimeout(() => document.getElementById(decodeURIComponent(hash))?.scrollIntoView({ behavior: "auto" }), 80);
}

function PageBody({ page }: { page: "home" | "work" }) {
  const { content, loading, error } = useContent();
  const [location] = useLocation();
  useDocumentMeta(page);
  useEffect(() => {
    if (!content || location.split("?")[0] !== "/" || content.settings.defaultLang !== "en") return;
    try {
      if (localStorage.getItem("pf-lang") === "pt") return;
    } catch {
      /* continue with the configured default */
    }
    window.location.replace(`/en${window.location.search}`);
  }, [content, location]);
  useEffect(() => {
    if (content) scrollToHashOnLoad();
  }, [!!content]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!content) return <StatusScreen kind={loading ? "loading" : error ? "error" : "loading"} />;
  const sections = content.sections.filter(s => s.enabled && s.page === page);
  const body = sections.map(s => {
    const R = RENDERERS[s.style];
    return R ? <R key={s.id} section={s} /> : null;
  });
  if (page === "work") {
    return (
      <main style={{ position: "relative" }}>
        <Nav page="work" />
        {body}
        <Footer />
        <PreviewBanner />
      </main>
    );
  }
  return (
    <div className="portfolio-root">
      <BgLines />
      <Nav page="home" />
      <main>{body}</main>
      <Footer />
      <PreviewBanner />
    </div>
  );
}

function NotFoundBody() {
  const { content } = useContent();
  const { ui, lang } = useT();
  useDocumentMeta(null);
  return (
    <div className="portfolio-root">
      <BgLines />
      {content && <Nav page="work" />}
      <section className="section pf-notfound">
        <div className="section-label">404</div>
        <h1 className="section-title">{content ? ui("notFoundTitle") : "404"}</h1>
        <p className="section-desc">{content ? ui("notFoundText") : ""}</p>
        <SmartLink href={pathFor("home", lang)} className="nav-cta" style={{ display: "inline-block", marginTop: 24 }}>
          {content ? ui("backHome") : "Home"}
        </SmartLink>
      </section>
    </div>
  );
}

export function PublicSite() {
  const [location] = useLocation();
  const page = pageFromPath(location);
  useEffect(() => {
    document.documentElement.classList.remove("admin-mode");
  }, []);
  return (
    <PortfolioThemeProvider>
      <ContentProvider>{page ? <PageBody page={page} key={page} /> : <NotFoundBody />}</ContentProvider>
    </PortfolioThemeProvider>
  );
}
