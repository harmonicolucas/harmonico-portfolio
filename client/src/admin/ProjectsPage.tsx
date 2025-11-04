import { ArrowLeft, Copy, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { newId, type Project } from "@shared/content";
import { move, useEditor } from "./editor";
import { ConfirmButton, EMPTY_L, LField, LinksField, MediaField, MediaListField, ReviewBadge, ReviewField, SelectField, SortableList, SwitchField, TagsField, TextField } from "./fields";

function blankProject(): Project {
  return {
    id: newId("pj"),
    enabled: false,
    featured: true,
    review: false,
    note: "",
    kind: "technical",
    title: { pt: "Novo projecto", en: "New project" },
    category: EMPTY_L,
    date: EMPTY_L,
    description: EMPTY_L,
    tech: [],
    awards: [],
    cover: "",
    coverAlt: EMPTY_L,
    gallery: [],
    video: "",
    demoUrl: "",
    repoUrl: "",
    links: [],
  };
}

export function ProjectsPage() {
  const { draft, update } = useEditor();
  const [, navigate] = useLocation();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Projectos</h1>
          <p className="text-sm text-muted-foreground">
            A ordem desta lista é a ordem no site. Projectos «destacados» aparecem no álbum da página inicial; «técnicos» e «digitais» na página de projectos.
          </p>
        </div>
        <Button
          onClick={() => {
            const p = blankProject();
            update(d => void d.projects.push(p));
            toast.success("Projecto criado (oculto). Preencha-o e active-o quando estiver pronto.");
            navigate(`/admin/projectos/${p.id}`);
          }}
        >
          <Plus className="size-4" /> Novo projecto
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <SortableList
            items={draft.projects}
            empty="Ainda não existem projectos."
            onReorder={(from, to) => update(d => move(d.projects, from, to))}
            render={(p, i, handle) => (
              <div className={cn("flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3", !p.enabled && "opacity-60")}>
                {handle}
                <div className="h-12 w-20 shrink-0 overflow-hidden rounded bg-muted">{p.cover && <img src={p.cover} alt="" className="h-full w-full object-cover" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{p.title.pt || p.title.en}</span>
                    <Badge variant="secondary">{p.kind === "technical" ? "Técnico" : "Digital"}</Badge>
                    {p.featured && (
                      <Badge variant="outline">
                        <Star className="size-3" /> Destacado
                      </Badge>
                    )}
                    <ReviewBadge show={p.review} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{p.tech.join(" · ") || "Sem tecnologias"}</p>
                </div>
                <Switch checked={p.enabled} onCheckedChange={v => update(d => void (d.projects[i]!.enabled = v))} aria-label="Visível" />
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/projectos/${p.id}`)}>
                  <Pencil className="size-4" /> Editar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Duplicar"
                  onClick={() =>
                    update(d => {
                      const c = structuredClone(d.projects[i]!);
                      c.id = newId("pj");
                      c.enabled = false;
                      c.title = { pt: `${c.title.pt} (cópia)`, en: `${c.title.en} (copy)` };
                      d.projects.splice(i + 1, 0, c);
                    })
                  }
                >
                  <Copy className="size-4" />
                </Button>
                <ConfirmButton title={`Eliminar o projecto «${p.title.pt}»?`} description="O projecto será removido do rascunho. Os ficheiros permanecem na biblioteca de media." onConfirm={() => update(d => void d.projects.splice(i, 1))}>
                  <Trash2 className="size-4" />
                </ConfirmButton>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function ProjectEditorPage({ id }: { id: string }) {
  const { draft, update } = useEditor();
  const idx = draft.projects.findIndex(p => p.id === id);
  const p = draft.projects[idx];
  if (!p) {
    return (
      <div className="space-y-3">
        <p>Projecto não encontrado.</p>
        <Link href="/admin/projectos" className="text-sm underline">
          Voltar aos projectos
        </Link>
      </div>
    );
  }
  const set = (patch: Partial<Project>) => update(d => Object.assign(d.projects[idx]!, patch));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/projectos">
            <ArrowLeft className="size-4" /> Projectos
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{p.title.pt || "Projecto"}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Apresentação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <SwitchField label="Visível no site" checked={p.enabled} onChange={enabled => set({ enabled })} />
            <SwitchField label="Destacado na página inicial" checked={p.featured} onChange={featured => set({ featured })} />
            <SelectField
              label="Tipo"
              value={p.kind}
              onChange={kind => set({ kind })}
              options={[
                { value: "technical", label: "Técnico (arquivo)" },
                { value: "digital", label: "Digital (grelha)" },
              ]}
            />
          </div>
          <LField label="Título" value={p.title} onChange={title => set({ title })} />
          <div className="grid gap-4 md:grid-cols-2">
            <LField label="Categoria" value={p.category} onChange={category => set({ category })} />
            <LField label="Data / período" value={p.date} onChange={date => set({ date })} />
          </div>
          <LField label="Descrição" multiline rows={5} value={p.description} onChange={description => set({ description })} />
          <TagsField label="Tecnologias" value={p.tech} onChange={tech => set({ tech })} hint="Tecnologias com logótipo na secção de competências aparecem com o logótipo." />
          <ReviewField review={p.review} note={p.note} onChange={v => set(v)} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Imagens e vídeos</CardTitle>
          <CardDescription>A capa é usada no álbum, no arquivo e na grelha. A galeria aparece no detalhe do projecto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MediaField label="Imagem de capa (16:10 recomendado)" value={p.cover} onChange={cover => set({ cover })} />
          <LField label="Texto alternativo da capa" value={p.coverAlt} onChange={coverAlt => set({ coverAlt })} />
          <MediaListField label="Galeria" value={p.gallery} onChange={gallery => set({ gallery })} />
          <MediaField label="Vídeo principal (ficheiro ou ligação YouTube/Vimeo)" kind="video" value={p.video} onChange={video => set({ video })} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ligações e reconhecimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Demonstração" url value={p.demoUrl} onChange={demoUrl => set({ demoUrl })} placeholder="https://…" />
            <TextField label="Repositório GitHub" url value={p.repoUrl} onChange={repoUrl => set({ repoUrl })} placeholder="https://github.com/…" />
          </div>
          <LinksField label="Outras ligações" max={10} value={p.links} onChange={links => set({ links })} />
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prémios / distinções</span>
              <Button type="button" size="sm" variant="outline" disabled={p.awards.length >= 10} onClick={() => set({ awards: [...p.awards, EMPTY_L] })}>
                <Plus className="size-4" /> Adicionar
              </Button>
            </div>
            {p.awards.map((a, i) => (
              <div key={i} className="flex items-end gap-2">
                <LField className="flex-1" label={`Distinção ${i + 1}`} value={a} onChange={v => set({ awards: p.awards.map((x, j) => (j === i ? v : x)) })} />
                <Button type="button" variant="ghost" size="icon" onClick={() => set({ awards: p.awards.filter((_, j) => j !== i) })} aria-label="Remover">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
