import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Item, Section } from "@shared/content";
import { useContent, useT } from "../content";
import { BENTO_VISUALS, Icon } from "../icons";
import { Reveal, SectionTitle, STACK_OFFSETS, stackImageStyle, useIsMobile } from "../motion";
import { VideoPlayer } from "./HeroGallery";

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function techGroups<T extends { breakBefore?: boolean }>(list: T[]): T[][] {
  if (!list.some(item => item.breakBefore)) return chunk(list, 5);
  const groups: T[][] = [];
  for (const item of list) {
    if (groups.length === 0 || item.breakBefore) groups.push([item]);
    else groups[groups.length - 1]!.push(item);
  }
  return groups.filter(group => group.length > 0);
}

export function CapabilitiesSection({ section }: { section: Section }) {
  const { t, ui } = useT();
  const tech = section.settings.tech ?? [];
  const cards = section.items.filter(i => i.enabled);
  return (
    <section id={section.anchor || undefined} className="section">
      <div className="what-i-can-do-grid">
        <div className="what-i-can-do-left">
          <Reveal>
            {t(section.label) && <div className="section-label">{t(section.label)}</div>}
            <SectionTitle text={t(section.title)} />
            {t(section.description) && <p className="what-i-can-do-desc">{t(section.description)}</p>}
            {tech.length > 0 && (
              <div className="tech-stack">
                {techGroups(tech).map((col, ci) => {
                  const heading = t(col[0]?.group);
                  return (
                    <div key={ci} className="tech-stack-group">
                      {heading && <h3 className="tech-stack-heading">{heading}</h3>}
                      <div className="tech-stack-icons">
                        {col.map(x => (
                          <div key={x.id} className="tech-stack-item">
                            {x.icon && <img src={x.icon} alt={x.name} draggable={false} loading="lazy" />}
                            <span className="tech-stack-label">{x.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Reveal>
        </div>
        <div className="what-i-can-do-right">
          {cards.length === 0 && <p className="pf-empty">{ui("emptySection")}</p>}
          {cards.map((card, i) => {
            const visual = card.images[0]?.url || BENTO_VISUALS[card.icon] || BENTO_VISUALS.code;
            return (
              <Reveal key={card.id} delay={150 + 120 * i}>
                <div className={`bento-card ${i === 0 ? "bento-large" : "bento-medium"}`}>
                  <div className="bento-header">
                    <div className="bento-number">{String(i + 1).padStart(2, "0")}</div>
                    <div className="bento-category">{t(card.title)}</div>
                  </div>
                  <div className="bento-visual">
                    <img src={visual} alt={t(card.images[0]?.alt) || t(card.title)} className="bento-gif" draggable={false} loading="lazy" />
                  </div>
                  <p className="bento-desc">{t(card.description)}</p>
                  <div className="bento-skills">
                    {card.tags.map(tag => (
                      <span key={tag} className="bento-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function AboutSection({ section }: { section: Section }) {
  const { content } = useContent();
  const { t, lang } = useT();
  const mobile = useIsMobile();
  const s = section.settings;
  const traits = (s.traits ?? []).map(x => t(x)).filter(Boolean);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const title = t(section.title);
  const cv = content?.settings.cv[lang] || content?.settings.cv[lang === "pt" ? "en" : "pt"] || "";

  useEffect(() => {
    if (paused || traits.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive(a => (a + 1) % traits.length), 1500);
    return () => clearInterval(id);
  }, [paused, traits.length]);

  return (
    <section id={section.anchor || undefined} className="section">
      <Reveal>
        {t(section.label) && <div className="section-label">{t(section.label)}</div>}
        <SectionTitle text={mobile ? title : title.replace(/\n/g, " ")} />
      </Reveal>
      <Reveal delay={100}>
        <div className="about-profile-card">
          <div className="about-profile-header">
            {s.image && (
              <div className="about-profile-image-wrapper">
                <img src={s.image} alt={t(s.imageAlt) || s.name} className="about-profile-image" loading="lazy" />
              </div>
            )}
            <div className="about-profile-info">
              <div className="about-profile-name">
                {s.name}
                {s.verified && <img src="/images/badge.png" alt="" className="about-profile-badge" />}
              </div>
              {(s.stats ?? []).length > 0 && (
                <div className="about-profile-stats">
                  {(s.stats ?? []).map(st => (
                    <div key={st.id} className="about-stat-item">
                      <span className="about-stat-label">{t(st.label).toUpperCase()}</span>
                      <span className="about-stat-value">{t(st.value)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="about-description">
                {t(s.bio)
                  .split(/\n{2,}/)
                  .map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                {cv && (
                  <p>
                    {t(s.description)}{" "}
                    <a href={cv} className="about-resume-link" target="_blank" rel="noopener noreferrer">
                      {t(s.resumeLabel)}
                    </a>
                    .
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="about-bottom-row">
            {(s.currently ?? []).length > 0 && (
              <div className="currently-strip">
                <div className="currently-strip-label">{t(s.currentlyLabel).toUpperCase()}</div>
                <div className="currently-strip-items">
                  {(s.currently ?? []).map(c => (
                    <div key={c.id} className="currently-item">
                      <span className="currently-icon">
                        <Icon name={c.icon} size={16} strokeWidth={2} />
                      </span>
                      <div className="currently-text">
                        <div className="currently-item-label">{t(c.label)}</div>
                        <div className="currently-item-detail">{t(c.detail)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {traits.length > 0 && (
              <div className="card-stack">
                <div
                  className="card-stack-container"
                  onClick={() => setActive(a => (a + 1) % traits.length)}
                  onMouseEnter={() => setPaused(true)}
                  onMouseLeave={() => setPaused(false)}
                >
                  {traits.map((trait, i) => {
                    const pos = (i - active + traits.length) % traits.length;
                    const last = pos === traits.length - 1;
                    if (pos > 2 && !last) return null;
                    const c = STACK_OFFSETS[i % STACK_OFFSETS.length]!;
                    const style = (
                      last && traits.length > 1
                        ? { "--tx": `${c.x + 140}px`, "--ty": `${c.y - 60}px`, "--rot": `${c.rot + 40}deg`, "--sc": 0.85, "--op": 0, zIndex: 5 }
                        : {
                            "--tx": `${c.x + 10 * pos}px`,
                            "--ty": `${c.y + 8 * pos}px`,
                            "--rot": `${c.rot + pos * (c.rot >= 0 ? 5 : -5)}deg`,
                            "--sc": 1 - 0.045 * pos,
                            "--op": pos === 0 ? 1 : 0.55 + (2 - pos) * 0.15,
                            zIndex: 30 - 10 * pos,
                          }
                    ) as React.CSSProperties;
                    return (
                      <div key={`${trait}-${i}`} className={`card-stack-card${pos === 0 ? " card-stack-card-front" : ""}`} style={style}>
                        <div className="card-stack-label">{t(s.traitsLabel).toUpperCase()}</div>
                        <div className="card-stack-value">{trait}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function RecognitionSection({ section }: { section: Section }) {
  const { t, ui } = useT();
  const items = section.items.filter(i => i.enabled);
  const collage = section.settings.collage?.[0];
  return (
    <section id={section.anchor || undefined} className="section">
      <Reveal>
        {t(section.label) && <div className="section-label">{t(section.label)}</div>}
        <SectionTitle text={t(section.title)} />
        {t(section.description) && <div className="section-desc">{t(section.description)}</div>}
      </Reveal>
      <Reveal delay={100}>
        <div className="awards-layout">
          {collage?.url && <img src={collage.url} alt={t(collage.alt)} className="awards-img" loading="lazy" />}
          <div className="awards-column">
            {items.length === 0 && <p className="pf-empty">{ui("emptySection")}</p>}
            {items.map(it => {
              const inner = (
                <>
                  <div className="award-icon">
                    {it.iconImage ? <img src={it.iconImage} alt="" className="award-icon-img" /> : <Icon name={it.icon || "award"} size={18} />}
                  </div>
                  <div className="award-title">
                    {t(it.title)}
                    {(t(it.org) || t(it.date)) && (
                      <span className="pf-award-meta">{[t(it.org), t(it.date)].filter(Boolean).join(" · ")}</span>
                    )}
                  </div>
                  {it.url && <ArrowUpRight size={12} style={{ marginLeft: "auto", flexShrink: 0 }} />}
                </>
              );
              return it.url ? (
                <a
                  key={it.id}
                  href={it.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="award-item"
                  title={it.value ? `${ui("credentialId")}: ${it.value}` : ui("credential")}
                >
                  {inner}
                </a>
              ) : (
                <div key={it.id} className="award-item">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function ImageStack({ item }: { item: Item }) {
  const { t } = useT();
  const images = item.images.filter(m => m.url && m.type === "image");
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;
  return (
    <div className="experience-image-stack" onClick={() => setActive(a => (a + 1) % images.length)}>
      {images.map((m, i) => {
        const style = stackImageStyle(i, active, images.length);
        if (!style) return null;
        const front = (i - active + images.length) % images.length === 0;
        return (
          <img
            key={m.url + i}
            src={m.url}
            alt={t(m.alt) || `${t(item.title)} ${i + 1}`}
            className={`stacked-image${front ? " stacked-image-front" : ""}`}
            style={style as React.CSSProperties}
            loading="lazy"
          />
        );
      })}
    </div>
  );
}

export function TimelineSection({ section }: { section: Section }) {
  const { t, ui } = useT();
  const items = section.items.filter(i => i.enabled);
  return (
    <section id={section.anchor || undefined} className="section">
      <Reveal>
        {t(section.label) && <div className="section-label">{t(section.label)}</div>}
        <SectionTitle text={t(section.title)} />
        {t(section.description) && <div className="section-desc">{t(section.description)}</div>}
      </Reveal>
      <div className="experience-list">
        {items.length === 0 && <p className="pf-empty">{ui("emptySection")}</p>}
        {items.map((it, idx) => {
          const links = [...it.links.filter(l => l.url), ...(it.url ? [{ id: "main", label: { pt: ui("credential"), en: ui("credential") }, url: it.url }] : [])];
          return (
            <Reveal key={it.id} delay={idx * 60}>
              <div className={`experience-card${it.imageLeft ? " experience-card-reverse" : ""}`}>
                <div className="experience-text">
                  <div className="experience-header">
                    <div className="experience-title">
                      {t(it.title)}
                      {t(it.subtitle) && <div className="experience-subtitle">{t(it.subtitle)}</div>}
                    </div>
                    {t(it.date) && <div className="experience-date">{t(it.date)}</div>}
                  </div>
                  {t(it.org) && <div className="experience-org">{t(it.org)}</div>}
                  {t(it.description) && <div className="experience-desc">{t(it.description)}</div>}
                  {it.video && (
                    <div style={{ marginTop: 16 }}>
                      <VideoPlayer url={it.video} title={ui("watchVideo")} />
                    </div>
                  )}
                  {links.length > 0 && (
                    <div>
                      {links.map(l => (
                        <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="experience-certificate">
                          {t(l.label)}
                          <ArrowUpRight size={12} style={{ marginLeft: 6 }} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <ImageStack item={it} />
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export function TextSection({ section }: { section: Section }) {
  const { t } = useT();
  return (
    <section id={section.anchor || undefined} className="section">
      <Reveal>
        {t(section.label) && <div className="section-label">{t(section.label)}</div>}
        {t(section.title) && <SectionTitle text={t(section.title)} />}
        <div className="pf-text-body">
          {t(section.description)
            .split(/\n{2,}/)
            .filter(Boolean)
            .map((p, i) => (
              <p key={i} className="section-desc" style={{ maxWidth: 760 }}>
                {p}
              </p>
            ))}
        </div>
      </Reveal>
      {section.items.filter(i => i.enabled).length > 0 && (
        <Reveal delay={100}>
          <div className="pf-text-items">
            {section.items
              .filter(i => i.enabled)
              .map(it => (
                <div key={it.id} className="pf-text-item">
                  <div className="experience-title">{t(it.title)}</div>
                  {t(it.description) && <div className="experience-desc">{t(it.description)}</div>}
                  {it.images[0]?.url && <img src={it.images[0].url} alt={t(it.images[0].alt)} loading="lazy" />}
                </div>
              ))}
          </div>
        </Reveal>
      )}
    </section>
  );
}
