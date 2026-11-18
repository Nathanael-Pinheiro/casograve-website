# Caso Grave — landing page oficial

Landing page de `casograve.com.br`. HTML, CSS e JavaScript sem bibliotecas no navegador. O build não instala dependências e recria `dist/` do zero. Essa é a única pasta entregue pelo Cloudflare Pages.

## Versão e releases

A versão inicial é **1.0.0**. A tag `v1.0.0` identifica o código publicado no Cloudflare Pages em 18/11/2026. Consulte o [changelog](CHANGELOG.md) para o registro da versão e o [guia de versionamento](VERSIONING.md) para o fluxo de branches, tags e rollback.

## Prévia

Na pasta que contém este README, com Node.js 22 ou superior:

```sh
npm run build
npm run check
npm run preview
```

Abra **http://127.0.0.1:4173/**. No Windows, use `npm.cmd` no lugar de `npm` se o PowerShell bloquear os scripts do npm. O servidor escuta apenas no seu computador. Também é possível abrir `dist/index.html` diretamente no navegador após o build. As fontes, fotografias e capas desta versão estão incluídas na prévia.

## Manutenção

| Local | Conteúdo |
| --- | --- |
| `src/index.html`, `style.css`, `main.js` | Estrutura das seções, estilos e interações |
| `src/privacidade.html` | Informações sobre privacidade e serviços externos |
| `src/404.html`, `src/_headers` | Página para endereços inexistentes e cabeçalhos do Pages |
| `data/site.json` | Links, contatos, destaques, episódios do Tagima, mídia kit e métricas opcionais |
| `data/videos.json` | Seis vídeos longos mais recentes do RSS do canal |
| `assets/` | Originais recebidos, preservados no lugar |
| `src/assets/` | Fotografias otimizadas, fontes e capas para a primeira versão |
| `documentacao/auditoria-assets.md` | Inventário das fontes e decisões de uso |
| `documentacao/auditoria-publicacao.md` | Resultado dos testes locais de produção |

Após editar o conteúdo ou a configuração, rode o build novamente. Os links rápidos usam os mesmos destinos do cabeçalho, da comunidade e do contato. Para também exibir os números do canal nessa faixa, informe os três valores públicos confirmados em `metrics`. Para adicionar episódios, use `tagima.episodes`. O campo `mediaKit` deve ficar vazio até haver um link publicado. Se mudar o tratamento de dados ou adicionar analytics, revise a política de privacidade antes de publicar.

O WhatsApp comercial fica em `whatsapp`, no arquivo `data/site.json`. Atualize o número formatado e o link `https://wa.me/` juntos. Os grupos de Bastidores e Ofertas ficam em `community` e usam seus próprios links.

O script opcional `python scripts/prepare-images.py` usa Pillow para regenerar as imagens do site a partir dos originais. O build e o deploy usam as cópias já prontas. Barlow Condensed e Inter são servidas localmente; as licenças SIL OFL acompanham os arquivos.

## Atualização do YouTube

`python scripts/update-videos.py` consulta o [RSS da playlist de vídeos longos do Caso Grave](https://www.youtube.com/feeds/videos.xml?playlist_id=UULFhjDQpfacCuRNPFIJqy04sQ), sem Shorts. O script ordena pela data e escreve o JSON somente se os seis primeiros vídeos mudarem. A opção `--feed-file caminho.xml` permite testar com uma cópia local. Se o RSS falhar ou for inválido, o script mantém o último arquivo válido. Se o projeto estiver sem cache, a seção aponta para a aba Vídeos do canal.

O build incorpora os cartões no HTML e também inclui `/videos.json` no mesmo deploy. Os destaques são independentes do RSS. A primeira versão traz cópias das capas oficiais; nas novas publicações, a página tenta `maxresdefault.jpg` e recorre a `hqdefault.jpg` se a primeira imagem falhar. Se nenhuma carregar, o cartão continua com título e link sobre um fundo do Caso Grave.

## Publicação pelo GitHub e Cloudflare Pages

Execute estes passos quando autorizar a publicação. A raiz do repositório deve ser a **pasta que contém este README**, `package.json` e `.github/workflows`, não a pasta externa de mesmo nome. Envie os fontes para o GitHub. O Pages gera `dist/` durante o build; a pasta é ignorada pelo Git, assim como `.local/` e `node_modules/`. Os originais de `assets/` permanecem no projeto e não são servidos pelo Pages.

### 1. Primeiro envio ao GitHub

Crie um repositório **vazio** no GitHub, sem README, licença ou `.gitignore` gerados pelo site. Na pasta do projeto:

```powershell
Set-Location 'C:/Users/Nathan/Downloads/Caso_Grave_Landing_Page_Pacote/Caso_Grave_Landing_Page_Pacote'
npm.cmd run build
npm.cmd run check
git init -b main
git add --all
git status --short
git commit -m "Prepara landing page do Caso Grave para produção"
git remote add origin https://github.com/SEU-USUARIO/caso-grave.git
git push -u origin main
```

Substitua `SEU-USUARIO/caso-grave` pelo caminho do seu repositório. Se o Git pedir identificação antes do commit, configure `git config user.name "Seu nome"` e `git config user.email "Seu e-mail"`. Se o projeto já estiver em um repositório, use o `origin` e o branch existentes: não refaça `git init` e confira o remoto com `git remote -v` antes de enviar.

### 2. Configure o Pages

Em **Workers & Pages**, crie um projeto **Pages** com [integração GitHub](https://developers.cloudflare.com/pages/get-started/git-integration/). Autorize o acesso ao repositório e selecione-o.

| Campo no Cloudflare Pages | Valor |
| --- | --- |
| Production branch | `main` (ou o mesmo branch padrão do GitHub) |
| Framework preset | `None` |
| Root directory | Deixe em branco (raiz do repositório) |
| Build command | `npm run build && npm run check` |
| Build output directory | `dist` |
| Node.js | `22`, definido em `.node-version` |
| Build environment variable | `SKIP_DEPENDENCY_INSTALL=true` (o projeto não usa dependências) |

Deixe os deploys automáticos do branch de produção habilitados. Se configurar filtros de arquivos que acionam o build, inclua `data/videos.json`, além dos fontes e scripts. Consulte [configuração de build](https://developers.cloudflare.com/pages/configuration/build-configuration/) e [imagem de build](https://developers.cloudflare.com/pages/configuration/build-image/).

Ao iniciar o primeiro deploy, o Pages publica no endereço `pages.dev`. Inspecione esse endereço, `/videos.json`, `/privacidade` e uma URL inexistente (resposta 404). Só depois de revisar, adicione **casograve.com.br** em **Custom domains**. Siga a [documentação de domínios personalizados](https://developers.cloudflare.com/pages/configuration/custom-domains/) antes de alterar DNS e valide HTTPS e o comportamento de `www`.

### 3. Confira a atualização de vídeos

O workflow **Atualizar vídeos do Caso Grave** (`.github/workflows/update-videos.yml`) pode ser executado manualmente e é agendado no minuto 17 de cada hora, em UTC. O GitHub pode atrasar execuções agendadas. O job só opera no branch padrão e faz build e checagem antes de enviar um novo `data/videos.json`. Sem mudança, não cria commit; se o RSS falhar, o último cache fica intacto.

O workflow usa o `GITHUB_TOKEN` com `contents: write`. Habilite Actions e confira se as regras do repositório permitem que o token grave no branch padrão. A integração Git do Pages deve disparar um deploy ao receber o push. Depois de conectar os serviços, execute **Actions → Atualizar vídeos do Caso Grave → Run workflow** no branch padrão. Quando houver uma atualização, confirme no painel do Pages que o deploy corresponde ao commit do bot e que `/videos.json` reflete os vídeos novos. Se o feed não mudou, é esperado que não haja deploy.

O build e a consulta ao RSS podem ser verificados localmente. O primeiro deploy no Pages e a execução do workflow no GitHub só devem ser validados após a autorização.
