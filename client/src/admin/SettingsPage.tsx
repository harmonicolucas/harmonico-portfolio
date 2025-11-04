import { Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { newId, type NavItem } from "@shared/content";
import { move, useEditor } from "./editor";
import { EMPTY_L, LField, LinksField, MediaField, ReviewField, SelectField, SortableList, SwitchField, TextField } from "./fields";

const UI_LABELS: Record<string, string> = {
  backToTop: "Botão voltar ao topo",
  toggleTheme: "Botão de tema",
  openMenu: "Abrir menu",
  closeMenu: "Fechar menu",
  language: "Idioma",
  formTitle: "Formulário: título",
  formName: "Formulário: nome",
  formNamePh: "Formulário: exemplo de nome",
  formEmail: "Formulário: e-mail",
  formEmailPh: "Formulário: exemplo de e-mail",
  formMessage: "Formulário: mensagem",
  formMessagePh: "Formulário: exemplo de mensagem",
  formSubmit: "Formulário: botão enviar",
  formSending: "Formulário: a enviar",
  formSent: "Formulário: enviada",
  formError: "Formulário: erro",
  formMinimize: "Formulário: minimizar",
  formExpand: "Formulário: expandir",
  formClose: "Formulário: fechar",
  successTitle: "Confirmação: título",
  successText: "Confirmação: texto",
  successBtn: "Confirmação: botão",
  loading: "A carregar",
  loadError: "Erro ao carregar",
  retry: "Tentar novamente",
  emptySection: "Secção vazia",
  previewBanner: "Aviso de pré-visualização",
  previewExit: "Sair da pré-visualização",
  notFoundTitle: "Página 404: título",
  notFoundText: "Página 404: texto",
  backHome: "Página 404: botão",
  demo: "Ligação: demonstração",
  repo: "Ligação: repositório",
  watchVideo: "Ligação: vídeo",
  credential: "Ligação: credencial",
  credentialId: "ID da credencial",
  footerNav: "Rodapé: navegação",
  footerContact: "Rodapé: contacto",
  viewCv: "Ver CV",
  viewProject: "Ver projecto",
};

function NavEditor({ which }: { which: "items" | "workItems" }) {
  const { draft, update } = useEditor();
  const list = draft.settings.nav[which];
  const set = (fn: (l: NavItem[]) => void) => update(d => fn(d.settings.nav[which]));
  return (
    <div className="space-y-3">
      <SortableList
        items={list}
        onReorder={(from, to) => set(l => move(l, from, to))}
        render={(n, i, handle) => (
          <div className="flex flex-col gap-3 rounded-md border bg-card p-3 md:flex-row md:items-end">
            {handle}
            <LField className="flex-1" label="Texto" value={n.label} onChange={label => set(l => void (l[i]!.label = label))} />
            <TextField className="md:w-56" label="Destino" url value={n.href} onChange={href => set(l => void (l[i]!.href = href))} hint="ex.: /#sobre ou #tecnicos" />
            <SwitchField label="Visível" checked={n.visible} onChange={v => set(l => void (l[i]!.visible = v))} />
            <Button type="button" variant="ghost" size="icon" onClick={() => set(l => void l.splice(i, 1))} aria-label="Remover">
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      />
      <Button type="button" variant="outline" size="sm" disabled={list.length >= 12} onClick={() => set(l => void l.push({ id: newId("n"), label: EMPTY_L, href: "/#", visible: true }))}>
        <Plus className="size-4" /> Adicionar ligação
      </Button>
    </div>
  );
}

export function SettingsPage() {
  const { draft, update } = useEditor();
  const s = draft.settings;
  const hero = draft.sections.find(x => x.style === "hero");
  const about = draft.sections.find(x => x.style === "about");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Perfil e definições</h1>
        <p className="text-sm text-muted-foreground">Dados pessoais, menu, rodapé, currículo, SEO e todos os textos fixos da interface.</p>
      </div>
      <Tabs defaultValue="perfil">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="cv">Currículo</TabsTrigger>
          <TabsTrigger value="nav">Menu</TabsTrigger>
          <TabsTrigger value="footer">Rodapé</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="ui">Textos da interface</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="Nome apresentado" value={s.person.displayName} onChange={v => update(d => void (d.settings.person.displayName = v))} />
                <TextField label="Nome completo" value={s.person.fullName} onChange={v => update(d => void (d.settings.person.fullName = v))} />
              </div>
              <LField label="Título profissional" value={s.person.title} onChange={v => update(d => void (d.settings.person.title = v))} />
              <div className="grid gap-4 md:grid-cols-2">
                <LField label="Localização" value={s.person.location} onChange={v => update(d => void (d.settings.person.location = v))} />
                <TextField label="E-mail profissional" type="email" value={s.person.email} onChange={v => update(d => void (d.settings.person.email = v))} hint="Também usado nos dados estruturados de SEO." />
              </div>
              <ReviewField review={s.person.review} note="" onChange={v => update(d => void (d.settings.person.review = v.review))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Marca e fotografias</CardTitle>
              <CardDescription>Logótipo do menu e fotografias principais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="Letra do logótipo" value={s.brand.letter} onChange={v => update(d => void (d.settings.brand.letter = v.slice(0, 3)))} />
                <TextField label="Nome no menu" value={s.brand.name} onChange={v => update(d => void (d.settings.brand.name = v))} />
              </div>
              {hero && (
                <MediaField
                  label="Fotografia do hero (recorte com fundo transparente)"
                  value={hero.settings.image}
                  onChange={url => update(d => void (d.sections.find(x => x.id === hero.id)!.settings.image = url))}
                />
              )}
              {about && (
                <MediaField
                  label="Fotografia de perfil (secção Sobre mim)"
                  value={about.settings.image}
                  onChange={url => update(d => void (d.sections.find(x => x.id === about.id)!.settings.image = url))}
                />
              )}
              <p className="text-xs text-muted-foreground">
                A biografia e as estatísticas editam-se em{" "}
                {about ? (
                  <Link className="underline" href={`/admin/seccoes/${about.id}`}>
                    Secções › Sobre mim
                  </Link>
                ) : (
                  "Secções"
                )}
                .
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Botão «café» e idioma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SwitchField label="Mostrar botão «Paga-me um café»" checked={s.coffee.enabled} onChange={v => update(d => void (d.settings.coffee.enabled = v))} />
              <LField label="Texto do botão" value={s.coffee.label} onChange={v => update(d => void (d.settings.coffee.label = v))} />
              <SelectField
                label="Idioma por omissão"
                value={s.defaultLang}
                onChange={v => update(d => void (d.settings.defaultLang = v))}
                options={[
                  { value: "pt", label: "Português (/)" },
                  { value: "en", label: "English (/en)" },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cv">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Currículo (PDF)</CardTitle>
              <CardDescription>Os botões «Descarregar CV» só aparecem quando existir um ficheiro. Pode ter uma versão por idioma.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MediaField label="CV em Português" kind="document" value={s.cv.pt} onChange={v => update(d => void (d.settings.cv.pt = v))} />
              <MediaField label="CV em Inglês" kind="document" value={s.cv.en} onChange={v => update(d => void (d.settings.cv.en = v))} />
              <ReviewField review={s.cv.review} note="" onChange={v => update(d => void (d.settings.cv.review = v.review))} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nav" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Menu da página inicial</CardTitle>
            </CardHeader>
            <CardContent>
              <NavEditor which="items" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Menu da página de projectos</CardTitle>
            </CardHeader>
            <CardContent>
              <NavEditor which="workItems" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Botão principal (ex.: «Contrate-me»)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LField label="Texto" value={s.nav.cta.label} onChange={v => update(d => void (d.settings.nav.cta.label = v))} />
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="Destino" url value={s.nav.cta.href} onChange={v => update(d => void (d.settings.nav.cta.href = v))} />
                <SwitchField label="Visível" checked={s.nav.cta.visible} onChange={v => update(d => void (d.settings.nav.cta.visible = v))} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rodapé</CardTitle>
              <CardDescription>Use {"{year}"} para inserir o ano actual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SwitchField label="Mostrar rodapé" checked={s.footer.enabled} onChange={v => update(d => void (d.settings.footer.enabled = v))} />
              <LField label="Frase" value={s.footer.tagline} onChange={v => update(d => void (d.settings.footer.tagline = v))} />
              <LField label="Direitos de autor" value={s.footer.copyright} onChange={v => update(d => void (d.settings.footer.copyright = v))} />
              <LinksField label="Ligações do rodapé" max={12} value={s.footer.links} onChange={v => update(d => void (d.settings.footer.links = v))} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Motores de pesquisa e redes sociais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LField label="Título da página (30–60 caracteres)" value={s.seo.title} onChange={v => update(d => void (d.settings.seo.title = v))} />
              <LField label="Descrição (50–160 caracteres)" multiline value={s.seo.description} onChange={v => update(d => void (d.settings.seo.description = v))} />
              <LField label="Palavras-chave" value={s.seo.keywords} onChange={v => update(d => void (d.settings.seo.keywords = v))} />
              <MediaField label="Imagem de partilha (1200×630)" value={s.seo.ogImage} onChange={v => update(d => void (d.settings.seo.ogImage = v))} />
              <TextField
                label="Endereço público do site"
                value={s.seo.siteUrl}
                onChange={v => update(d => void (d.settings.seo.siteUrl = v.trim().replace(/\/+$/, "")))}
                placeholder="https://o-seu-dominio.com"
                hint="Necessário para URLs canónicos, hreflang e sitemap. Indique apenas a origem."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ui">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Textos fixos da interface</CardTitle>
              <CardDescription>Botões, formulário de contacto, mensagens de erro e estados vazios.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.keys({ ...UI_LABELS, ...s.ui }).map(k => (
                <LField key={k} label={UI_LABELS[k] ?? k} value={s.ui[k]} onChange={v => update(d => void (d.settings.ui[k] = v))} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
