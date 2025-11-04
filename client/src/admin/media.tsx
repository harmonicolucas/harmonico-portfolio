import { useRef, useState } from "react";
import { FileText, Film, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { COOKIE_NAME } from "@shared/const";
import { mediaKindForMime, UPLOAD_POLICY, type MediaKind } from "@shared/content";

export type UploadResult = { id: number; url: string; kind: MediaKind; mime: string; size: number; title: string };

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "x-pf-client": "1" };
  try {
    const raw = sessionStorage.getItem("manus-cookie");
    const pair = raw?.split(";").find(s => s.trim().startsWith(`${COOKIE_NAME}=`));
    const token = pair?.trim().slice(COOKIE_NAME.length + 1);
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* sessionStorage unavailable */
  }
  return headers;
}

export const ACCEPT: Record<MediaKind | "any", string> = {
  image: UPLOAD_POLICY.image.mimes.join(","),
  video: UPLOAD_POLICY.video.mimes.join(","),
  document: UPLOAD_POLICY.document.mimes.join(","),
  any: [...UPLOAD_POLICY.image.mimes, ...UPLOAD_POLICY.video.mimes, ...UPLOAD_POLICY.document.mimes].join(","),
};

export function validateFile(file: File, expected?: MediaKind | "any"): string | null {
  const kind = mediaKindForMime(file.type);
  if (!kind) return `«${file.name}»: formato não suportado (${file.type || "desconhecido"}).`;
  if (expected && expected !== "any" && kind !== expected) {
    const names = { image: "uma imagem", video: "um vídeo", document: "um PDF" } as const;
    return `«${file.name}»: era esperado ${names[expected]}.`;
  }
  const max = UPLOAD_POLICY[kind].maxBytes;
  if (file.size > max) return `«${file.name}»: demasiado grande (máx. ${Math.round(max / 1048576)} MB).`;
  return null;
}

export async function uploadFile(file: File, expected?: MediaKind | "any"): Promise<UploadResult> {
  const problem = validateFile(file, expected);
  if (problem) throw new Error(problem);
  const qs = new URLSearchParams({ name: file.name, title: file.name.replace(/\.[^.]+$/, "") });
  const res = await fetch(`/api/admin/upload?${qs}`, {
    method: "POST",
    body: file,
    credentials: "include",
    headers: { "Content-Type": file.type, ...authHeaders() },
  });
  const data = (await res.json().catch(() => ({}))) as Partial<UploadResult> & { error?: string };
  if (!res.ok || !data.url) throw new Error(data.error || `Falha no carregamento (${res.status}).`);
  return data as UploadResult;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export function KindIcon({ kind, className }: { kind: string; className?: string }) {
  if (kind === "video") return <Film className={className} />;
  if (kind === "document") return <FileText className={className} />;
  return <ImageIcon className={className} />;
}

/** Upload button that accepts several files and reports progress. */
export function UploadButton({
  kind = "any",
  multiple = false,
  onUploaded,
  label = "Carregar ficheiro",
  variant = "outline",
  size = "sm",
}: {
  kind?: MediaKind | "any";
  multiple?: boolean;
  onUploaded: (r: UploadResult) => void;
  label?: string;
  variant?: "outline" | "default" | "secondary";
  size?: "sm" | "default";
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(0);
  const utils = trpc.useUtils();
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    const errors = list.map(f => validateFile(f, kind)).filter(Boolean) as string[];
    if (errors.length) {
      errors.forEach(e => toast.error(e));
    }
    const valid = list.filter(f => !validateFile(f, kind));
    setBusy(valid.length);
    for (const f of valid) {
      try {
        const r = await uploadFile(f, kind);
        onUploaded(r);
        toast.success(`«${f.name}» carregado.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha no carregamento.");
      } finally {
        setBusy(b => b - 1);
      }
    }
    void utils.portfolio.admin.media.list.invalidate();
    if (ref.current) ref.current.value = "";
  };
  return (
    <>
      <input ref={ref} type="file" hidden accept={ACCEPT[kind]} multiple={multiple} onChange={e => onFiles(e.target.files)} />
      <Button type="button" variant={variant} size={size} onClick={() => ref.current?.click()} disabled={busy > 0}>
        {busy > 0 ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {busy > 0 ? `A carregar (${busy})…` : label}
      </Button>
    </>
  );
}

/** Dialog to pick an existing file from the media library (or upload a new one). */
export function MediaLibraryDialog({
  open,
  onOpenChange,
  kind = "any",
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind?: MediaKind | "any";
  onPick: (url: string, meta: { kind: string; title: string; altPt?: string | null; altEn?: string | null }) => void;
}) {
  const list = trpc.portfolio.admin.media.list.useQuery(undefined, { enabled: open });
  const [q, setQ] = useState("");
  const items = (list.data ?? []).filter(m => (kind === "any" || m.kind === kind) && `${m.title ?? ""} ${m.originalName ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Biblioteca de media</DialogTitle>
          <DialogDescription>Escolha um ficheiro já carregado ou carregue um novo.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input placeholder="Pesquisar…" value={q} onChange={e => setQ(e.target.value)} />
          <UploadButton
            kind={kind}
            onUploaded={r => {
              onPick(r.url, { kind: r.kind, title: r.title });
              onOpenChange(false);
            }}
          />
        </div>
        <div className="grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
          {list.isLoading && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">A carregar…</p>}
          {!list.isLoading && items.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">Ainda não existem ficheiros deste tipo.</p>
          )}
          {items.map(m => (
            <button
              key={m.id}
              type="button"
              className="group overflow-hidden rounded-lg border text-left transition hover:border-foreground"
              onClick={() => {
                onPick(m.url, { kind: m.kind, title: m.title ?? "", altPt: m.altPt, altEn: m.altEn });
                onOpenChange(false);
              }}
            >
              <div className="flex aspect-video items-center justify-center bg-muted">
                {m.kind === "image" ? (
                  <img src={m.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <KindIcon kind={m.kind} className="size-8 text-muted-foreground" />
                )}
              </div>
              <div className="truncate px-2 py-1.5 text-xs">{m.title || m.originalName}</div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MediaThumb({ url, kind, onRemove }: { url: string; kind?: string; onRemove?: () => void }) {
  const isImage = kind ? kind === "image" : !/\.(mp4|webm|mov|pdf)(\?|$)/i.test(url) && !/youtu|vimeo/i.test(url);
  return (
    <div className="relative flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
      {isImage ? <img src={url} alt="" className="h-full w-full object-cover" /> : <KindIcon kind={kind ?? (/\.pdf/i.test(url) ? "document" : "video")} className="size-6 text-muted-foreground" />}
      {onRemove && (
        <button type="button" onClick={onRemove} className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 shadow" aria-label="Remover">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
