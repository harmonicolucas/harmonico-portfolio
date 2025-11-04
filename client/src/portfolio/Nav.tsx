import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowUp, Menu, X } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import type { NavItem } from "@shared/content";
import { useContent, useT } from "./content";
import { isExternal, langFromPath, localizeHref, pageFromPath, pathFor } from "./i18n";
import { ThemeToggle } from "./theme";

/** Anchor that works for in-page hashes, internal routes and external links. */
export function SmartLink({
  href,
  className,
  children,
  onClick,
  style,
  ...rest
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  style?: React.CSSProperties;
  "aria-label"?: string;
}) {
  const [location, navigate] = useLocation();
  const lang = langFromPath(location);
  const target = localizeHref(href, lang);
  const external = isExternal(target);
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || external || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const [path, hash] = target.split("#");
    const current = location.replace(/\/+$/, "") || "/";
    const dest = (path || current).replace(/\/+$/, "") || "/";
    if (target.startsWith("#") || dest === current) {
      if (hash !== undefined) {
        const el = document.getElementById(hash);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: "smooth" });
          history.replaceState(null, "", `#${hash}`);
        }
      }
      return;
    }
    if (pageFromPath(dest)) {
      e.preventDefault();
      navigate(dest);
      if (hash) {
        setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "auto" }), 60);
      } else {
        window.scrollTo({ top: 0 });
      }
    }
  };
  return (
    <a
      href={target}
      className={className}
      onClick={handle}
      style={style}
      target={external && !target.startsWith("mailto:") && !target.startsWith("tel:") ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      {...rest}
    >
      {children}
    </a>
  );
}

function LangToggle({ className, style }: { className: string; style?: React.CSSProperties }) {
  const [location, navigate] = useLocation();
  const { ui } = useT();
  const lang = langFromPath(location);
  const page = pageFromPath(location) ?? "home";
  const next = lang === "pt" ? "en" : "pt";
  return (
    <button
      type="button"
      className={className}
      style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", ...style }}
      aria-label={`${ui("language")}: ${next === "en" ? "English" : "Português"}`}
      title={next === "en" ? "English" : "Português"}
      onClick={() => {
        const hash = window.location.hash;
        navigate(pathFor(page, next) + (hash || ""));
        try {
          localStorage.setItem("pf-lang", next);
        } catch {
          /* ignore */
        }
      }}
    >
      {next.toUpperCase()}
    </button>
  );
}

export function Nav({ page }: { page: "home" | "work" }) {
  const { content } = useContent();
  const { t, ui } = useT();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [showCoffee, setShowCoffee] = useState(false);
  const [pop, setPop] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const always = page === "work";

  const coffeeQuery = trpc.portfolio.coffee.get.useQuery(undefined, { staleTime: 60_000, enabled: import.meta.env.VITE_STATIC !== "1", retry: false });
  const [count, setCount] = useState<number | null>(null);
  const addCoffee = trpc.portfolio.coffee.add.useMutation();
  useEffect(() => {
    if (typeof coffeeQuery.data?.count === "number") setCount(coffeeQuery.data.count);
  }, [coffeeQuery.data]);
  const loadingCount = coffeeQuery.isLoading && count === null;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      setShowTop(always || window.scrollY > 400);
      setShowCoffee(always || window.scrollY > 0.5 * window.innerHeight);
    };
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [always]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  useEffect(() => {
    if (!pop) return;
    const id = setTimeout(() => setPop(false), 400);
    return () => clearTimeout(id);
  }, [pop]);

  if (!content) return null;
  const s = content.settings;
  const items: NavItem[] = (page === "work" && s.nav.workItems.length ? s.nav.workItems : s.nav.items).filter(i => i.visible);
  const cta = s.nav.cta;

  const onCoffee = async (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setPop(true);
    const prev = count ?? 0;
    setCount(prev + 1);
    try {
      const res = await addCoffee.mutateAsync();
      setCount(typeof res.count === "number" ? res.count : prev);
    } catch {
      setCount(prev);
    }
  };

  return (
    <>
      <nav ref={navRef} className={`nav-bar ${scrolled ? "scrolled" : ""} ${open ? "nav-bar--expanded" : ""}`} aria-label="Principal">
        <div className="nav-mobile-header">
          <SmartLink href="/" className="nav-left" aria-label={s.person.displayName}>
            <div className="nav-logo">{s.brand.letter}</div>
            <div className="nav-brand">{s.brand.name}</div>
          </SmartLink>
          <LangToggle className="md:hidden nav-theme-toggle" style={{ position: "relative", zIndex: 210, marginRight: 4 }} />
          <ThemeToggle className="md:hidden nav-theme-toggle" style={{ position: "relative", zIndex: 210 }} label={ui("toggleTheme")} />
          <button
            className="md:hidden nav-menu-btn"
            onClick={() => setOpen(!open)}
            aria-label={open ? ui("closeMenu") : ui("openMenu")}
            aria-expanded={open}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 8, position: "relative", zIndex: 210, color: "var(--text)" }}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open && (
          <div className="nav-mobile-menu">
            <div className="nav-mobile-menu-inner">
              {items.map(i => (
                <SmartLink key={i.id} href={i.href} className="nav-link" onClick={() => setOpen(false)}>
                  {t(i.label)}
                </SmartLink>
              ))}
              {cta.visible && (
                <SmartLink href={cta.href} className="nav-cta" style={{ textAlign: "center" }} onClick={() => setOpen(false)}>
                  {t(cta.label)}
                </SmartLink>
              )}
            </div>
          </div>
        )}
        <div className="nav-center hidden md:flex">
          {items.map(i => (
            <SmartLink key={i.id} href={i.href} className="nav-link">
              {t(i.label)}
            </SmartLink>
          ))}
        </div>
        <div className="nav-right">
          <LangToggle className="nav-theme-toggle hidden md:inline-flex" style={{ marginRight: 8 }} />
          <ThemeToggle className="nav-theme-toggle hidden md:inline-flex" style={{ marginRight: 8 }} label={ui("toggleTheme")} />
          {cta.visible && (
            <SmartLink href={cta.href} className="nav-cta hidden md:block">
              {t(cta.label)}
            </SmartLink>
          )}
        </div>
      </nav>
      {showTop && !open && (
        <button className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label={ui("backToTop")}>
          <ArrowUp size={20} />
        </button>
      )}
      {s.coffee.enabled && (
        <a href="#" className={`coffee-btn${showCoffee ? " coffee-btn--visible" : ""}`} aria-label={t(s.coffee.label)} onClick={onCoffee}>
          <span className="coffee-text">{t(s.coffee.label)}</span>
          <img src="/images/coffee.gif" alt="" className={`coffee-gif${pop ? " coffee-gif--pop" : ""}`} />
          <span className="coffee-count">{loadingCount ? "..." : count ?? 0}</span>
        </a>
      )}
    </>
  );
}
