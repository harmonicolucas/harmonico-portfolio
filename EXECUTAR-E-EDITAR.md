# Executar e editar o portefólio

## O que está incluído

Esta pasta contém o código-fonte versionado, os ficheiros de build e migração, os estilos do site, o painel administrativo, as fotografias originais fornecidas e as cópias arquivadas dos media usados no conteúdo inicial. As imagens guardadas em `portfolio-media/` são cópias de segurança; não alteram automaticamente os caminhos `/manus-storage/...` do conteúdo. O projecto não inclui `node_modules`, artefactos `dist`, credenciais, sessão Vercel/Manus, nem um dump da base de dados de produção.

## Requisitos

Use Node.js 22 LTS e pnpm 10.18.0. Na pasta `harmonico-portfolio`, instale as dependências:

```bash
corepack enable
corepack prepare pnpm@10.18.0 --activate
pnpm install --frozen-lockfile
```

Crie a configuração local e preencha-a com valores obtidos de forma segura:

```bash
cp .env.example .env
```

O ficheiro `.env.example` enumera as variáveis necessárias. Para usar o painel e os conteúdos existentes, é necessário acesso autorizado a um MySQL e aos serviços Manus OAuth/API/storage. O ZIP não contém esses segredos. Não copie credenciais para esta conversa, para o código ou para Git. O painel requer autenticação Manus; a primeira activação de administrador numa base nova exige `ADMIN_SETUP_CODE`.

## Comandos

```bash
pnpm dev       # desenvolvimento em http://localhost:3000
pnpm check     # TypeScript
pnpm test      # testes
pnpm build     # build de produção
pnpm start     # executar o build de produção
```

O servidor usa o valor de `PORT` quando definido. Se utilizar uma base de dados vazia, aplique as migrações existentes com `pnpm db:migrate`; confirme primeiro que `DATABASE_URL` aponta para a base pretendida. Não execute `pnpm db:push` contra produção sem uma alteração de esquema intencional e uma salvaguarda.

## Editar conteúdo e recursos

O frontend público encontra-se em `client/src/portfolio/`, o painel em `client/src/admin/`, os estilos em `client/src/styles/`, o modelo de conteúdo em `shared/content.ts` e o conteúdo inicial em `server/defaultContent.ts`. Os dados publicados, mensagens e configurações do CMS persistem na base de dados, não num ficheiro incluído no ZIP. As imagens remotas estão arquivadas em `portfolio-media/manus-storage/`; para uma instalação fora do Manus, carregue-as para um armazenamento autorizado e actualize as referências de media conforme necessário.

A versão publicada no Manus continua disponível em https://harmonico-ddoqlc8k.manus.space e o painel em `/admin`. Alterar esta cópia local não altera automaticamente o site publicado.
