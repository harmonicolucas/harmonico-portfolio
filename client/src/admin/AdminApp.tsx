import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ExternalLink,
  FolderKanban,
  History,
  Image as ImageIcon,
  KeyRound,
  Languages,
  LayoutDashboard,
  Layers,
  Loader2,
  LogOut,
  Mail,
  Menu,
  Rocket,
  Save,
  Settings2,
  Undo2,
  Eye,
} from "lucide-react";
import { Link, Route, Switch, useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { describePath, EditorProvider, useEditor } from "./editor";
import { ConfirmButton } from "./fields";
import { HistoryPage, MediaPage, MessagesPage } from "./OtherPages";
import { ProjectEditorPage, ProjectsPage } from "./ProjectsPage";
import { SectionEditorPage, SectionsPage, sectionName } from "./SectionsPage";
import { SettingsPage } from "./SettingsPage";

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">{children}</div>;
}

function useAdminHtmlClass() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("admin-mode");
    const prevTitle = document.title;
    document.title = "Painel · Portefólio";
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const prevRobots = robots?.content;
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, nofollow";
    return () => {
      root.classList.remove("admin-mode");
      document.title = prevTitle;
      if (robots) robots.content = prevRobots ?? "index, follow";
    };
  }, []);
}

function LoginCard() {
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation();
  const [email, setEmail] = useState("harmonicolucas@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  return (
    <Centered>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Área administrativa</CardTitle>
          <CardDescription>Entre com o e-mail e a senha do administrador.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={async event => {
              event.preventDefault();
              setError("");
              try {
                await login.mutateAsync({ email, password });
                await utils.auth.me.invalidate();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Não foi possível entrar.");
              }
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">E-mail</Label>
              <Input id="admin-email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Senha</Label>
              <Input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit" disabled={login.isPending}>
              <KeyRound className="size-4" /> {login.isPending ? "A entrar…" : "Entrar"}
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <a href="/">Voltar ao portefólio</a>
            </Button>
          </form>
        </CardContent>
      </Card>
    </Centered>
  );
}

export default function AdminApp() {
  useAdminHtmlClass();
  const { user, loading, logout } = useAuth();
  const status = trpc.portfolio.access.status.useQuery(undefined, { enabled: !!user, retry: false });

  if (loading || (user && status.isLoading)) {
    return (
      <Centered>
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </Centered>
    );
  }

  if (!user) return <LoginCard />;

  if (!status.data?.isAdmin) return <ClaimAccess adminExists={!!status.data?.adminExists} onLogout={logout} email={user.email ?? user.name ?? ""} />;

  return <AdminLoaded onLogout={logout} userName={user.name ?? user.email ?? "Administrador"} />;
}

function ClaimAccess({ adminExists, onLogout, email }: { adminExists: boolean; onLogout: () => Promise<void>; email: string }) {
  const utils = trpc.useUtils();
  const claim = trpc.portfolio.access.claim.useMutation();
  const [code, setCode] = useState("");
  return (
    <Centered>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sem permissões de administrador</CardTitle>
          <CardDescription>
            Sessão iniciada como <strong>{email || "utilizador"}</strong>.{" "}
            {adminExists ? "Esta conta não tem acesso ao painel." : "Se é o proprietário, introduza o código de activação definido na variável ADMIN_SETUP_CODE."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!adminExists && (
            <form
              className="space-y-3"
              onSubmit={async e => {
                e.preventDefault();
                try {
                  await claim.mutateAsync({ code });
                  toast.success("Conta activada como administrador.");
                  await utils.portfolio.access.status.invalidate();
                  await utils.auth.me.invalidate();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Código inválido.");
                }
              }}
            >
              <Input type="password" autoComplete="one-time-code" placeholder="Código de activação" value={code} onChange={e => setCode(e.target.value)} />
              <Button className="w-full" disabled={code.length < 6 || claim.isPending}>
                {claim.isPending && <Loader2 className="size-4 animate-spin" />} Activar acesso
              </Button>
            </form>
          )}
          <Button variant="outline" className="w-full" onClick={() => void onLogout()}>
            <LogOut className="size-4" /> Terminar sessão
          </Button>
        </CardContent>
      </Card>
    </Centered>
  );
}

function AdminLoaded({ onLogout, userName }: { onLogout: () => Promise<void>; userName: string }) {
  const state = trpc.portfolio.admin.state.useQuery(undefined, { refetchOnWindowFocus: false, staleTime: Infinity });
  if (state.isLoading) {
    return (
      <Centered>
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </Centered>
    );
  }
  if (state.error || !state.data) {
    return (
      <Centered>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Não foi possível carregar o conteúdo</CardTitle>
            <CardDescription>{state.error?.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => state.refetch()}>Tentar novamente</Button>
          </CardContent>
        </Card>
      </Centered>
    );
  }
  return (
    <EditorProvider initial={state.data}>
      <Shell onLogout={onLogout} userName={userName} />
    </EditorProvider>
  );
}

const NAV = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { href: "/admin/seccoes", label: "Secções", icon: Layers },
  { href: "/admin/projectos", label: "Projectos", icon: FolderKanban },
  { href: "/admin/perfil", label: "Perfil e definições", icon: Settings2 },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
  { href: "/admin/mensagens", label: "Mensagens", icon: Mail },
  { href: "/admin/historico", label: "Histórico", icon: History },
];

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const unread = trpc.portfolio.admin.messages.list.useQuery(undefined, { refetchInterval: 60_000 }).data?.filter(m => !m.isRead).length ?? 0;
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(n => {
        const active = n.exact ? location === n.href || location === `${n.href}/` : location.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm transition hover:bg-muted", active && "bg-muted font-semibold")}
          >
            <n.icon className="size-4" />
            {n.label}
            {n.href === "/admin/mensagens" && unread > 0 && <Badge className="ml-auto h-5 px-1.5">{unread}</Badge>}
          </Link>
        );
      })}
    </nav>
  );
}

function SaveIndicator() {
  const { saveState, lastSavedAt } = useEditor();
  const map = {
    idle: "Sem alterações",
    dirty: "Alterações por guardar…",
    saving: "A guardar…",
    saved: lastSavedAt ? `Rascunho guardado às ${lastSavedAt.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}` : "Guardado",
    error: "Erro ao guardar",
  } as const;
  return (
    <span className={cn("hidden text-xs text-muted-foreground sm:inline", saveState === "error" && "text-destructive")} aria-live="polite">
      {saveState === "saving" && <Loader2 className="mr-1 inline size-3 animate-spin" />}
      {map[saveState]}
    </span>
  );
}

function Shell({ onLogout, userName }: { onLogout: () => Promise<void>; userName: string }) {
  const { save, publish, discard, busy, hasUnpublishedChanges, missingTranslations, saveState } = useEditor();
  const [mobileNav, setMobileNav] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [note, setNote] = useState("");

  const preview = async () => {
    const w = window.open("about:blank", "_blank");
    const ok = await save({ silent: true });
    if (!ok) {
      w?.close();
      toast.error("Corrija os erros antes de pré-visualizar.");
      return;
    }
    if (w) w.location.href = "/?preview=1";
    else window.location.href = "/?preview=1";
  };

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-background p-4 lg:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-2 px-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-foreground font-bold text-background">H</span>
          <span className="font-semibold">Painel</span>
        </Link>
        <SideNav />
        <div className="mt-auto space-y-2 border-t pt-4 text-xs text-muted-foreground">
          <div className="truncate px-2">{userName}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <a href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" /> Ver site público
            </a>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => void onLogout()}>
            <LogOut className="size-4" /> Terminar sessão
          </Button>
        </div>
      </aside>
      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-64 p-4">
          <SheetTitle className="mb-4">Painel</SheetTitle>
          <SideNav onNavigate={() => setMobileNav(false)} />
          <div className="mt-6 space-y-2 border-t pt-4">
            <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" /> Ver site público
              </a>
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => void onLogout()}>
              <LogOut className="size-4" /> Terminar sessão
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="lg:pl-60">
        {import.meta.env.VITE_STATIC === "1" && (
          <p className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-950">
            As alterações ficam guardadas neste navegador. Para os outros visitantes, o site continua com a versão publicada no GitHub Pages.
          </p>
        )}
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileNav(true)} aria-label="Abrir menu">
            <Menu className="size-5" />
          </Button>
          <SaveIndicator />
          {hasUnpublishedChanges ? (
            <Badge variant="outline" className="border-amber-400 text-amber-700">
              Rascunho com alterações não publicadas
            </Badge>
          ) : (
            <Badge variant="outline" className="text-emerald-700">
              Publicado
            </Badge>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {hasUnpublishedChanges && (
              <ConfirmButton
                variant="ghost"
                size="sm"
                title="Descartar o rascunho?"
                description="Todas as alterações não publicadas serão perdidas e o rascunho volta a ser igual à versão publicada."
                confirmLabel="Descartar"
                onConfirm={() => void discard()}
              >
                <Undo2 className="size-4" /> <span className="hidden sm:inline">Descartar</span>
              </ConfirmButton>
            )}
            <Button variant="outline" size="sm" onClick={() => void save()} disabled={saveState === "saving"}>
              <Save className="size-4" /> <span className="hidden sm:inline">Guardar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void preview()}>
              <Eye className="size-4" /> <span className="hidden sm:inline">Pré-visualizar</span>
            </Button>
            <Button size="sm" onClick={() => setPublishOpen(true)} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />} Publicar
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-5xl p-4 md:p-8">
          <Switch>
            <Route path="/admin" component={Dashboard} />
            <Route path="/admin/seccoes" component={SectionsPage} />
            <Route path="/admin/seccoes/:id">{p => <SectionEditorPage id={p.id} />}</Route>
            <Route path="/admin/projectos" component={ProjectsPage} />
            <Route path="/admin/projectos/:id">{p => <ProjectEditorPage id={p.id} />}</Route>
            <Route path="/admin/perfil" component={SettingsPage} />
            <Route path="/admin/media" component={MediaPage} />
            <Route path="/admin/mensagens" component={MessagesPage} />
            <Route path="/admin/historico" component={HistoryPage} />
            <Route>
              <p>
                Página não encontrada.{" "}
                <Link href="/admin" className="underline">
                  Voltar
                </Link>
              </p>
            </Route>
          </Switch>
        </main>
      </div>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicar alterações</DialogTitle>
            <DialogDescription>O rascunho actual passa a ser a versão pública do portefólio. A versão é guardada no histórico.</DialogDescription>
          </DialogHeader>
          {missingTranslations.length > 0 && (
            <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Existem {missingTranslations.length} campos com tradução em falta. Nesses campos, o site mostra o texto do outro idioma.
            </p>
          )}
          <Input placeholder="Nota da versão (opcional)" value={note} onChange={e => setNote(e.target.value)} maxLength={300} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                const ok = await publish(note || undefined);
                if (ok) {
                  setPublishOpen(false);
                  setNote("");
                }
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Publicar agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Dashboard() {
  const { draft, publishedAt, publishedBy, missingTranslations, reviewFlags, validationErrors } = useEditor();
  const messages = trpc.portfolio.admin.messages.list.useQuery();
  const unread = messages.data?.filter(m => !m.isRead).length ?? 0;
  const hrefFor = (path: string) => {
    const [root, id] = path.split(".");
    if (root === "sections" && id) return `/admin/seccoes/${id}`;
    if (root === "projects" && id) return `/admin/projectos/${id}`;
    return "/admin/perfil";
  };
  const hrefForMissing = (path: string) => {
    const m = path.match(/^sections\[(\d+)\]/);
    if (m) return `/admin/seccoes/${draft.sections[Number(m[1])]?.id}`;
    const p = path.match(/^projects\[(\d+)\]/);
    if (p) return `/admin/projectos/${draft.projects[Number(p[1])]?.id}`;
    return "/admin/perfil";
  };
  const stats = [
    { label: "Secções visíveis", value: `${draft.sections.filter(s => s.enabled).length}/${draft.sections.length}`, href: "/admin/seccoes" },
    { label: "Projectos visíveis", value: `${draft.projects.filter(p => p.enabled).length}/${draft.projects.length}`, href: "/admin/projectos" },
    { label: "Mensagens por ler", value: String(unread), href: "/admin/mensagens" },
    { label: "Traduções em falta", value: String(missingTranslations.length), href: "#traducoes" },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Visão geral</h1>
        <p className="text-sm text-muted-foreground">
          Última publicação: {publishedAt ? publishedAt.toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" }) : "—"}
          {publishedBy ? ` por ${publishedBy}` : ""}. As alterações são guardadas automaticamente como rascunho e só ficam públicas quando clicar em «Publicar».
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(s => (
          <Link key={s.label} href={s.href} className="rounded-xl border bg-background p-4 transition hover:border-foreground/40">
            <div className="text-2xl font-semibold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Link>
        ))}
      </div>
      {validationErrors.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Erros de validação</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {validationErrors.map(e => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-amber-600" /> Conteúdo provisório a rever ({reviewFlags.length})
          </CardTitle>
          <CardDescription>Elementos preenchidos sem dados verificáveis. Confirme-os ou corrija-os antes de considerar o portefólio final.</CardDescription>
        </CardHeader>
        <CardContent>
          {reviewFlags.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada a rever.</p>
          ) : (
            <ul className="divide-y text-sm">
              {reviewFlags.map(f => (
                <li key={f.path} className="flex items-center justify-between gap-3 py-2">
                  <span>{f.label}</span>
                  <Link href={hrefFor(f.path)} className="shrink-0 text-xs underline">
                    Editar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card id="traducoes">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Languages className="size-4" /> Traduções em falta ({missingTranslations.length})
          </CardTitle>
          <CardDescription>Campos preenchidos apenas num idioma.</CardDescription>
        </CardHeader>
        <CardContent>
          {missingTranslations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todos os textos têm versão em Português e em Inglês.</p>
          ) : (
            <ul className="max-h-80 divide-y overflow-y-auto text-sm">
              {missingTranslations.map(p => (
                <li key={p} className="flex items-center justify-between gap-3 py-2">
                  <span>{describePath(p, draft) || p}</span>
                  <Link href={hrefForMissing(p)} className="shrink-0 text-xs underline">
                    Editar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estrutura publicada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {draft.sections.map(s => (
            <div key={s.id} className={cn("flex items-center gap-2", !s.enabled && "text-muted-foreground line-through")}>
              <span className="w-24 shrink-0 text-xs text-muted-foreground">{s.page === "home" ? "Início" : "Projectos"}</span>
              <Link href={`/admin/seccoes/${s.id}`} className="hover:underline">
                {sectionName(s)}
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
