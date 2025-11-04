import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, ExternalLink, Github, Play, X } from "lucide-react";
import type { Project, Section } from "@shared/content";
import { useContent, useT } from "../content";
import { Reveal, SectionTitle, stackImageStyle } from "../motion";
import { SmartLink } from "../Nav";

const EXTRAS = ["t1", "t2", "t3", "t4", "b1", "b2", "b3", "b4"];

export function HeroSection({ section }: { section: Section }) {
  const { t } = useT();
  const heroRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const s = section.settings;
  const name = s.marquee || "";

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => {
      const speed = window.innerWidth / 8;
      const loop = track.scrollWidth / 2;
      heroRef.current?.style.setProperty("--marquee-loop-duration", `${loop / speed}s`);
    };
    update();
    window.addEventListener("resize", update);
    document.fonts?.ready.then(update).catch(() => undefined);
    return () => window.removeEventListener("resize", update);
  }, [name]);

  return (
    <section id={section.anchor || "inicio"} className="hero-root" ref={heroRef}>
      <div className="bg-name-marquee">
        <div className="bg-name-track" ref={trackRef}>
          <span className="bg-name-text">{name}</span>
          <span className="bg-name-text" aria-hidden="true">
            {name}
          </span>
        </div>
      </div>
      {EXTRAS.map(k => (
        <div key={k} className={`bg-name-marquee bg-name-marquee--mobile-extra bg-name-marquee--${k}`} aria-hidden="true">
          <div className="bg-name-track">
            <span className="bg-name-text">{name}</span>
            <span className="bg-name-text">{name}</span>
          </div>
        </div>
      ))}
      <div className="concentric-circles">
        <div className="circle circle-1" />
        <div className="circle circle-2" />
        <div className="circle circle-3" />
      </div>
      {s.image && (
        <div className="profile-wrap">
          <img src={s.image} alt={t(s.imageAlt) || name} className="profile-image" draggable={false} fetchPriority="high" />
        </div>
      )}
      {s.showText && (
        <div className="hero-text">
          <div className="hero-name">{t(s.heroName)}</div>
          <div className="hero-subtitle">{t(s.heroSubtitle)}</div>
          <p className="hero-statement">{t(s.heroStatement)}</p>
        </div>
      )}
      <div className="scroll-indicator">
        <div className="scroll-line" />
        <span className="scroll-text">{t(s.scrollLabel)}</span>
      </div>
    </section>
  );
}

export function filterProjects(projects: Project[], filter: string | undefined) {
  const list = projects.filter(p => p.enabled);
  if (filter === "featured") return list.filter(p => p.featured);
  if (filter === "technical" || filter === "digital") return list.filter(p => p.kind === filter);
  return list;
}

function MobileStack({ projects, active, onAdvance }: { projects: Project[]; active: number; onAdvance: () => void }) {
  const { t } = useT();
  const n = projects.length;
  return (
    <div className="work-mobile-stack" onClick={onAdvance} role="button" tabIndex={0} onKeyDown={e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAdvance(); }
    }}>
      {projects.map((p, i) => {
        const style = stackImageStyle(i, active, n);
        if (!style) return null;
        const front = (i - active + n) % n === 0;
        return (
          <img
            key={p.id}
            src={p.cover}
            alt={t(p.coverAlt) || t(p.title)}
            className={`stacked-image${front ? " stacked-image-front" : ""}`}
            style={style as React.CSSProperties}
            draggable={false}
          />
        );
      })}
    </div>
  );
}

export function GallerySection({ section }: { section: Section }) {
  const { content } = useContent();
  const { t, ui } = useT();
  const projects = filterProjects(content?.projects ?? [], section.settings.projectFilter ?? "featured").filter(p => p.cover);
  const [active, setActive] = useState(projects.length > 1 ? 1 : 0);
  const [open, setOpen] = useState<Project | null>(null);
  const n = projects.length;
  const go = (i: number) => setActive(((i % n) + n) % n);
  const current = projects[Math.min(active, Math.max(0, n - 1))];
  const s = section.settings;

  return (
    <section id={section.anchor || undefined} className="section">
      <Reveal>
        <div className="work-header">
          <div>
            {t(section.label) && <div className="section-label">{t(section.label)}</div>}
            <SectionTitle text={t(section.title)} />
            {t(section.description) && <div className="section-desc">{t(section.description)}</div>}
          </div>
          {s.buttonHref && t(s.buttonLabel) && (
            <SmartLink href={s.buttonHref} className="work-album-btn-top">
              {t(s.buttonLabel)} <ArrowUpRight size={14} />
            </SmartLink>
          )}
        </div>
      </Reveal>
      {n === 0 ? (
        <p className="pf-empty">{ui("emptySection")}</p>
      ) : (
        <>
          <Reveal delay={100}>
            <div className="work-album">
              <div className="work-album-inner">
                {projects.map((p, i) => {
                  let off = (i - active + n) % n;
                  if (off > n / 2) off -= n;
                  const center = off === 0;
                  const c = Math.abs(off);
                  const sign = center ? 0 : off / c;
                  const style: React.CSSProperties = center
                    ? { transform: "translate(-50%, -50%) scale(1)", zIndex: 5, opacity: 1 }
                    : {
                        transform: `translate(calc(-50% + ${sign * (200 + (c - 1) * 130)}px), -50%) scale(${Math.max(0.55, 1 - 0.28 * c)})`,
                        zIndex: 5 - c,
                        opacity: c <= 2 ? Math.max(0, 0.85 - (c - 1) * 0.55) : 0,
                        pointerEvents: c <= 2 ? "auto" : "none",
                      };
                  return (
                    <div
                      key={p.id}
                      className={`work-album-item${center ? " work-album-item-center" : ""}`}
                      style={style}
                      onClick={() => (center ? setOpen(p) : go(i))}
                      role="button"
                      tabIndex={c <= 2 ? 0 : -1}
                      aria-label={t(p.title)}
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          center ? setOpen(p) : go(i);
                        }
                        if (e.key === "ArrowRight") { e.preventDefault(); go(active + 1); }
                        if (e.key === "ArrowLeft") { e.preventDefault(); go(active - 1); }
                      }}
                    >
                      <img src={p.cover} alt={t(p.coverAlt) || t(p.title)} className="work-album-img" draggable={false} loading="lazy" />
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="work-mobile-stack-wrap">
              <MobileStack projects={projects} active={active} onAdvance={() => go(active + 1)} />
            </div>
          </Reveal>
          {current && (
            <Reveal delay={200}>
              <div className="work-info" key={current.id}>
                <h3 className="work-info-title">{t(current.title)}</h3>
                <p className="work-info-desc">{t(current.description)}</p>
                <a
                  href={current.demoUrl || current.repoUrl || "#"}
                  className="work-info-link"
                  onClick={e => {
                    e.preventDefault();
                    setOpen(current);
                  }}
                >
                  {t(s.linkLabel) || ui("viewProject")}
                </a>
              </div>
            </Reveal>
          )}
        </>
      )}
      {open && <ProjectModal project={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function toEmbed(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export function VideoPlayer({ url, title }: { url: string; title: string }) {
  const embed = toEmbed(url);
  if (embed) {
    return (
      <div className="pf-video">
        <iframe src={embed} title={title} allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
      </div>
    );
  }
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url) || url.startsWith("/manus-storage/")) {
    return (
      <div className="pf-video">
        <video src={url} controls preload="metadata" playsInline />
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="pf-modal-link">
      <Play size={14} /> {title}
    </a>
  );
}

/** Project detail dialog: gallery, video and links. Styled with the reference tokens. */
export function ProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const { t, ui } = useT();
  const media = [{ url: project.cover, type: "image" as const, alt: project.coverAlt, caption: { pt: "", en: "" } }, ...project.gallery].filter(m => m.url);
  const [idx, setIdx] = useState(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx(i => (i + 1) % Math.max(1, media.length));
      if (e.key === "ArrowLeft") setIdx(i => (i - 1 + media.length) % Math.max(1, media.length));
    };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, media.length]);

  const cur = media[idx];
  const links = [
    project.demoUrl && { label: ui("demo"), url: project.demoUrl, icon: <ExternalLink size={14} /> },
    project.repoUrl && { label: ui("repo"), url: project.repoUrl, icon: <Github size={14} /> },
    ...project.links.filter(l => l.url).map(l => ({ label: t(l.label), url: l.url, icon: <ArrowUpRight size={14} /> })),
  ].filter(Boolean) as { label: string; url: string; icon: React.ReactNode }[];

  const dialog = (
    <div className="success-modal-overlay pf-project-overlay" onClick={onClose}>
      <div
        className="pf-project-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t(project.title)}
        tabIndex={-1}
        ref={dialogRef}
        onClick={e => e.stopPropagation()}
      >
        <button className="success-modal-close" onClick={onClose} aria-label={ui("formClose")}>
          <X size={20} />
        </button>
        {cur && (
          <div className="pf-project-media">
            {cur.type === "video" ? (
              <VideoPlayer url={cur.url} title={t(project.title)} />
            ) : (
              <img src={cur.url} alt={t(cur.alt) || t(project.title)} />
            )}
            {t(cur.caption) && <p className="pf-project-caption">{t(cur.caption)}</p>}
          </div>
        )}
        {media.length > 1 && (
          <div className="pf-project-thumbs">
            {media.map((m, i) => (
              <button key={m.url + i} className={i === idx ? "is-active" : ""} onClick={() => setIdx(i)} aria-label={`${i + 1}`}>
                {m.type === "video" ? <Play size={16} /> : <img src={m.url} alt="" loading="lazy" />}
              </button>
            ))}
          </div>
        )}
        <div className="pf-project-body">
          <div className="section-label" style={{ marginBottom: 8 }}>
            {[t(project.category), t(project.date)].filter(Boolean).join(" · ")}
          </div>
          <h3 className="work-info-title" style={{ textAlign: "left" }}>
            {t(project.title)}
          </h3>
          <p className="pf-project-desc">{t(project.description)}</p>
          {project.tech.length > 0 && (
            <div className="bento-skills" style={{ marginTop: 16 }}>
              {project.tech.map(x => (
                <span key={x} className="bento-tag">
                  {x}
                </span>
              ))}
            </div>
          )}
          {project.awards.length > 0 && (
            <ul className="pf-project-awards">
              {project.awards.map((a, i) => (
                <li key={i}>{t(a)}</li>
              ))}
            </ul>
          )}
          {project.video && (
            <div style={{ marginTop: 20 }}>
              <VideoPlayer url={project.video} title={ui("watchVideo")} />
            </div>
          )}
          {links.length > 0 && (
            <div className="pf-project-links">
              {links.map(l => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="pf-modal-link">
                  {l.icon} {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
  return createPortal(dialog, document.body);
}
