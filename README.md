# Portefólio — Harmónico Augusto

Website bilingue PT/EN, construído para reproduzir a estrutura e linguagem visual do portefólio de referência, com conteúdos profissionais editáveis e painel administrativo privado.

## Desenvolvimento

- `pnpm dev` — servidor de desenvolvimento (porta `PORT`, por omissão 3000).
- `pnpm check` — verificação de tipos TypeScript.
- `pnpm test` — testes automatizados.
- `pnpm build` — compilação de produção.
- `pnpm start` — executar a compilação de produção.
- `pnpm db:migrate` — aplicar migrações existentes; `pnpm db:push` destina-se a alterações intencionais do esquema.

A aplicação usa React, Express, tRPC, Drizzle/MySQL e armazenamento persistente Manus. O servidor lê as credenciais apenas em runtime; não colocar segredos no frontend nem no Git.

## Painel administrativo

1. Abrir `/admin` e iniciar sessão com a conta Manus autorizada.
2. Na primeira activação, introduzir o código `ADMIN_SETUP_CODE` configurado no segredo seguro do projecto. A primeira conta é promovida a administradora; depois disso, novas reclamações de administrador são recusadas.
3. Gerir secções, projectos, perfil, imagens, vídeos, CV, mensagens e versões no painel. As alterações são guardadas como rascunho; **Publicar** substitui o conteúdo público. A pré-visualização usa `/?preview=1`.

Só utilizadores com o papel de administrador validado no servidor podem alterar conteúdos ou carregar ficheiros. O login usa Manus OAuth; o navegador não recebe a chave de armazenamento nem o código de activação.

## Conteúdo e publicação

- A página inicial está em `/` (PT) e `/en` (EN); os arquivos de projectos em `/projectos` e `/en/projects`.
- Os conteúdos fornecidos e os provisórios estão assinalados no painel para revisão. Não apresentar os campos provisórios como factos sem os confirmar.
- Em **Perfil e definições → SEO**, introduzir o endereço canónico HTTPS do domínio final. Enquanto o domínio não estiver configurado, o site omite URLs canónicos e o sitemap mantém-se sem URLs, em vez de inventar um domínio.
- `robots.txt` exclui `/admin` e `/api/`; `sitemap.xml` usa as quatro rotas públicas e o endereço canónico configurado.
- As imagens anexadas foram carregadas para armazenamento durável e o website guarda caminhos `/manus-storage/...`. O fallback de redireccionamento para downloads assinados existe apenas no servidor local de desenvolvimento.
- Remover um item da biblioteca retira o registo do catálogo, mas a API de armazenamento disponível à aplicação não apaga fisicamente os bytes; um URL já conhecido pode continuar acessível. Não usar esta acção como eliminação segura de dados confidenciais.
- Antes de tornar o site público, rever traduções, textos assinalados, e-mail de contacto, CV e domínio canónico no painel.

## Estrutura principal

- `client/src/portfolio/` — site público, navegação, conteúdo bilingue, tema e secções.
- `client/src/admin/` — interface do editor, uploads e páginas administrativas.
- `client/src/styles/` — estilos reproduzidos da referência e estilos complementares.
- `server/portfolio/` — persistência, procedimentos tRPC, uploads, segurança, SEO e documentos de crawler.
- `shared/content.ts` — esquema e tipos partilhados de conteúdo.
- `drizzle/` — esquema MySQL e migrações versionadas.
