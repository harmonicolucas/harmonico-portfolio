import { useState, type ReactNode } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, GripVertical, Image as ImageIcon, Library, Link2, Plus, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { isSafeUrl, newId, type L, type LinkItem, type MediaKind, type MediaRef } from "@shared/content";
import { ICON_NAMES, Icon } from "@/portfolio/icons";
import { MediaLibraryDialog, MediaThumb, UploadButton } from "./media";

export const EMPTY_L: L = { pt: "", en: "" };

export function FieldShell({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function missing(v: L | undefined) {
  const pt = v?.pt?.trim() ?? "";
  const en = v?.en?.trim() ?? "";
  if (pt && !en) return "en";
  if (!pt && en) return "pt";
  return null;
}

/** Bilingual text field: Portuguese and English side by side, with a missing-translation badge. */
export function LField({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
  hint,
  placeholder,
  className,
}: {
  label: string;
  value: L | undefined;
  onChange: (v: L) => void;
  multiline?: boolean;
  rows?: number;
  hint?: ReactNode;
  placeholder?: string;
  className?: string;
}) {
  const v = value ?? EMPTY_L;
  const miss = missing(v);
  const Cmp = multiline ? Textarea : Input;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
        {miss && (
          <Badge variant="outline" className="border-amber-400 bg-amber-50 text-[10px] text-amber-700">
            Falta tradução {miss.toUpperCase()}
          </Badge>
        )}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {(["pt", "en"] as const).map(lang => (
          <div key={lang} className="relative">
            <span className="pointer-events-none absolute right-2 top-2 z-10 rounded bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">{lang.toUpperCase()}</span>
            <Cmp
              value={v[lang]}
              placeholder={placeholder}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...v, [lang]: e.target.value })}
              className={cn("pr-10", miss === lang && "border-amber-400")}
              {...(multiline ? { rows } : {})}
            />
          </div>
        ))}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  type = "text",
  className,
  url = false,
  multiline = false,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  hint?: ReactNode;
  placeholder?: string;
  type?: string;
  className?: string;
  url?: boolean;
  multiline?: boolean;
}) {
  const bad = url && value && !isSafeUrl(value);
  const Cmp = multiline ? Textarea : Input;
  return (
    <FieldShell label={label} hint={bad ? <span className="text-destructive">URL inválido — use https://, mailto:, tel: ou /caminho</span> : hint} className={className}>
      <Cmp type={type} value={value ?? ""} placeholder={placeholder} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value)} className={cn(bad && "border-destructive")} />
    </FieldShell>
  );
}

export function SwitchField({ label, checked, onChange, hint }: { label: string; checked: boolean | undefined; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
      <Switch checked={!!checked} onCheckedChange={onChange} className="mt-0.5" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hint?: string;
}) {
  return (
    <FieldShell label={label} hint={hint}>
      <Select value={value} onValueChange={v => onChange(v as T)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Escolher…" />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

export function IconField({ label = "Ícone", value, onChange }: { label?: string; value: string; onChange: (v: string) => void }) {
  return (
    <FieldShell label={label}>
      <Select value={value || "award"} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {ICON_NAMES.map(n => (
            <SelectItem key={n} value={n}>
              <span className="flex items-center gap-2">
                <Icon name={n} size={14} /> {n}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

/** Chips input for plain string lists (tags, technologies…). */
export function TagsField({ label, value, onChange, hint, placeholder = "Escreva e prima Enter" }: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: string; placeholder?: string }) {
  const [text, setText] = useState("");
  const add = () => {
    const parts = text
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .filter(s => !value.includes(s));
    if (parts.length) onChange([...value, ...parts]);
    setText("");
  };
  return (
    <FieldShell label={label} hint={hint}>
      <div className="flex flex-wrap gap-1.5 rounded-md border p-2">
        {value.map((tag, i) => (
          <span key={tag + i} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
            <button type="button" className="text-muted-foreground disabled:opacity-30" disabled={i === 0} onClick={() => { const n = [...value]; [n[i - 1], n[i]] = [n[i]!, n[i - 1]!]; onChange(n); }} aria-label="Mover para a esquerda">
              ‹
            </button>
            {tag}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remover ${tag}`}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          className="min-w-32 flex-1 bg-transparent px-1 text-sm outline-none"
          value={text}
          placeholder={placeholder}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
            if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={add}
        />
      </div>
    </FieldShell>
  );
}

/** Single media URL with preview, upload and library picker. */
export function MediaField({
  label,
  value,
  onChange,
  kind = "image",
  hint,
  allowUrl = true,
}: {
  label: string;
  value: string | undefined;
  onChange: (url: string) => void;
  kind?: MediaKind | "any";
  hint?: ReactNode;
  allowUrl?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <FieldShell label={label} hint={hint}>
      <div className="flex flex-wrap items-start gap-3">
        {value ? <MediaThumb url={value} kind={kind === "any" ? undefined : kind} onRemove={() => onChange("")} /> : (
          <div className="flex h-20 w-28 items-center justify-center rounded-md border border-dashed text-muted-foreground">
            <ImageIcon className="size-5" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <UploadButton kind={kind} onUploaded={r => onChange(r.url)} label="Carregar" />
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Library className="size-4" /> Biblioteca
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" asChild>
                <a href={value} target="_blank" rel="noopener noreferrer">
                  <Link2 className="size-4" /> Abrir
                </a>
              </Button>
            )}
          </div>
          {allowUrl && (
            <Input
              value={value ?? ""}
              onChange={e => onChange(e.target.value)}
              placeholder={kind === "video" ? "Ou cole uma ligação (YouTube, Vimeo, MP4…)" : "Ou cole um URL / caminho"}
              className={cn("h-8 text-xs", value && !isSafeUrl(value) && "border-destructive")}
            />
          )}
        </div>
      </div>
      <MediaLibraryDialog open={open} onOpenChange={setOpen} kind={kind} onPick={url => onChange(url)} />
    </FieldShell>
  );
}

/** Ordered list of images/videos with alt text and captions. */
export function MediaListField({ label, value, onChange, max = 30, hint }: { label: string; value: MediaRef[]; onChange: (v: MediaRef[]) => void; max?: number; hint?: string }) {
  const [open, setOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const add = (m: MediaRef) => value.length < max && onChange([...value, m]);
  const set = (i: number, patch: Partial<MediaRef>) => onChange(value.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  return (
    <FieldShell label={`${label} (${value.length}/${max})`} hint={hint}>
      <div className="space-y-3">
        {value.map((m, i) => (
          <div key={m.url + i} className="flex flex-col gap-3 rounded-md border p-3 md:flex-row">
            <MediaThumb url={m.url} kind={m.type} />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{m.type === "video" ? "Vídeo" : "Imagem"}</Badge>
                <span className="truncate text-xs text-muted-foreground">{m.url}</span>
                <div className="ml-auto flex gap-1">
                  <ReorderButtons index={i} length={value.length} onMove={to => { const n = [...value]; const [x] = n.splice(i, 1); n.splice(to, 0, x!); onChange(n); }} />
                  <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remover">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <LField label="Texto alternativo / título" value={m.alt} onChange={alt => set(i, { alt })} />
              <LField label="Legenda" value={m.caption} onChange={caption => set(i, { caption })} />
            </div>
          </div>
        ))}
        {value.length < max && (
          <div className="flex flex-wrap items-center gap-2">
            <UploadButton kind="any" multiple label="Carregar imagens/vídeos" onUploaded={r => r.kind !== "document" && add({ url: r.url, type: r.kind === "video" ? "video" : "image", alt: { pt: r.title, en: r.title }, caption: EMPTY_L })} />
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Library className="size-4" /> Da biblioteca
            </Button>
            <div className="flex items-center gap-1">
              <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="Ligação de vídeo (YouTube/Vimeo)" className="h-8 w-60 text-xs" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!videoUrl || !isSafeUrl(videoUrl)}
                onClick={() => {
                  add({ url: videoUrl.trim(), type: "video", alt: EMPTY_L, caption: EMPTY_L });
                  setVideoUrl("");
                }}
              >
                <Plus className="size-4" /> Vídeo
              </Button>
            </div>
          </div>
        )}
      </div>
      <MediaLibraryDialog
        open={open}
        onOpenChange={setOpen}
        kind="any"
        onPick={(url, meta) => meta.kind !== "document" && add({ url, type: meta.kind === "video" ? "video" : "image", alt: { pt: meta.altPt || meta.title, en: meta.altEn || meta.title }, caption: EMPTY_L })}
      />
    </FieldShell>
  );
}

export function LinksField({ label = "Ligações", value, onChange, max = 20 }: { label?: string; value: LinkItem[]; onChange: (v: LinkItem[]) => void; max?: number }) {
  const set = (i: number, patch: Partial<LinkItem>) => onChange(value.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <FieldShell label={label}>
      <div className="space-y-2">
        {value.map((l, i) => (
          <div key={l.id} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Input value={l.url} onChange={e => set(i, { url: e.target.value })} placeholder="https://…" className={cn("h-8 text-xs", l.url && !isSafeUrl(l.url) && "border-destructive")} />
              <Select value={l.kind} onValueChange={v => set(i, { kind: v as LinkItem["kind"] })}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ["link", "Ligação"],
                    ["certificate", "Certificado"],
                    ["demo", "Demonstração"],
                    ["repo", "Repositório"],
                    ["document", "Documento"],
                    ["video", "Vídeo"],
                  ].map(([v, t]) => (
                    <SelectItem key={v} value={v!}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ReorderButtons index={i} length={value.length} onMove={to => { const n = [...value]; const [x] = n.splice(i, 1); n.splice(to, 0, x!); onChange(n); }} />
              <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remover ligação">
                <Trash2 className="size-4" />
              </Button>
            </div>
            <LField label="Texto" value={l.label} onChange={label => set(i, { label })} />
          </div>
        ))}
        {value.length < max && (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { id: newId("lk"), label: EMPTY_L, url: "", kind: "link" }])}>
            <Plus className="size-4" /> Adicionar ligação
          </Button>
        )}
      </div>
    </FieldShell>
  );
}

export function ReorderButtons({ index, length, onMove }: { index: number; length: number; onMove: (to: number) => void }) {
  return (
    <span className="inline-flex">
      <Button type="button" variant="ghost" size="icon" className="size-7" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label="Mover para cima">
        <ArrowUp className="size-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-7" disabled={index === length - 1} onClick={() => onMove(index + 1)} aria-label="Mover para baixo">
        <ArrowDown className="size-4" />
      </Button>
    </span>
  );
}

/** List with drag-and-drop + keyboard-accessible arrow buttons. */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  render,
  empty = "Ainda não existem elementos.",
}: {
  items: T[];
  onReorder: (from: number, to: number) => void;
  render: (item: T, index: number, handle: ReactNode) => ReactNode;
  empty?: string;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  if (items.length === 0) return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div
          key={it.id}
          onDragOver={e => {
            if (dragging === null) return;
            e.preventDefault();
            setOver(i);
          }}
          onDrop={e => {
            e.preventDefault();
            if (dragging !== null && dragging !== i) onReorder(dragging, i);
            setDragging(null);
            setOver(null);
          }}
          className={cn("rounded-lg transition", over === i && dragging !== null && dragging !== i && "ring-2 ring-primary/40")}
        >
          {render(
            it,
            i,
            <span className="flex items-center">
              <span
                draggable
                onDragStart={e => {
                  setDragging(i);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setOver(null);
                }}
                className="cursor-grab p-1 text-muted-foreground active:cursor-grabbing"
                title="Arraste para reordenar"
              >
                <GripVertical className="size-4" />
              </span>
              <ReorderButtons index={i} length={items.length} onMove={to => onReorder(i, to)} />
            </span>,
          )}
        </div>
      ))}
    </div>
  );
}

export function ConfirmButton({
  title,
  description,
  onConfirm,
  children,
  confirmLabel = "Eliminar",
  variant = "ghost",
  size = "icon",
  className,
  destructive = true,
}: {
  title: string;
  description?: string;
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: string;
  variant?: "ghost" | "outline" | "destructive" | "default";
  size?: "icon" | "sm" | "default";
  className?: string;
  destructive?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant={variant} size={size} className={className}>
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={destructive ? "bg-destructive text-white hover:bg-destructive/90" : undefined}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** "A rever" flag with the admin note explaining what must be confirmed. */
export function ReviewField({ review, note, onChange }: { review: boolean; note: string; onChange: (v: { review: boolean; note: string }) => void }) {
  return (
    <div className={cn("space-y-2 rounded-md border p-3", review && "border-amber-300 bg-amber-50/60")}>
      <label className="flex cursor-pointer items-center gap-3">
        <Switch checked={review} onCheckedChange={v => onChange({ review: v, note })} />
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {review && <AlertTriangle className="size-4 text-amber-600" />}
          Conteúdo provisório — a rever
        </span>
      </label>
      {(review || note) && (
        <Textarea rows={2} value={note} onChange={e => onChange({ review, note: e.target.value })} placeholder="Nota interna (não é publicada)" className="bg-background text-sm" />
      )}
    </div>
  );
}

export function ReviewBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-700">
      <AlertTriangle className="size-3" /> A rever
    </Badge>
  );
}
