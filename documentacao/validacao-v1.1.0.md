# Validação local da v1.1.0 — 2026-11-22

## Referências e escopo

- Repositório: `Nathanael-Pinheiro/casograve-website`.
- Início em `main`, com árvore limpa, no commit de documentação `35af0a67a1f82816e4eb2f7aa53dbab75115103f`. A consulta de leitura `git ls-remote origin refs/heads/main` confirmou o mesmo SHA no GitHub antes do desenvolvimento.
- Baseline: tag anotada `v1.0.0`, objeto `e240d9836142d2a69c5b88465700bfa34f322f4a`, apontando para `37b7e9132cca59586528b860dbf46709814233e6`.
- Branch de desenvolvimento: `feature/welcome-popup`. Sem merge, push, deploy ou mudanças de configuração de produção.
- Única funcionalidade nova: boas-vindas na página inicial, em um `dialog` nativo. A política de privacidade apenas passa a descrever a memória de sessão usada pelo componente.
- Nenhum arquivo do BassQuiz foi incluído ou modificado.

## Links

| Ação do popup | Fonte em data/site.json | Destino |
| --- | --- | --- |
| Assistir no YouTube | `youtube` | https://youtube.com/@casograve |
| Entrar nos Bastidores 🎸 | `community`, entrada Bastidores do Caso Grave | https://chat.whatsapp.com/B6R47kaVIYB67vpDWDiAi0 |

Os dois são links HTML com `target="_blank"` e `rel="noopener noreferrer"`. O teste usa cliques reais do navegador e confirma o destino na nova aba, `window.opener === null`, fechamento do modal e permanência na URL original. O convite não usa o número comercial. Os links existentes de Bastidores, Ofertas e contato permanecem intactos.

Os testes bloqueiam DNS externo no perfil isolado: verificam a abertura e o endereço solicitado, sem entrar no grupo nem avaliar a validade do convite no serviço do WhatsApp.

## Verificações

`npm run build` e `npm run check`: aprovados. O projeto continua sem dependências declaradas e sem lockfile; a versão foi incrementada com `npm version 1.1.0 --no-git-tag-version`.

`npm run test:welcome`: testes automatizados no Chrome instalado, usando CDP e recursos nativos do Node.js, sem pacotes ou downloads adicionais.

| Cenário | Resultado |
| --- | --- |
| Primeira visita e nova sessão isolada | Popup aberto sobre a landing page real |
| Overlay e animação | Preto com opacidade 65%; fade e deslocamento de 8px em 250ms |
| YouTube e Bastidores | Nova aba, sem opener; popup fechado; URL original preservada |
| Continuar no site | Fecha sem recarregar nem navegar |
| X, Escape e clique externo | Fecham e registram a sessão |
| Clique na mensagem interna | Mantém o popup aberto |
| Reload e ida/volta da privacidade | Não reabrem após o fechamento na mesma sessão |
| Teclado e acessibilidade | Nome acessível, foco inicial, Tab e Shift+Tab contidos no modal |
| Rolagem e foco anterior | Fundo bloqueado durante o modal; posição e foco preservados ao fechar |
| 320×568, 375×667, 768×1024, 1440×1000 e 667×375 | Sem overflow horizontal; modal dentro da tela; controles com pelo menos 44px; conteúdo rolável quando necessário |
| Movimento reduzido | Animação desabilitada |
| sessionStorage bloqueado | Popup pode ser fechado e a navegação continua |
| Falha ou ausência de showModal | Landing page utilizável, sem fundo bloqueado |
| JavaScript desabilitado | Popup oculto; conteúdo original disponível |
| Imagens e fontes nas comparações | Assets locais carregados |

## Comparação com a v1.0.0

A baseline foi extraída da tag para `.local/welcome-v1-lf/` com um índice Git temporário, sem alterar o índice do projeto. A extração preserva os finais de linha LF dos arquivos originais, iguais aos fontes do checkout inicial, evitando diferenças artificiais de CRLF no Windows. O build da baseline usa o mesmo Node.js do build atual.

Com a baseline já compilada, a comparação é executada assim:

```sh
node scripts/test-welcome.mjs .local/welcome-v1-lf
```

Esse modo usa também a porta local `4192`. A pasta `.local/`, os perfis e as capturas são ignorados pelo Git e não entram em `dist/`.

Os dois builds têm os mesmos **38 arquivos**. **34 são idênticos byte a byte**, incluindo imagens, fontes, thumbnails, catálogo, página 404, cabeçalhos e metadados de rotas. As diferenças esperadas são:

| Arquivo gerado | Diferença |
| --- | --- |
| index.html | Inclusão do dialog após o rodapé; removendo esse trecho, o HTML é idêntico ao original |
| style.css | Regras específicas do popup e suas animações |
| main.js | Inicialização do popup, fechamento, sessão, foco e rolagem |
| privacidade.html | Esclarecimento sobre sessionStorage |

As capturas da landing page após fechar o popup são idênticas às da v1.0.0 em **375px, 768px e 1440px**, comparadas pelo hash SHA-256 dos PNGs. Apenas o indicador temporário de rolagem do navegador é ocultado na comparação para evitar diferenças causadas pelo momento da captura.

As capturas `.local/welcome-375.png`, `.local/welcome-768.png` e `.local/welcome-1440.png` registram o modal aberto para revisão visual. No celular, as ações ficam empilhadas; no desktop, o painel tem largura de 540px, centralizado sobre o hero. O fundo, as fontes, a logo com a mesma inversão de cores já usada no cabeçalho e o amarelo reutilizam a identidade existente.

## Limites e publicação

A validação de telas móveis foi feita por emulação no Chrome, sem aparelho físico ou Safari. Quando sessionStorage está bloqueado, a frequência não pode ser garantida após recarregar; o fechamento e o restante do site continuam funcionando.

A v1.1.0 é uma release local. Não foram executados push, merge, deploy, mudanças em DNS, Workers, D1 ou no BassQuiz. O envio futuro da branch permite revisão; integrar em `main` pode disparar o deploy automático do Cloudflare Pages.
