import { createContext, useContext, useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";

type ThemeCtx = { dark: boolean; toggleTheme: (e: MouseEvent<HTMLElement>) => void };
const Ctx = createContext<ThemeCtx | null>(null);

type VTDocument = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

/** Same behaviour as the reference: circular wipe via View Transitions, with a clip-path fallback. */
export function PortfolioThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [animating, setAnimating] = useState(false);
  const [circle, setCircle] = useState<CSSProperties>({});

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored === "dark" || (!stored && matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const apply = (value: boolean) => {
    setDark(value);
    document.documentElement.classList.toggle("dark", value);
    localStorage.setItem("theme", value ? "dark" : "light");
  };

  const toggleTheme = (e: MouseEvent<HTMLElement>) => {
    if (animating) return;
    const next = !dark;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const doc = document as VTDocument;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      apply(next);
      return;
    }
    if (doc.startViewTransition) {
      const root = document.documentElement;
      root.style.setProperty("--vt-x", `${x}px`);
      root.style.setProperty("--vt-y", `${y}px`);
      root.style.setProperty("--vt-r", `${r}px`);
      root.classList.add("vt-disable-anim", "vt-wipe-active");
      doc
        .startViewTransition(() => {
          flushSync(() => apply(next));
        })
        .finished.then(() => root.classList.remove("vt-disable-anim", "vt-wipe-active"));
      return;
    }
    setAnimating(true);
    setCircle({
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      pointerEvents: "none",
      background: next ? "#0f1115" : "#D9DADD",
      clipPath: `circle(0px at ${x}px ${y}px)`,
      transition: "clip-path 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
    });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setCircle(c => ({ ...c, clipPath: `circle(${r}px at ${x}px ${y}px)` }))),
    );
    setTimeout(() => {
      apply(next);
      setTimeout(() => {
        setCircle({});
        setAnimating(false);
      }, 50);
    }, 500);
  };

  return (
    <Ctx.Provider value={{ dark, toggleTheme }}>
      {children}
      {animating && <div className="theme-transition-circle" style={circle} aria-hidden="true" />}
    </Ctx.Provider>
  );
}

export function usePortfolioTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePortfolioTheme must be used within PortfolioThemeProvider");
  return c;
}

export function ThemeToggle({ className, style, label }: { className?: string; style?: CSSProperties; label: string }) {
  const { toggleTheme } = usePortfolioTheme();
  return (
    <button className={className} onClick={toggleTheme} aria-label={label} style={style} type="button">
      <Sun className="icon-sun" size={18} />
      <Moon className="icon-moon" size={18} />
    </button>
  );
}
