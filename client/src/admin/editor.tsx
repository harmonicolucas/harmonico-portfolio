import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { findMissingTranslations, findReviewFlags, zContent, type SiteContent } from "@shared/content";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type EditorCtx = {
  draft: SiteContent;
  update: (mutator: (d: SiteContent) => void) => void;
  replace: (next: SiteContent) => void;
  saveState: SaveState;
  lastSavedAt: Date | null;
  validationErrors: string[];
  save: (opts?: { silent?: boolean }) => Promise<boolean>;
  publish: (note?: string) => Promise<boolean>;
  discard: () => Promise<void>;
  reload: () => Promise<void>;
  publishedAt: Date | null;
  publishedBy: string | null;
  hasUnpublishedChanges: boolean;
  missingTranslations: string[];
  reviewFlags: { path: string; label: string }[];
  unreadMessages: number;
  busy: boolean;
};

const Ctx = createContext<EditorCtx | null>(null);

function formatIssues(err: { issues: { path: PropertyKey[]; message: string }[] }) {
  return err.issues.slice(0, 12).map(i => `${i.path.map(String).join(" › ") || "documento"}: ${i.message}`);
}

export function EditorProvider({ initial, children }: { initial: { draft: SiteContent; publishedAt: Date | string | null; publishedBy: string | null; hasUnpublishedChanges: boolean; unreadMessages: number }; children: ReactNode }) {
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState<SiteContent>(initial.draft);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [publishedAt, setPublishedAt] = useState<Date | null>(initial.publishedAt ? new Date(initial.publishedAt) : null);
  const [publishedBy, setPublishedBy] = useState<string | null>(initial.publishedBy);
  const [hasUnpublished, setHasUnpublished] = useState(initial.hasUnpublishedChanges);
  const [busy, setBusy] = useState(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const versionRef = useRef(0);
  const savedVersionRef = useRef(0);

  const saveMut = trpc.portfolio.admin.saveDraft.useMutation();
  const publishMut = trpc.portfolio.admin.publish.useMutation();
  const discardMut = trpc.portfolio.admin.discardDraft.useMutation();
  const stateQuery = trpc.portfolio.admin.state.useQuery(undefined, { enabled: false });

  const update = useCallback((mutator: (d: SiteContent) => void) => {
    setDraft(prev => {
      const next = structuredClone(prev);
      mutator(next);
      return next;
    });
    versionRef.current += 1;
    setSaveState("dirty");
    setHasUnpublished(true);
  }, []);

  const replace = useCallback((next: SiteContent) => {
    setDraft(next);
    versionRef.current += 1;
    savedVersionRef.current = versionRef.current;
    setSaveState("idle");
  }, []);

  const save = useCallback(
    async (opts?: { silent?: boolean }) => {
      const version = versionRef.current;
      const parsed = zContent.safeParse(draftRef.current);
      if (!parsed.success) {
        const issues = formatIssues(parsed.error);
        setValidationErrors(issues);
        setSaveState("error");
        if (!opts?.silent) toast.error("Existem campos inválidos. Corrija-os antes de guardar.", { description: issues.slice(0, 3).join("\n") });
        return false;
      }
      setValidationErrors([]);
      setSaveState("saving");
      try {
        await saveMut.mutateAsync({ content: parsed.data });
        savedVersionRef.current = version;
        setLastSavedAt(new Date());
        setSaveState(versionRef.current === version ? "saved" : "dirty");
        if (!opts?.silent) toast.success("Rascunho guardado.");
        return true;
      } catch (e) {
        setSaveState("error");
        toast.error("Não foi possível guardar o rascunho.", { description: e instanceof Error ? e.message : undefined });
        return false;
      }
    },
    [saveMut],
  );

  // autosave the draft 2.5 s after the last change
  useEffect(() => {
    if (saveState !== "dirty") return;
    const id = setTimeout(() => {
      if (versionRef.current !== savedVersionRef.current) void save({ silent: true });
    }, 2500);
    return () => clearTimeout(id);
  }, [draft, saveState, save]);

  // warn before leaving with unsaved changes
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (versionRef.current !== savedVersionRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Ctrl/Cmd + S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const reload = useCallback(async () => {
    const res = await stateQuery.refetch();
    if (res.data) {
      replace(res.data.draft);
      setPublishedAt(res.data.publishedAt ? new Date(res.data.publishedAt) : null);
      setPublishedBy(res.data.publishedBy ?? null);
      setHasUnpublished(res.data.hasUnpublishedChanges);
    }
  }, [stateQuery, replace]);

  const publish = useCallback(
    async (note?: string) => {
      setBusy(true);
      try {
        const ok = await save({ silent: true });
        if (!ok) {
          toast.error("A publicação foi cancelada porque o rascunho tem erros.");
          return false;
        }
        await publishMut.mutateAsync({ note });
        setPublishedAt(new Date());
        setHasUnpublished(false);
        await utils.portfolio.content.invalidate();
        await utils.portfolio.admin.revisions.invalidate();
        toast.success("Alterações publicadas. A área pública já foi actualizada.");
        return true;
      } catch (e) {
        toast.error("Falha ao publicar.", { description: e instanceof Error ? e.message : undefined });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [save, publishMut, utils],
  );

  const discard = useCallback(async () => {
    setBusy(true);
    try {
      await discardMut.mutateAsync();
      await reload();
      setHasUnpublished(false);
      toast.success("Rascunho descartado. Foi reposta a versão publicada.");
    } catch (e) {
      toast.error("Não foi possível descartar o rascunho.", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }, [discardMut, reload]);

  const missingTranslations = useMemo(() => findMissingTranslations(draft), [draft]);
  const reviewFlags = useMemo(() => findReviewFlags(draft), [draft]);

  const value: EditorCtx = {
    draft,
    update,
    replace,
    saveState,
    lastSavedAt,
    validationErrors,
    save,
    publish,
    discard,
    reload,
    publishedAt,
    publishedBy,
    hasUnpublishedChanges: hasUnpublished,
    missingTranslations,
    reviewFlags,
    unreadMessages: initial.unreadMessages,
    busy,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEditor() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
  return ctx;
}

/** Moves an element inside an array (immutable-safe for drafts that are already cloned). */
export function move<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length || from === to) return;
  const [it] = list.splice(from, 1);
  list.splice(to, 0, it!);
}

/** Human readable label for a JSON path reported by the translation checker. */
export function describePath(path: string, draft: SiteContent): string {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  const out: string[] = [];
  let node: unknown = draft;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]!;
    const next = (node as Record<string, unknown>)?.[p];
    if (parts[i - 1] === "sections" && next && typeof next === "object") {
      const s = next as { title?: { pt?: string }; label?: { pt?: string }; id: string };
      out.push(`Secção «${s.title?.pt || s.label?.pt || s.id}»`);
    } else if (parts[i - 1] === "projects" && next && typeof next === "object") {
      out.push(`Projecto «${(next as { title?: { pt?: string } }).title?.pt || p}»`);
    } else if (parts[i - 1] === "items" && next && typeof next === "object") {
      out.push(`«${(next as { title?: { pt?: string } }).title?.pt || p}»`);
    } else if (!/^\d+$/.test(p) && !["sections", "projects", "items"].includes(p)) {
      out.push(FIELD_NAMES[p] ?? p);
    }
    node = next;
  }
  return out.join(" › ");
}

const FIELD_NAMES: Record<string, string> = {
  settings: "Definições",
  title: "Título",
  label: "Etiqueta",
  description: "Descrição",
  subtitle: "Subtítulo",
  org: "Entidade",
  date: "Data",
  caption: "Legenda",
  alt: "Texto alternativo",
  ui: "Textos da interface",
  nav: "Navegação",
  footer: "Rodapé",
  seo: "SEO",
  person: "Dados pessoais",
  cta: "Botão principal",
  links: "Ligações",
  images: "Imagens",
  gallery: "Galeria",
  stats: "Estatísticas",
  currently: "Actualmente",
  traits: "Traços",
  value: "Valor",
  detail: "Detalhe",
  bio: "Biografia",
  coverAlt: "Texto alternativo da capa",
  category: "Categoria",
  awards: "Prémios",
  tagline: "Frase",
  copyright: "Direitos de autor",
  keywords: "Palavras-chave",
  location: "Localização",
  coffee: "Botão do café",
  workItems: "Navegação (página de projectos)",
  items: "Itens",
  headline: "Título grande",
  headlineAccent: "Palavra em destaque",
  eyebrow: "Pré-título",
  secondary: "Texto secundário",
  formLabel: "Botão do formulário",
  resumeLabel: "Texto do botão do CV",
  buttonLabel: "Texto do botão",
  linkLabel: "Texto da ligação",
  scrollLabel: "Indicador de deslizar",
  imageAlt: "Texto alternativo da imagem",
  heroName: "Nome (hero)",
  heroSubtitle: "Subtítulo (hero)",
  heroStatement: "Frase (hero)",
  currentlyLabel: "Etiqueta «Actualmente»",
  traitsLabel: "Etiqueta dos traços",
  collage: "Colagem",
};
