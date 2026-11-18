# Versionamento do Caso Grave

O projeto usa SemVer. A versão fica no campo `version` do `package.json` (sem prefixo) e aparece no Git como tag anotada com prefixo `v`. O [CHANGELOG.md](CHANGELOG.md) registra o que mudou para quem visita ou mantém o site.

| Incremento | Quando usar |
| --- | --- |
| **MAJOR** — `2.0.0` | Mudanças incompatíveis ou grandes reformulações, como remover ou substituir rotas públicas ou mudar radicalmente a experiência do site. |
| **MINOR** — `1.1.0` | Funcionalidade nova compatível com o restante do site, como uma seção opcional de promoções. |
| **PATCH** — `1.0.1` | Correções de bugs e pequenos ajustes compatíveis, como corrigir um link ou um problema de acessibilidade. |

Ao subir MAJOR, zere MINOR e PATCH. Ao subir MINOR, zere PATCH. Os commits automáticos que apenas renovam o catálogo `data/videos.json` são atualizações de conteúdo e não exigem uma release.

## Marco inicial: 1.0.0

O log do Cloudflare Pages de **18/11/2026** registra o build, as checagens e a publicação bem-sucedida do commit `37b7e9132cca59586528b860dbf46709814233e6` em produção. A tag anotada `v1.0.0` aponta para esse commit. O registro da release fica em um commit posterior, exclusivo de documentação.

Uma tag registra a versão do código. A publicação do site continua pelo fluxo do Cloudflare Pages ligado ao branch `main`: enviar um commit a esse branch pode disparar um novo deploy, inclusive quando a mudança é somente de documentação.

## Desenvolvimento

- `main`: código estável destinado à produção. O workflow de vídeos continua no branch padrão.
- `feature/*`: uma branch por funcionalidade, por exemplo `feature/promocoes-instrumentos`.
- `fix/*`: uma branch por correção, de preferência a partir de `main` se a correção for para produção.
- `develop`: branch de integração opcional, caso haja trabalho simultâneo que justifique a etapa extra. Até a equipe adotar esse fluxo, parta de `main`. Se `develop` for adotada, mantenha-a atualizada com `main`, incluindo o catálogo de vídeos, e revise as mudanças antes de promover uma release. `develop` não deve virar branch padrão nem branch de produção.

Revise as mudanças numa prévia local e execute `npm run build` e `npm run check`. Antes de integrar, confira as interações relevantes no navegador, inclusive em largura de celular. Integração, envio remoto e publicação seguem as aprovações do projeto.

## Próximas releases

1. Escolha o incremento pelo impacto da mudança. Registre o trabalho em `[Unreleased]` no topo do changelog, agrupando apenas o que se aplica sob **Adicionado**, **Alterado**, **Corrigido**, **Removido**, **Descontinuado** ou **Segurança**.
2. Na preparação da release, mova as entradas para `## [X.Y.Z] - AAAA-MM-DD` e sincronize o pacote com npm, por exemplo `npm version 1.1.0 --no-git-tag-version`. O comando não cria commit nem tag. Se houver um lockfile de npm no projeto, revise também a sincronização da versão da raiz; não atualize as dependências só para fazer a release.
3. Revise o diff, rode build e checagens, valide o navegador e registre o resultado. Após a integração autorizada, identifique o SHA estável que contém a release. Confirme a correspondência com o Cloudflare Pages quando a tag for usada para registrar uma versão publicada.
4. Com o commit validado, a árvore limpa e o nome da tag livre, crie a tag anotada explicitamente no SHA escolhido. Envie a tag e publique notas de release a partir do changelog somente após autorização.

Para criar uma tag, substitua `SHA_DO_DEPLOY_VALIDADO` e ajuste a versão:

```sh
git status --short
git show --no-patch SHA_DO_DEPLOY_VALIDADO
git tag --list 'v1.1.0'
git tag -a v1.1.0 SHA_DO_DEPLOY_VALIDADO -m "Caso Grave v1.1.0"
```

Se a tag já existir, confira o alvo em vez de recriá-la. Se a release registra um deploy de produção e seu SHA não puder ser comprovado ou não existir no clone, suspenda a criação até recuperar a referência correta.

Para consultar tags e conferir o alvo:

```sh
git tag --list 'v*' --sort=-version:refname
git show --no-patch v1.0.0
git rev-parse 'v1.0.0^{commit}'
```

## Recuperação e rollback

Para reconstruir uma versão antiga em uma pasta separada, preservando o checkout atual:

```sh
git worktree add --detach ../caso-grave-v1.0.0 v1.0.0
cd ../caso-grave-v1.0.0
npm run build
npm run check
npm run preview
```

Se a produção precisar voltar, confirme no Cloudflare Pages qual deploy anterior corresponde ao SHA ou à tag desejada. Após aprovação, use a opção de rollback para esse deploy e confira as rotas e interações principais. O rollback no Pages não muda `main`: um novo deploy, inclusive disparado pelo catálogo, pode republicar o código com problema. Coordene uma reversão via `git revert` ou uma correção revisada em `fix/*` e valide antes de promover. Não mova tags existentes nem reescreva o histórico com push forçado.

## Próxima funcionalidade: promoções de instrumentos

Comece em `feature/promocoes-instrumentos`, a partir do `main` estável (ou de `develop`, se ela já estiver em uso). Trate uma seção nova compatível como candidata a `1.1.0`.

Antes de implementar, teste OpenSERP e n8n fora do site de produção e defina o formato do catálogo, os critérios de deduplicação e validade de ofertas e como sinalizar links de afiliados. Valide preços, links e expiração com dados de teste. A seção deve saber ficar indisponível ou usar um último catálogo válido se a coleta falhar. Mantenha as credenciais fora do Git e do build publicado, confira o layout móvel e teste a falha da integração sem afetar a navegação atual. A entrada dessa seção na produção depende de revisão e autorização próprias.
