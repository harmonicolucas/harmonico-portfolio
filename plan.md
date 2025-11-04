# Plano de publicação no Manus

## Objectivo

Publicar definitivamente o portefólio de Harmónico Augusto na infraestrutura Manus, mantendo a área pública bilingue e o painel administrativo privado em `/admin`. A produção usará o deployment de servidor já preparado pelo projecto, a base MySQL gerida e o armazenamento durável dos media. A pré-visualização continuará a ser apenas o ambiente de revisão; a publicação será a versão de produção acessível através do URL permanente atribuído pelo Manus.

O pedido de endereço `harmonicolucas.manus.computer` será respeitado se a plataforma disponibilizar ou atribuir esse alias. A configuração disponível para este projecto não contém uma operação que permita reservar ou escolher manualmente um subdomínio `manus.computer`; portanto, não será inventado nem comunicado como existente antes de a publicação devolver o URL efectivo.

## Implementação

O Dockerfile já instala as dependências com a versão fixada de `pnpm`, compila o cliente Vite e o servidor Express, e inicia a app em produção. O endpoint `/api/health` fornece a verificação de disponibilidade pública. A publicação irá usar o checkpoint canónico do repositório Manus, sem migrar para Vercel e sem alterar o código de interface, a reprodução visual de referência, os conteúdos, as imagens ou a base de dados existente.

As variáveis privadas de autenticação, MySQL e armazenamento continuam geridas pelo Manus no runtime publicado. O painel em `/admin` continua protegido pelo fluxo OAuth e pelas permissões de administrador validadas no servidor. Os assets de media permanecem no armazenamento durável do projecto. Não se criará uma cópia adicional de dados nem se modificará o conteúdo existente durante o deployment.

A configuração de residência não será alterada: o deployment publicado mantém a política padrão da plataforma. Isto dá um URL permanente, mas a instância pode iniciar sob pedido após inactividade. A opção de servidor permanentemente residente depende de disponibilidade e confirmação própria da plataforma, não será presumida nem activada sem esse fluxo específico.

## Estrutura relevante

- `Dockerfile`: instalação, build e arranque do servidor de produção.
- `server/_core/` e `server/portfolio/`: Express, autenticação, CMS, API e SEO.
- `client/`: site público e painel administrativo com os estilos visuais existentes.
- `shared/` e `drizzle/`: validação de conteúdo e dados persistentes MySQL.
- `client/public/manus-routes.json`: rotas públicas declaradas.

## Identidade visual preservada

A publicação preserva a reprodução editorial/minimalista já implementada: tema claro `#d9dadd`, tema escuro `#0f1115`, Inter e Space Grotesk, hero de ecrã inteiro, linhas de fundo, marquee, pilhas de cartões e galeria de projectos. As animações, a resposta móvel, a navegação, os modos de cor e os suportes de acessibilidade não serão alterados.
