import { useMemo, useRef, useState } from "react";
import { Archive, Check, Copy, Download, Mail, MailOpen, RotateCcw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { zContent } from "@shared/content";
import { useEditor } from "./editor";
import { ConfirmButton, FieldShell } from "./fields";
import { formatBytes, KindIcon, UploadButton } from "./media";

const fmtDate = (d: Date | string | null | undefined) => (d ? new Date(d).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" }) : "—");

export function MediaPage() {
  const { draft } = useEditor();
  const utils = trpc.useUtils();
  const list = trpc.portfolio.admin.media.list.useQuery();
  const updateMut = trpc.portfolio.admin.media.update.useMutation();
  const removeMut = trpc.portfolio.admin.media.remove.useMutation();
  const [filter, setFilter] = useState<"all" | "image" | "video" | "document">("all");
  const [edit, setEdit] = useState<Record<number, { title?: string; altPt?: string; altEn?: string; captionPt?: string; captionEn?: string }>>({});
  const json = useMemo(() => JSON.stringify(draft), [draft]);
  const items = (list.data ?? []).filter(m => filter === "all" || m.kind === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Media</h1>
          <p className="text-sm text-muted-foreground">Imagens (JPG, PNG, WEBP, GIF, AVIF até 10 MB), vídeos (MP4, WEBM, MOV até 80 MB) e documentos PDF (até 20 MB). Remover um item da biblioteca não apaga fisicamente o objecto no armazenamento; URLs já partilhados podem continuar acessíveis.</p>
        </div>
        <UploadButton kind="any" multiple variant="default" size="default" label="Carregar ficheiros" onUploaded={() => undefined} />
      </div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "Todos"],
            ["image", "Imagens"],
            ["video", "Vídeos"],
            ["document", "Documentos"],
          ] as const
        ).map(([v, l]) => (
          <Button key={v} size="sm" variant={filter === v ? "default" : "outline"} onClick={() => setFilter(v)}>
            {l}
          </Button>
        ))}
      </div>
      {list.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
      {list.error && <p className="text-sm text-destructive">Não foi possível carregar a biblioteca.</p>}
      {!list.isLoading && items.length === 0 && <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">Ainda não existem ficheiros.</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map(m => {
          const e = edit[m.id] ?? {};
          const val = (k: keyof typeof e) => e[k] ?? (m[k] as string | null) ?? "";
          const inUse = json.includes(m.url);
          const dirty = Object.keys(e).length > 0;
          return (
            <Card key={m.id} className="overflow-hidden pt-0">
              <div className="flex aspect-video items-center justify-center bg-muted">
                {m.kind === "image" ? (
                  <img src={m.url} alt={m.altPt ?? ""} className="h-full w-full object-contain" loading="lazy" />
                ) : m.kind === "video" ? (
                  <video src={m.url} className="h-full w-full" controls preload="metadata" />
                ) : (
                  <KindIcon kind={m.kind} className="size-10 text-muted-foreground" />
                )}
              </div>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{m.mime}</Badge>
                  <span>{formatBytes(m.size)}</span>
                  <span>{fmtDate(m.createdAt)}</span>
                  {inUse ? <Badge variant="outline">Em uso</Badge> : <Badge variant="outline" className="text-muted-foreground">Não usado</Badge>}
                </div>
                <FieldShell label="Título">
                  <Input value={val("title")} onChange={ev => setEdit(s => ({ ...s, [m.id]: { ...e, title: ev.target.value } }))} />
                </FieldShell>
                {m.kind !== "document" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <FieldShell label="Alt PT">
                        <Input value={val("altPt")} onChange={ev => setEdit(s => ({ ...s, [m.id]: { ...e, altPt: ev.target.value } }))} />
                      </FieldShell>
                      <FieldShell label="Alt EN">
                        <Input value={val("altEn")} onChange={ev => setEdit(s => ({ ...s, [m.id]: { ...e, altEn: ev.target.value } }))} />
                      </FieldShell>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <FieldShell label="Legenda PT">
                        <Textarea rows={2} value={val("captionPt")} onChange={ev => setEdit(s => ({ ...s, [m.id]: { ...e, captionPt: ev.target.value } }))} />
                      </FieldShell>
                      <FieldShell label="Legenda EN">
                        <Textarea rows={2} value={val("captionEn")} onChange={ev => setEdit(s => ({ ...s, [m.id]: { ...e, captionEn: ev.target.value } }))} />
                      </FieldShell>
                    </div>
                  </>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={!dirty || updateMut.isPending}
                    onClick={async () => {
                      try {
                        await updateMut.mutateAsync({ id: m.id, ...e });
                        setEdit(s => {
                          const n = { ...s };
                          delete n[m.id];
                          return n;
                        });
                        await utils.portfolio.admin.media.list.invalidate();
                        toast.success("Detalhes guardados.");
                      } catch (err) {
                        toast.error("Não foi possível guardar.", { description: err instanceof Error ? err.message : undefined });
                      }
                    }}
                  >
                    <Check className="size-4" /> Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard?.writeText(m.url);
                      toast.success("Endereço copiado.");
                    }}
                  >
                    <Copy className="size-4" /> Copiar URL
                  </Button>
                  <ConfirmButton
                    variant="outline"
                    size="sm"
                    title={`Remover «${m.title || m.originalName}»?`}
                    description={inUse ? "Atenção: este ficheiro está a ser usado no rascunho. Depois de o remover da biblioteca, substitua-o nos locais onde aparece. A remoção não apaga fisicamente o objecto armazenado; URLs já partilhados podem continuar acessíveis." : "O item deixa de aparecer na biblioteca, mas o objecto armazenado não é apagado fisicamente e URLs já partilhados podem continuar acessíveis."}
                    onConfirm={async () => {
                      try {
                        await removeMut.mutateAsync({ id: m.id });
                        await utils.portfolio.admin.media.list.invalidate();
                        toast.success("Ficheiro removido da biblioteca.");
                      } catch (err) {
                        toast.error("Não foi possível remover.", { description: err instanceof Error ? err.message : undefined });
                      }
                    }}
                  >
                    <Trash2 className="size-4" /> Remover
                  </ConfirmButton>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function MessagesPage() {
  const utils = trpc.useUtils();
  const list = trpc.portfolio.admin.messages.list.useQuery(undefined, { refetchInterval: 30_000 });
  const setRead = trpc.portfolio.admin.messages.setRead.useMutation({ onSuccess: () => utils.portfolio.admin.messages.list.invalidate() });
  const remove = trpc.portfolio.admin.messages.remove.useMutation({ onSuccess: () => utils.portfolio.admin.messages.list.invalidate() });
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mensagens</h1>
        <p className="text-sm text-muted-foreground">Mensagens enviadas pelo formulário de contacto. Também recebe uma notificação por cada nova mensagem.</p>
      </div>
      {list.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
      {list.error && <p className="text-sm text-destructive">Não foi possível carregar as mensagens.</p>}
      {list.data?.length === 0 && <p className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">Ainda não recebeu mensagens.</p>}
      <div className="space-y-2">
        {list.data?.map(m => (
          <Card key={m.id} className={cn("py-0", !m.isRead && "border-primary/40")}>
            <button
              type="button"
              className="flex w-full flex-wrap items-center gap-3 p-4 text-left"
              onClick={() => {
                setOpen(open === m.id ? null : m.id);
                if (!m.isRead) setRead.mutate({ id: m.id, isRead: true });
              }}
            >
              {m.isRead ? <MailOpen className="size-4 text-muted-foreground" /> : <Mail className="size-4 text-primary" />}
              <span className={cn("font-medium", !m.isRead && "font-semibold")}>{m.name}</span>
              <span className="text-sm text-muted-foreground">{m.email}</span>
              <Badge variant="outline" className="uppercase">
                {m.lang}
              </Badge>
              <span className="ml-auto text-xs text-muted-foreground">{fmtDate(m.createdAt)}</span>
            </button>
            {open === m.id && (
              <CardContent className="space-y-4 border-t pb-4 pt-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: contacto através do portefólio")}`}>
                      <Mail className="size-4" /> Responder
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRead.mutate({ id: m.id, isRead: !m.isRead })}>
                    {m.isRead ? "Marcar como não lida" : "Marcar como lida"}
                  </Button>
                  <ConfirmButton variant="outline" size="sm" title="Eliminar esta mensagem?" description="Esta operação não pode ser anulada." onConfirm={() => remove.mutate({ id: m.id })}>
                    <Trash2 className="size-4" /> Eliminar
                  </ConfirmButton>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

const KIND_LABEL: Record<string, string> = { publish: "Publicação", import: "Importação", restore: "Reposição", seed: "Conteúdo inicial", backup: "Cópia de segurança" };

export function HistoryPage() {
  const { draft, reload } = useEditor();
  const utils = trpc.useUtils();
  const revs = trpc.portfolio.admin.revisions.useQuery();
  const backup = trpc.portfolio.admin.backup.useMutation();
  const restore = trpc.portfolio.admin.restoreRevision.useMutation();
  const importMut = trpc.portfolio.admin.importContent.useMutation();
  const reset = trpc.portfolio.admin.resetToDefault.useMutation();
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const download = (data: unknown, name: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const afterChange = async (msg: string) => {
    await reload();
    await utils.portfolio.admin.revisions.invalidate();
    toast.success(msg);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Histórico e cópias de segurança</h1>
        <p className="text-sm text-muted-foreground">Cada publicação guarda automaticamente uma versão completa. Pode repor qualquer versão no rascunho e publicá-la de novo.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cópias de segurança</CardTitle>
          <CardDescription>Guarde uma cópia no servidor ou descarregue um ficheiro JSON para guardar fora da plataforma.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Input className="max-w-xs" placeholder="Nota (opcional)" value={note} onChange={e => setNote(e.target.value)} />
          <Button
            disabled={backup.isPending}
            onClick={async () => {
              try {
                await backup.mutateAsync({ note: note || undefined });
                setNote("");
                await utils.portfolio.admin.revisions.invalidate();
                toast.success("Cópia de segurança criada.");
              } catch (e) {
                toast.error("Falha ao criar a cópia.", { description: e instanceof Error ? e.message : undefined });
              }
            }}
          >
            <Archive className="size-4" /> Criar cópia do rascunho
          </Button>
          <Button variant="outline" onClick={() => download(draft, `portefolio-rascunho-${new Date().toISOString().slice(0, 10)}.json`)}>
            <Download className="size-4" /> Exportar JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async e => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const parsed = zContent.safeParse(JSON.parse(await f.text()));
                if (!parsed.success) throw new Error(parsed.error.issues.slice(0, 3).map(i => `${i.path.join(".")}: ${i.message}`).join("; "));
                await importMut.mutateAsync({ content: parsed.data });
                await afterChange("Ficheiro importado para o rascunho. Reveja e publique.");
              } catch (err) {
                toast.error("Ficheiro inválido.", { description: err instanceof Error ? err.message : undefined });
              } finally {
                if (fileRef.current) fileRef.current.value = "";
              }
            }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Importar JSON
          </Button>
          <ConfirmButton
            variant="outline"
            size="sm"
            title="Repor o conteúdo inicial?"
            description="O rascunho será substituído pelo conteúdo inicial do portefólio. O estado actual fica guardado no histórico."
            confirmLabel="Repor"
            onConfirm={async () => {
              await reset.mutateAsync();
              await afterChange("Conteúdo inicial reposto no rascunho.");
            }}
          >
            <RotateCcw className="size-4" /> Repor conteúdo inicial
          </ConfirmButton>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Versões</CardTitle>
        </CardHeader>
        <CardContent>
          {revs.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
          {revs.data?.length === 0 && <p className="text-sm text-muted-foreground">Ainda não existem versões.</p>}
          <div className="divide-y">
            {revs.data?.map(r => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <Badge variant={r.kind === "publish" ? "default" : "secondary"}>{KIND_LABEL[r.kind] ?? r.kind}</Badge>
                <span className="text-sm">#{r.id}</span>
                <span className="text-sm text-muted-foreground">{fmtDate(r.createdAt)}</span>
                {r.createdBy && <span className="text-xs text-muted-foreground">por {r.createdBy}</span>}
                {r.note && <span className="text-xs italic text-muted-foreground">— {r.note}</span>}
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const full = await utils.portfolio.admin.revision.fetch({ id: r.id });
                      download(full.data, `portefolio-versao-${r.id}.json`);
                    }}
                  >
                    <Download className="size-4" />
                  </Button>
                  <ConfirmButton
                    variant="outline"
                    size="sm"
                    destructive={false}
                    confirmLabel="Repor no rascunho"
                    title={`Repor a versão #${r.id}?`}
                    description="O rascunho actual será substituído por esta versão (o estado actual fica guardado no histórico). A área pública só muda quando publicar."
                    onConfirm={async () => {
                      await restore.mutateAsync({ id: r.id });
                      await afterChange(`Versão #${r.id} reposta no rascunho.`);
                    }}
                  >
                    <RotateCcw className="size-4" /> Repor
                  </ConfirmButton>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
