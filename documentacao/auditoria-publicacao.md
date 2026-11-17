# Auditoria da publicação — Caso Grave

A versão de produção é a pasta `dist/`, gerada na raiz do projeto. A preparação não publicou o site, não criou repositório remoto e não alterou DNS.

| Área | Resultado local |
| --- | --- |
| Build | `npm run build` e `npm run check` concluídos. A saída é recriada a cada build e não inclui referências de desenvolvimento a localhost, 127.0.0.1 ou arquivos fora de `dist/`. |
| HTML, CSS e JavaScript | A landing page, a política de privacidade, o CSS e o JS foram servidos com os cabeçalhos de produção. Sem erro de JavaScript ou da política de segurança nesse teste. |
| Imagens e fontes | 15 imagens, 10 capas distintas para 11 cartões e duas fontes WOFF2 verificadas. No navegador, os 19 elementos de imagem e as duas fontes carregaram sem requisições externas no carregamento inicial. As licenças das fontes acompanham a saída. |
| Links | Âncoras e arquivos internos localizados. As 20 URLs externas únicas da landing page responderam com HTTP 200 após redirecionamentos, quando aplicáveis. Os links `mailto:` usam o e-mail comercial configurado. Nenhum grupo foi acessado com uma conta e nenhuma mensagem foi enviada. |
| Layout | Chrome testado a 320, 375, 768, 1050 e 1440 px. Sem rolagem horizontal. A navegação móvel abriu, levou à seção Vídeos e fechou após a seleção. |
| Rotas | `/`, `/privacidade`, `/videos.json`, `/robots.txt` e `/sitemap.xml` responderam. Endereços inexistentes retornaram 404; `/privacidade.html` redirecionou a `/privacidade` na prévia. |
| Preservação | Os hashes dos dez arquivos originais em `assets/` permaneceram iguais. Os originais não estão em `dist/`. |

O coletor consultou o RSS de vídeos longos do YouTube e encontrou os mesmos seis vídeos da versão entregue. O workflow tem execução manual e agendada e usa ações oficiais fixadas por commit. Em simulação com repositórios descartáveis, um RSS inválido preservou o cache, um cache igual não gerou commit e uma atualização gravou apenas `data/videos.json` no remoto local.

Depois de autorizar e conectar o repositório ao Pages, siga o [README](../README.md) para testar o primeiro deploy no endereço `pages.dev` e confirmar o deploy disparado pelo primeiro commit de atualização dos vídeos. O teste local não valida as permissões do repositório que será criado nem o vínculo com o Cloudflare.
