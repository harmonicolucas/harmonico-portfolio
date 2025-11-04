import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, Minus, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { Item, Project, Section } from "@shared/content";
import { useContent, useT } from "../content";
import { Icon } from "../icons";
import { Reveal, SectionTitle } from "../motion";
import { SmartLink } from "../Nav";
import { filterProjects, ProjectModal } from "./HeroGallery";

function ContactCard({ item, index }: { item: Item; index: number }) {
  const { t } = useT();
  const isEmail = item.icon === "mail" || item.url.startsWith("mailto:");
  const inner = (
    <>
      <span className="contact-card-number">{String(index + 1).padStart(2, "0")}</span>
      <div className="contact-card-icon">
        <Icon name={item.icon || "globe"} size={20} />
      </div>
      <div className="contact-card-info">
        <div className="contact-card-label">{t(item.title).toUpperCase()}</div>
        <div className="contact-card-value">{item.value}</div>
      </div>
      {!isEmail && item.url && <ArrowUpRight size={16} className="contact-card-arrow" />}
    </>
  );
  if (!item.url) return <div className="contact-card">{inner}</div>;
  return (
    <a
      href={item.url}
      className="contact-card"
      target={isEmail || item.url.startsWith("tel:") ? undefined : "_blank"}
      rel="noopener noreferrer"
    >
      {inner}
    </a>
  );
}

export function ContactSection({ section }: { section: Section }) {
  const { content } = useContent();
  const { t, ui, lang } = useT();
  const s = section.settings;
  const cards = section.items.filter(i => i.enabled);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");
  const [success, setSuccess] = useState(false);
  const send = trpc.portfolio.sendMessage.useMutation();
  const cv = content?.settings.cv[lang] || content?.settings.cv[lang === "pt" ? "en" : "pt"] || "";
  const accent = t(s.headlineAccent).trim();
  const lines = t(s.headline).split("\n");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const data = new FormData(f);
    setStatus("submitting");
    setErrorText("");
    try {
      await send.mutateAsync({
        name: String(data.get("name") ?? "").trim(),
        email: String(data.get("email") ?? "").trim(),
        message: String(data.get("message") ?? "").trim(),
        subject: "",
        lang,
        website: String(data.get("website") ?? "") || undefined,
      });
      setStatus("success");
      f.reset();
      setOpen(false);
      setSuccess(true);
      setTimeout(() => setStatus("idle"), 600);
    } catch (err) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "";
      setErrorText(/TOO_MANY|Demasiadas/i.test(msg) ? msg : "");
    }
  };

  return (
    <section id={section.anchor || undefined} className="section">
      <div className="contact-grid">
        <div className="contact-left">
          <Reveal>
            <div className="contact-eyebrow">{t(s.eyebrow)}</div>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="contact-headline">
              {lines.map((line, i) => (
                <span key={i}>
                  {accent && line.trim() === accent ? <span className="contact-headline-accent">{line}</span> : line}
                  {i < lines.length - 1 && <br />}
                </span>
              ))}
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="contact-description">{t(s.description)}</p>
          </Reveal>
          <Reveal delay={300}>
            <p className="contact-secondary">{t(s.secondary)}</p>
          </Reveal>
          {cv && (
            <Reveal delay={400}>
              <a href={cv} className="contact-resume-btn" target="_blank" rel="noopener noreferrer">
                {t(s.resumeLabel)}
              </a>
            </Reveal>
          )}
        </div>
        <div className="contact-right">
          <div className="contact-cards">
            {cards.map((c, i) => (
              <Reveal key={c.id} delay={200 + 80 * i}>
                <ContactCard item={c} index={i} />
              </Reveal>
            ))}
          </div>
          <Reveal delay={440}>
            <button
              className="contact-cta"
              onClick={() => {
                setOpen(true);
                setMinimized(false);
              }}
            >
              {t(s.formLabel).toUpperCase()}
            </button>
          </Reveal>
        </div>
      </div>

      {open && (
        <div className={`contact-modal${minimized ? " contact-modal--minimized" : ""}`} role="dialog" aria-modal="false" aria-labelledby="contact-dialog-title">
          <div className="contact-modal-header" onClick={() => minimized && setMinimized(false)}>
            <h3 className="contact-modal-title" id="contact-dialog-title">{ui("formTitle")}</h3>
            <div className="contact-modal-controls">
              <button
                type="button"
                className="contact-modal-icon-btn contact-modal-minimize-btn"
                aria-label={minimized ? ui("formExpand") : ui("formMinimize")}
                onClick={e => {
                  e.stopPropagation();
                  setMinimized(m => !m);
                }}
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                className="contact-modal-icon-btn"
                aria-label={ui("formClose")}
                onClick={e => {
                  e.stopPropagation();
                  setOpen(false);
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="contact-modal-inner">
            <form className="contact-modal-form" onSubmit={onSubmit}>
              <div className="contact-modal-field">
                <label className="contact-modal-label" htmlFor="pf-name">
                  {ui("formName")}
                </label>
                <input id="pf-name" type="text" name="name" className="contact-modal-input" placeholder={ui("formNamePh")} required minLength={2} maxLength={120} autoComplete="name" autoFocus />
              </div>
              <div className="contact-modal-field">
                <label className="contact-modal-label" htmlFor="pf-email">
                  {ui("formEmail")}
                </label>
                <input id="pf-email" type="email" name="email" className="contact-modal-input" placeholder={ui("formEmailPh")} required maxLength={200} autoComplete="email" />
              </div>
              <div className="contact-modal-field contact-modal-field--grow">
                <label className="contact-modal-label" htmlFor="pf-message">
                  {ui("formMessage")}
                </label>
                <textarea id="pf-message" rows={6} name="message" className="contact-modal-input" placeholder={ui("formMessagePh")} required minLength={10} maxLength={5000} />
              </div>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
              <button type="submit" className="contact-modal-submit" disabled={status === "submitting"}>
                {status === "submitting" ? ui("formSending") : status === "success" ? ui("formSent") : ui("formSubmit")}
              </button>
              {status === "error" && <div className="contact-modal-error">{errorText || ui("formError")}</div>}
            </form>
          </div>
        </div>
      )}

      {success && (
        <div className="success-modal-overlay" onClick={() => setSuccess(false)}>
          <div className="success-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <button className="success-modal-close" onClick={() => setSuccess(false)} aria-label={ui("formClose")}>
              <X size={20} />
            </button>
            <div className="success-modal-icon">✓</div>
            <h3 className="success-modal-title">{ui("successTitle")}</h3>
            <p className="success-modal-text">{ui("successText")}</p>
            <button className="success-modal-btn" onClick={() => setSuccess(false)}>
              {ui("successBtn")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Tech name → logo, built from the capabilities section so the admin manages it in one place. */
function useTechLogos() {
  const { content } = useContent();
  const map = new Map<string, string>();
  content?.sections.forEach(s => s.settings.tech?.forEach(x => x.icon && map.set(x.name.toLowerCase(), x.icon)));
  return map;
}

function primaryLink(p: Project) {
  return p.demoUrl || p.repoUrl || p.links.find(l => l.url)?.url || "";
}

export function ArchiveSection({ section }: { section: Section }) {
  const { content } = useContent();
  const { t, ui } = useT();
  const logos = useTechLogos();
  const projects = filterProjects(content?.projects ?? [], section.settings.projectFilter ?? "technical");
  const [open, setOpen] = useState<Project | null>(null);
  return (
    <section className="archive-section" id={section.anchor || undefined}>
      <Reveal>
        <div className="archive-header">
          <div className="archive-header-left">
            {t(section.label) && <div className="section-label">{t(section.label)}</div>}
            <SectionTitle text={t(section.title)} />
            {t(section.description) && <p className="archive-description">{t(section.description)}</p>}
          </div>
        </div>
      </Reveal>
      <Reveal delay={100}>
        <div className="archive-list">
          {projects.length === 0 && <p className="pf-empty">{ui("emptySection")}</p>}
          {projects.map((p, i) => (
            <a
              key={p.id}
              href={primaryLink(p) || "#"}
              className="archive-row"
              onClick={e => {
                e.preventDefault();
                setOpen(p);
              }}
            >
              <span className="archive-row-num">{String(i + 1).padStart(2, "0")}</span>
              <div className="archive-row-main">
                <div className="archive-row-title">{t(p.title)}</div>
                <div className="archive-row-desc">{t(p.description)}</div>
                <div className="archive-row-tags">
                  {t(p.category) && <span className="archive-row-category">{t(p.category)}</span>}
                  <div className="archive-row-tech">
                    {p.tech.map(x => {
                      const logo = logos.get(x.toLowerCase());
                      return (
                        <span key={x} className="archive-tag">
                          {logo ? <img src={logo} alt={x} className="archive-tag-img" /> : x}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
              <span className="archive-row-action">
                <ArrowUpRight size={16} />
              </span>
            </a>
          ))}
        </div>
      </Reveal>
      {open && <ProjectModal project={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

export function DigitalSection({ section }: { section: Section }) {
  const { content } = useContent();
  const { t, ui } = useT();
  const projects = filterProjects(content?.projects ?? [], section.settings.projectFilter ?? "digital");
  const [hero, ...rest] = projects;
  const [open, setOpen] = useState<Project | null>(null);
  return (
    <section className="digital-section" id={section.anchor || undefined}>
      <Reveal>
        <div className="digital-header">
          {t(section.label) && <div className="section-label">{t(section.label)}</div>}
          <SectionTitle text={t(section.title)} />
          {t(section.description) && <div className="section-desc">{t(section.description)}</div>}
        </div>
      </Reveal>
      {!hero && <p className="pf-empty">{ui("emptySection")}</p>}
      {hero && (
        <Reveal delay={100}>
          <div className="digital-card digital-card--hero" onClick={() => setOpen(hero)} role="button" tabIndex={0} onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(hero); }
          }}>
            <div className="digital-image-wrap digital-image-wrap--hero">
              {hero.cover && <img src={hero.cover} alt={t(hero.coverAlt) || t(hero.title)} className="digital-image" loading="lazy" />}
            </div>
            <div className="digital-content digital-content--hero">
              <span className="digital-hero-num" aria-hidden="true">
                01
              </span>
              <h3 className="digital-title">{t(hero.title)}</h3>
              <p className="digital-desc">{t(hero.description)}</p>
            </div>
          </div>
        </Reveal>
      )}
      {rest.length > 0 && (
        <Reveal delay={100}>
          <div className="digital-grid">
            {rest.map((p, i) => (
              <div key={p.id} className="digital-card" onClick={() => setOpen(p)} role="button" tabIndex={0} onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(p); }
              }}>
                <div className="digital-image-wrap">
                  {p.cover && <img src={p.cover} alt={t(p.coverAlt) || t(p.title)} className="digital-image" loading="lazy" />}
                </div>
                <div className="digital-content digital-content--grid">
                  <span className="digital-grid-num" aria-hidden="true">
                    {String(i + 2).padStart(2, "0")}
                  </span>
                  <h3 className="digital-title">{t(p.title)}</h3>
                  <p className="digital-desc">{t(p.description)}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      )}
      {open && <ProjectModal project={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

export function CtaSection({ section }: { section: Section }) {
  const { t } = useT();
  const s = section.settings;
  return (
    <section className="work-cta" id={section.anchor || undefined}>
      <div className="work-cta-inner">
        <Reveal>
          <div className="work-cta-eyebrow">{t(s.eyebrow)}</div>
        </Reveal>
        <Reveal delay={150}>
          <div className="work-cta-main">
            <h2 className="work-cta-heading">{t(s.headline)}</h2>
            {s.buttonHref && (
              <SmartLink href={s.buttonHref} className="work-cta-button">
                {t(s.buttonLabel)}
              </SmartLink>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
