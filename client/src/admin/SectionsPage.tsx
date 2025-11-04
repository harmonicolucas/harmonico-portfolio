import { useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, Copy, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { newId, SECTION_STYLE_LABELS, SECTION_STYLES, type Item, type Section, type SectionStyle } from "@shared/content";
import { move, useEditor } from "./editor";
import {
  ConfirmButton,
  EMPTY_L,
  IconField,
  LField,
  LinksField,
  MediaField,
  MediaListField,
  ReviewBadge,
  ReviewField,
  SelectField,
  SortableList,
  SwitchField,
  TagsField,
  TextField,
} from "./fields";

const PAGE_LABEL = { home: "Página inicial", work: "Página de projectos" } as const;

/** Which item fields each section style uses. */
const ITEM_FIELDS: Partial<Record<SectionStyle, (keyof Item)[]>> = {
  capabilities: ["icon", "title", "description", "tags", "images"],
  recognition: ["icon", "title", "org", "date", "value", "url"],
  timeline: ["title", "subtitle", "org", "date", "description", "images", "video", "links", "url", "imageLeft"],
  contact: ["icon", "title", "value", "url"],
  text: ["title", "description", "images"],
};

const ITEM_LABELS: Partial<Record<SectionStyle, string>> = {
  capabilities: "Cartões de competências",
  recognition: "Certificações / reconhecimentos",
  timeline: "Entradas do percurso",
  contact: "Cartões de contacto",
  text: "Blocos",
};

function blankItem(): Item {
  return {
    id: newId("it"),
    enabled: true,
    review: false,
    note: "",
    title: { pt: "Novo elemento", en: "New item" },
    subtitle: EMPTY_L,
    org: EMPTY_L,
    date: EMPTY_L,
    description: EMPTY_L,
    value: "",
    url: "",
    icon: "award",
    iconImage: "",
    tags: [],
    images: [],
    video: "",
    links: [],
    imageLeft: false,
  };
}

function blankSection(style: SectionStyle, page: "home" | "work"): Section {
  const base: Section = {
    id: newId("sec"),
    style,
    page,
    anchor: "",
    enabled: false,
    review: false,
    note: "",
    label: { pt: "Nova secção", en: "New section" },
    title: { pt: "Título da secção", en: "Section title" },
    description: EMPTY_L,
    settings: {},
    items: [],
  };
  if (style === "gallery") base.settings = { projectFilter: "featured", linkLabel: { pt: "Ver projecto →", en: "View Project →" } };
  if (style === "archive") base.settings = { projectFilter: "technical" };
  if (style === "digital") base.settings = { projectFilter: "digital" };
  if (style === "capabilities") base.settings = { tech: [] };
  if (style === "cta") base.settings = { eyebrow: EMPTY_L, headline: { pt: "Vamos conversar.", en: "Let's talk." }, buttonLabel: { pt: "Contacte-me →", en: "Contact me →" }, buttonHref: "/#contacto" };
  if (style === "hero") base.settings = { marquee: "NOME", scrollLabel: { pt: "Deslize para baixo", en: "Scroll Down" } };
  return base;
}

export function sectionName(s: Section) {
  return s.title.pt || s.label.pt || s.settings.headline?.pt?.replace(/\n/g, " ") || s.settings.marquee || s.id;
}

export function SectionsPage() {
  const { draft, update } = useEditor();
  const [creating, setCreating] = useState(false);
  const [style, setStyle] = useState<SectionStyle>("text");
  const [page, setPage] = useState<"home" | "work">("home");
  const [, navigate] = useLocation();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Secções</h1>
          <p className="text-sm text-muted-foreground">Active, desactive, reordene ou crie secções. O design de cada estilo é sempre o do website de referência.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Nova secção
        </Button>
      </div>

      {(["home", "work"] as const).map(pg => {
        const list = draft.sections.map((s, idx) => ({ s, idx })).filter(x => x.s.page === pg);
        return (
          <Card key={pg}>
            <CardHeader>
              <CardTitle className="text-base">{PAGE_LABEL[pg]}</CardTitle>
              <CardDescription>{pg === "home" ? "Endereços: / (PT) e /en (EN)" : "Endereços: /projectos (PT) e /en/projects (EN)"}</CardDescription>
            </CardHeader>
            <CardContent>
              <SortableList
                items={list.map(x => ({ id: x.s.id, ...x }))}
                onReorder={(from, to) =>
                  update(d => {
                    const fromIdx = list[from]!.idx;
                    const toIdx = list[to]!.idx;
                    move(d.sections, fromIdx, toIdx);
                  })
                }
                render={({ s, idx }, _i, handle) => (
                  <div className={cn("flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3", !s.enabled && "opacity-60")}>
                    {handle}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{sectionName(s)}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {SECTION_STYLE_LABELS[s.style].split(" (")[0]}
                        </Badge>
                        {s.anchor && <span className="font-mono text-xs text-muted-foreground">#{s.anchor}</span>}
                        <ReviewBadge show={s.review || s.items.some(i => i.review)} />
                      </div>
                      <p className="text-xs text-muted-foreground">{s.items.length > 0 ? `${s.items.filter(i => i.enabled).length}/${s.items.length} elementos visíveis` : SECTION_STYLE_LABELS[s.style]}</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      {s.enabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      <Switch checked={s.enabled} onCheckedChange={v => update(d => void (d.sections[idx]!.enabled = v))} aria-label="Visível" />
                    </label>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/seccoes/${s.id}`)}>
                      <Pencil className="size-4" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Duplicar"
                      onClick={() =>
                        update(d => {
                          const copy = structuredClone(d.sections[idx]!);
                          copy.id = newId("sec");
                          copy.anchor = copy.anchor ? `${copy.anchor}-2` : "";
                          copy.enabled = false;
                          copy.items.forEach(it => (it.id = newId("it")));
                          d.sections.splice(idx + 1, 0, copy);
                        })
                      }
                    >
                      <Copy className="size-4" />
                    </Button>
                    <ConfirmButton
                      title={`Eliminar a secção «${sectionName(s)}»?`}
                      description="A secção e todos os seus elementos serão removidos do rascunho. Pode recuperar uma versão anterior no Histórico."
                      onConfirm={() => update(d => void d.sections.splice(idx, 1))}
                    >
                      <Trash2 className="size-4" />
                    </ConfirmButton>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova secção</DialogTitle>
            <DialogDescription>Escolha o estilo visual. A secção é criada oculta para que a possa preencher antes de a mostrar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <SelectField label="Página" value={page} onChange={setPage} options={[{ value: "home", label: PAGE_LABEL.home }, { value: "work", label: PAGE_LABEL.work }]} />
            <SelectField label="Estilo" value={style} onChange={setStyle} options={SECTION_STYLES.map(s => ({ value: s, label: SECTION_STYLE_LABELS[s] }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const s = blankSection(style, page);
                update(d => void d.sections.push(s));
                setCreating(false);
                toast.success("Secção criada (oculta). Preencha-a e active-a quando estiver pronta.");
                navigate(`/admin/seccoes/${s.id}`);
              }}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemEditor({ style, item, onChange }: { style: SectionStyle; item: Item; onChange: (patch: Partial<Item>) => void }) {
  const f = ITEM_FIELDS[style] ?? ["title", "description"];
  const has = (k: keyof Item) => f.includes(k);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {has("icon") && <IconField label={style === "recognition" ? "Ícone (usado se não houver imagem)" : "Ícone"} value={item.icon} onChange={icon => onChange({ icon })} />}
        <SwitchField label="Visível no site" checked={item.enabled} onChange={enabled => onChange({ enabled })} />
      </div>
      {style === "recognition" && (
        <MediaField
          label="Ícone personalizado"
          value={item.iconImage}
          onChange={iconImage => onChange({ iconImage })}
          hint="Logótipo da certificação. Quando existir, substitui o ícone da lista no site."
        />
      )}
      <LField label={style === "contact" ? "Etiqueta (ex.: E-mail)" : "Título"} value={item.title} onChange={title => onChange({ title })} />
      {has("subtitle") && <LField label="Subtítulo" value={item.subtitle} onChange={subtitle => onChange({ subtitle })} />}
      {(has("org") || has("date")) && (
        <div className="grid gap-4 md:grid-cols-2">
          {has("org") && <LField label="Entidade / local" value={item.org} onChange={org => onChange({ org })} />}
          {has("date") && <LField label="Data / período (e validade)" value={item.date} onChange={date => onChange({ date })} />}
        </div>
      )}
      {has("description") && <LField label="Descrição" multiline rows={4} value={item.description} onChange={description => onChange({ description })} />}
      {has("tags") && <TagsField label="Competências (etiquetas)" value={item.tags} onChange={tags => onChange({ tags })} />}
      {(has("value") || has("url")) && (
        <div className="grid gap-4 md:grid-cols-2">
          {has("value") && (
            <TextField
              label={style === "recognition" ? "ID da credencial" : "Valor apresentado"}
              value={item.value}
              onChange={value => onChange({ value })}
              placeholder={style === "contact" ? "ex.: nome@exemplo.com" : ""}
            />
          )}
          {has("url") && (
            <TextField
              label={style === "recognition" ? "Ligação para a credencial" : style === "timeline" ? "Ligação para certificado/documento" : "Ligação"}
              url
              value={item.url}
              onChange={url => onChange({ url })}
              placeholder={style === "contact" ? "mailto:… ou https://…" : "https://…"}
            />
          )}
        </div>
      )}
      {has("images") && (
        <MediaListField
          label={style === "capabilities" ? "Ilustração (opcional, substitui a animação)" : "Fotografias e vídeos"}
          max={style === "capabilities" ? 1 : 30}
          value={item.images}
          onChange={images => onChange({ images })}
          hint={style === "timeline" ? "As fotografias aparecem empilhadas; clique para alternar no site." : undefined}
        />
      )}
      {has("video") && <MediaField label="Vídeo (ficheiro ou ligação)" kind="video" value={item.video} onChange={video => onChange({ video })} />}
      {has("links") && <LinksField value={item.links} onChange={links => onChange({ links })} />}
      {has("imageLeft") && <SwitchField label="Fotografias à esquerda" hint="Alterna o lado da imagem, como no site de referência." checked={item.imageLeft} onChange={imageLeft => onChange({ imageLeft })} />}
      <ReviewField review={item.review} note={item.note} onChange={v => onChange(v)} />
    </div>
  );
}

function ItemsEditor({ section, sIdx }: { section: Section; sIdx: number }) {
  const { update } = useEditor();
  const [open, setOpen] = useState<string | null>(null);
  const label = ITEM_LABELS[section.style];
  if (!label) return null;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">{label}</CardTitle>
          <CardDescription>Arraste ou use as setas para reordenar.</CardDescription>
        </div>
        <Button
          size="sm"
          onClick={() => {
            const it = blankItem();
            if (section.style === "contact") it.icon = "globe";
            update(d => void d.sections[sIdx]!.items.push(it));
            setOpen(it.id);
          }}
        >
          <Plus className="size-4" /> Adicionar
        </Button>
      </CardHeader>
      <CardContent>
        <SortableList
          items={section.items}
          onReorder={(from, to) => update(d => move(d.sections[sIdx]!.items, from, to))}
          render={(it, i, handle) => (
            <div className={cn("rounded-lg border bg-card", !it.enabled && "opacity-70")}>
              <div className="flex flex-wrap items-center gap-2 p-3">
                {handle}
                <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setOpen(open === it.id ? null : it.id)}>
                  {open === it.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  <span className="truncate font-medium">{it.title.pt || it.title.en || "(sem título)"}</span>
                  {!it.enabled && <Badge variant="outline">Oculto</Badge>}
                  <ReviewBadge show={it.review} />
                </button>
                <Switch checked={it.enabled} onCheckedChange={v => update(d => void (d.sections[sIdx]!.items[i]!.enabled = v))} aria-label="Visível" />
                <ConfirmButton title={`Eliminar «${it.title.pt || "elemento"}»?`} onConfirm={() => update(d => void d.sections[sIdx]!.items.splice(i, 1))}>
                  <Trash2 className="size-4" />
                </ConfirmButton>
              </div>
              {open === it.id && (
                <div className="border-t p-4">
                  <ItemEditor style={section.style} item={it} onChange={patch => update(d => Object.assign(d.sections[sIdx]!.items[i]!, patch))} />
                </div>
              )}
            </div>
          )}
        />
      </CardContent>
    </Card>
  );
}

function StyleSettings({ section, sIdx }: { section: Section; sIdx: number }) {
  const { update } = useEditor();
  const s = section.settings;
  const set = (patch: Partial<Section["settings"]>) => update(d => Object.assign(d.sections[sIdx]!.settings, patch));
  const filter = (
    <SelectField
      label="Projectos apresentados"
      value={s.projectFilter ?? "all"}
      onChange={v => set({ projectFilter: v })}
      options={[
        { value: "featured", label: "Apenas destacados" },
        { value: "technical", label: "Técnicos" },
        { value: "digital", label: "Digitais" },
        { value: "all", label: "Todos" },
      ]}
      hint="Os projectos são geridos no separador Projectos."
    />
  );

  switch (section.style) {
    case "hero":
      return (
        <>
          <TextField label="Nome em movimento (marquee)" value={s.marquee} onChange={marquee => set({ marquee })} hint="Texto grande que desliza atrás da fotografia." />
          <MediaField label="Fotografia (PNG/WEBP com fundo transparente recomendado)" value={s.image} onChange={image => set({ image })} />
          <LField label="Texto alternativo da fotografia" value={s.imageAlt} onChange={imageAlt => set({ imageAlt })} />
          <LField label="Indicador «deslize para baixo»" value={s.scrollLabel} onChange={scrollLabel => set({ scrollLabel })} />
          <SwitchField label="Mostrar texto de apresentação no hero" hint="Desligado no website de referência." checked={s.showText} onChange={showText => set({ showText })} />
          {s.showText && (
            <>
              <LField label="Nome" value={s.heroName} onChange={heroName => set({ heroName })} />
              <LField label="Título profissional" value={s.heroSubtitle} onChange={heroSubtitle => set({ heroSubtitle })} />
              <LField label="Apresentação breve" multiline value={s.heroStatement} onChange={heroStatement => set({ heroStatement })} />
            </>
          )}
        </>
      );
    case "gallery":
      return (
        <>
          {filter}
          <div className="grid gap-4 md:grid-cols-2">
            <LField label="Texto do botão" value={s.buttonLabel} onChange={buttonLabel => set({ buttonLabel })} />
            <TextField label="Destino do botão" url value={s.buttonHref} onChange={buttonHref => set({ buttonHref })} hint="ex.: /projectos" />
          </div>
          <LField label="Texto da ligação do projecto" value={s.linkLabel} onChange={linkLabel => set({ linkLabel })} />
        </>
      );
    case "archive":
    case "digital":
      return filter;
    case "capabilities":
      return <TechEditor section={section} sIdx={sIdx} />;
    case "about":
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <MediaField label="Fotografia de perfil" value={s.image} onChange={image => set({ image })} />
            <div className="space-y-4">
              <TextField label="Nome apresentado" value={s.name} onChange={name => set({ name })} />
              <SwitchField label="Selo de verificação" checked={s.verified} onChange={verified => set({ verified })} />
            </div>
          </div>
          <LField label="Texto alternativo da fotografia" value={s.imageAlt} onChange={imageAlt => set({ imageAlt })} />
          <LField label="Biografia" multiline rows={7} value={s.bio} onChange={bio => set({ bio })} hint="Separe parágrafos com uma linha em branco." />
          <div className="grid gap-4 md:grid-cols-2">
            <LField label="Frase antes da ligação do CV" value={s.description} onChange={description => set({ description })} />
            <LField label="Texto da ligação do CV" value={s.resumeLabel} onChange={resumeLabel => set({ resumeLabel })} />
          </div>
          <PairsEditor
            title="Estatísticas (máx. 6)"
            max={6}
            items={s.stats ?? []}
            onChange={stats => set({ stats })}
            make={() => ({ id: newId("st"), label: EMPTY_L, value: EMPTY_L })}
            fields={[
              ["label", "Etiqueta"],
              ["value", "Valor"],
            ]}
          />
          <LField label="Etiqueta «Actualmente»" value={s.currentlyLabel} onChange={currentlyLabel => set({ currentlyLabel })} />
          <PairsEditor
            title="Actualmente (máx. 6)"
            max={6}
            items={s.currently ?? []}
            onChange={currently => set({ currently })}
            make={() => ({ id: newId("cu"), icon: "code", label: EMPTY_L, detail: EMPTY_L })}
            fields={[
              ["label", "Acção"],
              ["detail", "Detalhe"],
            ]}
            withIcon
          />
          <LField label="Etiqueta dos cartões de traços" value={s.traitsLabel} onChange={traitsLabel => set({ traitsLabel })} />
          <TraitsEditor value={s.traits ?? []} onChange={traits => set({ traits })} />
        </>
      );
    case "recognition":
      return (
        <MediaField
          label="Colagem de fotografias (à esquerda da lista)"
          value={s.collage?.[0]?.url}
          onChange={url => set({ collage: url ? [{ url, type: "image", alt: s.collage?.[0]?.alt ?? EMPTY_L, caption: EMPTY_L }] : [] })}
          hint="Imagem de proporção 3:2 (ex.: 1920×1280)."
        />
      );
    case "contact":
      return (
        <>
          <LField label="Pré-título" value={s.eyebrow} onChange={eyebrow => set({ eyebrow })} />
          <LField label="Título grande (uma palavra por linha)" multiline rows={3} value={s.headline} onChange={headline => set({ headline })} />
          <LField label="Palavra em destaque (deve coincidir com uma linha)" value={s.headlineAccent} onChange={headlineAccent => set({ headlineAccent })} />
          <LField label="Descrição" value={s.description} onChange={description => set({ description })} />
          <LField label="Texto secundário" multiline value={s.secondary} onChange={secondary => set({ secondary })} />
          <div className="grid gap-4 md:grid-cols-2">
            <LField label="Botão do CV" value={s.resumeLabel} onChange={resumeLabel => set({ resumeLabel })} />
            <LField label="Botão do formulário" value={s.formLabel} onChange={formLabel => set({ formLabel })} />
          </div>
        </>
      );
    case "cta":
      return (
        <>
          <LField label="Pré-título" value={s.eyebrow} onChange={eyebrow => set({ eyebrow })} />
          <LField label="Título" value={s.headline} onChange={headline => set({ headline })} />
          <div className="grid gap-4 md:grid-cols-2">
            <LField label="Texto do botão" value={s.buttonLabel} onChange={buttonLabel => set({ buttonLabel })} />
            <TextField label="Destino do botão" url value={s.buttonHref} onChange={buttonHref => set({ buttonHref })} />
          </div>
        </>
      );
    default:
      return null;
  }
}

function PairsEditor<T extends { id: string; label: { pt: string; en: string }; icon?: string } & Record<string, unknown>>({
  title,
  items,
  onChange,
  make,
  fields,
  max,
  withIcon = false,
}: {
  title: string;
  items: T[];
  onChange: (v: T[]) => void;
  make: () => T;
  fields: [keyof T & string, string][];
  max: number;
  withIcon?: boolean;
}) {
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
        <Button type="button" size="sm" variant="outline" disabled={items.length >= max} onClick={() => onChange([...items, make()])}>
          <Plus className="size-4" /> Adicionar
        </Button>
      </div>
      <SortableList
        items={items}
        onReorder={(from, to) => {
          const n = [...items];
          move(n, from, to);
          onChange(n);
        }}
        render={(it, i, handle) => (
          <div className="flex flex-col gap-2 rounded-md border bg-card p-2 md:flex-row md:items-end">
            {handle}
            {withIcon && (
              <div className="md:w-44">
                <IconField value={String(it.icon ?? "code")} onChange={icon => onChange(items.map((x, j) => (j === i ? { ...x, icon } : x)))} />
              </div>
            )}
            {fields.map(([k, lbl]) => (
              <LField key={k} className="flex-1" label={lbl} value={it[k] as never} onChange={v => onChange(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)))} />
            ))}
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remover">
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      />
    </div>
  );
}

function TraitsEditor({ value, onChange }: { value: { pt: string; en: string }[]; onChange: (v: { pt: string; en: string }[]) => void }) {
  const items = value.map((v, i) => ({ id: `t${i}`, v }));
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Traços (cartões animados, máx. 20)</span>
        <Button type="button" size="sm" variant="outline" disabled={value.length >= 20} onClick={() => onChange([...value, { pt: "", en: "" }])}>
          <Plus className="size-4" /> Adicionar
        </Button>
      </div>
      <SortableList
        items={items}
        onReorder={(from, to) => {
          const n = [...value];
          move(n, from, to);
          onChange(n);
        }}
        render={({ v }, i, handle) => (
          <div className="flex items-end gap-2 rounded-md border bg-card p-2">
            {handle}
            <LField className="flex-1" label={`Traço ${i + 1}`} value={v} onChange={nv => onChange(value.map((x, j) => (j === i ? nv : x)))} />
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remover">
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      />
    </div>
  );
}

function TechEditor({ section, sIdx }: { section: Section; sIdx: number }) {
  const { update } = useEditor();
  const tech = section.settings.tech ?? [];
  const setTech = (fn: (t: NonNullable<Section["settings"]["tech"]>) => void) =>
    update(d => {
      const s = d.sections[sIdx]!.settings;
      s.tech = s.tech ?? [];
      fn(s.tech);
    });
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pilha tecnológica ({tech.length})</span>
          <p className="mt-1 text-xs text-muted-foreground">Active «Novo grupo» e escreva o segmento, por exemplo Frontend. As tecnologias seguintes ficam nesse segmento até ao próximo.</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setTech(t => void t.push({ id: newId("t"), name: "Nova tecnologia", icon: "", review: false, breakBefore: false, group: { ...EMPTY_L } }))}>
          <Plus className="size-4" /> Adicionar
        </Button>
      </div>
      <SortableList
        items={tech}
        onReorder={(from, to) => setTech(t => move(t, from, to))}
        render={(t, i, handle) => (
          <div className={cn("flex flex-col gap-3 rounded-md border bg-card p-2 md:flex-row md:items-center", t.review && "border-amber-300")}>
            {handle}
            <TextField className="md:w-40" label="Nome" value={t.name} onChange={name => setTech(x => void (x[i]!.name = name))} />
            {(i === 0 || t.breakBefore) && (
              <LField
                className="md:w-64"
                label="Segmento"
                value={t.group ?? EMPTY_L}
                onChange={group => setTech(x => void (x[i]!.group = group))}
              />
            )}
            <div className="flex-1">
              <MediaField label="Logótipo" value={t.icon} onChange={icon => setTech(x => void (x[i]!.icon = icon))} />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={i === 0 || !!t.breakBefore} disabled={i === 0} onCheckedChange={v => setTech(x => void (x[i]!.breakBefore = v))} /> Novo grupo
            </label>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={t.review} onCheckedChange={v => setTech(x => void (x[i]!.review = v))} /> A rever
            </label>
            <Button type="button" variant="ghost" size="icon" onClick={() => setTech(x => void x.splice(i, 1))} aria-label="Remover">
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      />
    </div>
  );
}

export function SectionEditorPage({ id }: { id: string }) {
  const { draft, update } = useEditor();
  const sIdx = draft.sections.findIndex(s => s.id === id);
  const section = draft.sections[sIdx];
  if (!section) {
    return (
      <div className="space-y-4">
        <p>Secção não encontrada.</p>
        <Link href="/admin/seccoes" className="text-sm underline">
          Voltar às secções
        </Link>
      </div>
    );
  }
  const set = (patch: Partial<Section>) => update(d => Object.assign(d.sections[sIdx]!, patch));
  const hasHeading = !["hero", "contact", "cta"].includes(section.style);
  const anchorClash = section.anchor && draft.sections.some(s => s.id !== section.id && s.page === section.page && s.anchor === section.anchor);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/seccoes">
            <ArrowLeft className="size-4" /> Secções
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{sectionName(section)}</h1>
        <Badge variant="secondary">{SECTION_STYLE_LABELS[section.style]}</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Geral</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <SwitchField label="Secção visível" checked={section.enabled} onChange={enabled => set({ enabled })} />
            <SelectField
              label="Página"
              value={section.page}
              onChange={page => set({ page })}
              options={[
                { value: "home", label: PAGE_LABEL.home },
                { value: "work", label: PAGE_LABEL.work },
              ]}
            />
            <TextField
              label="Âncora (endereço #)"
              value={section.anchor}
              onChange={anchor => set({ anchor: anchor.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
              hint={anchorClash ? <span className="text-destructive">Já existe outra secção com esta âncora.</span> : "Usada nas ligações do menu, ex.: /#contacto"}
            />
          </div>
          {hasHeading && (
            <>
              <LField label="Etiqueta (texto pequeno acima do título)" value={section.label} onChange={label => set({ label })} />
              <LField label="Título" value={section.title} onChange={title => set({ title })} hint={section.style === "about" ? "Use uma quebra de linha (\\n) para o telemóvel." : undefined} multiline={section.style === "about"} rows={2} />
              <LField label="Descrição" multiline value={section.description} onChange={description => set({ description })} />
            </>
          )}
          <ReviewField review={section.review} note={section.note} onChange={v => set(v)} />
        </CardContent>
      </Card>
      {["hero", "gallery", "archive", "digital", "capabilities", "about", "recognition", "contact", "cta"].includes(section.style) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conteúdo específico do estilo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StyleSettings section={section} sIdx={sIdx} />
          </CardContent>
        </Card>
      )}
      <ItemsEditor section={section} sIdx={sIdx} />
    </div>
  );
}
