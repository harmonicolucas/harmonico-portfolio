import { useEffect, useRef, useState, type ReactNode } from "react";

function useInViewOnce<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible] as const;
}

/** Fade + rise on first appearance (identical timing to the reference). */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const [ref, visible] = useInViewOnce<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ text, className = "", as = "h2" }: { text: string; className?: string; as?: "h2" | "h1" }) {
  const [ref, visible] = useInViewOnce<HTMLHeadingElement>();
  const Tag = as;
  return (
    <Tag ref={ref} className={`section-title fade-in-title ${visible ? "is-visible" : ""} ${className}`}>
      <span style={{ whiteSpace: "pre-line" }}>{text}</span>
    </Tag>
  );
}

export function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= breakpoint);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth <= breakpoint);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return mobile;
}

/** Offsets used by the reference stacked-card animations. */
export const STACK_OFFSETS = [
  { rot: -7, x: 6, y: -4 },
  { rot: 5, x: -8, y: 3 },
  { rot: -3, x: 10, y: 6 },
  { rot: 9, x: -5, y: -6 },
  { rot: -10, x: 4, y: 5 },
  { rot: 4, x: -10, y: -2 },
  { rot: -5, x: 9, y: -5 },
  { rot: 8, x: -3, y: 7 },
  { rot: -8, x: 7, y: 2 },
  { rot: 3, x: -6, y: -7 },
];

/** Style for an image in a "throw to the back" stack (experience images / mobile work stack). */
export function stackImageStyle(index: number, active: number, total: number): Record<string, string | number> | null {
  const pos = (index - active + total) % total;
  const isLast = pos === total - 1;
  if (pos > 2 && !isLast) return null;
  const o = STACK_OFFSETS[index % STACK_OFFSETS.length]!;
  if (isLast && total > 1) {
    return { "--tx": `${o.x + 100}px`, "--ty": `${o.y - 40}px`, "--rot": `${o.rot + 25}deg`, "--sc": 0.88, "--op": 0, zIndex: 5 };
  }
  const front = pos === 0;
  return {
    "--tx": front ? "0px" : `${0.4 * o.x + 8 * pos}px`,
    "--ty": front ? "0px" : `${0.4 * o.y + (pos % 2 === 1 ? -1 : 1) * pos * 10}px`,
    "--rot": front ? "0deg" : `${0.4 * o.rot + pos * (o.rot >= 0 ? 1.5 : -1.5)}deg`,
    "--sc": front ? 1 : 1 - 0.06 * pos,
    "--op": front ? 1 : 0.75 - (pos - 1) * 0.2,
    zIndex: 30 - 10 * pos,
  };
}
