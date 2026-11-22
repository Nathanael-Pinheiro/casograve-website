# Changelog

Este arquivo registra as mudanças relevantes do site oficial do Caso Grave. As entradas seguem a estrutura do Keep a Changelog, e as versões seguem SemVer.

## [1.1.0] - 2026-11-22

Release local de desenvolvimento, sem publicação automática.

### Adicionado

- Popup de boas-vindas sobre a landing page, com a identidade visual existente e opções para assistir no YouTube, entrar nos Bastidores 🎸 ou continuar no site.
- Abertura dos links oficiais em nova aba, com fechamento imediato do popup e preservação da aba original.
- Fechamento por X, Escape e clique externo; foco contido, restauração do foco e bloqueio da rolagem do fundo enquanto o modal está aberto.
- Memória de fechamento por sessão com `sessionStorage`, sem interromper o site se o armazenamento estiver indisponível.
- Testes de navegador sem novas dependências, incluindo responsividade, falhas simuladas e comparação visual com a v1.0.0.

### Alterado

- Política de privacidade atualizada apenas para descrever a memória de sessão do popup.

## [1.0.0] - 2026-11-18

Marco inicial de versionamento do site Caso Grave. A tag `v1.0.0` registra o commit `37b7e9132cca59586528b860dbf46709814233e6`, publicado em produção no Cloudflare Pages em 18/11/2026. Esta entrada registra as funcionalidades já presentes nesse deploy.

### Adicionado

- Landing page responsiva com a apresentação do Caso Grave, os formatos do canal, o Projeto Tagima Ultra e a seção Sobre o Nathan.
- Navegação com atalhos para YouTube, Instagram, Bastidores, Ofertas, membros, parcerias e contato comercial.
- Catálogo dos seis vídeos longos mais recentes e dos cinco destaques. A atualização agendada consulta o RSS do YouTube, mantém o último cache válido em caso de falha e só grava o catálogo se houver mudanças.
- Área de comunidade para os grupos de Bastidores e Ofertas e para o programa de membros do YouTube.
- Área de parcerias e rodapé com contatos comerciais por WhatsApp e e-mail.
- Páginas de privacidade e de endereço não encontrado, além de metadados de compartilhamento, sitemap e robots.txt.
