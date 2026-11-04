# Relatório de Dogfooding — Fase M.1 (2026-11-03)

Adoção das defesas deste repositório no projeto real
[`setup-webpack-stylus-liquid`](https://github.com/adrianoenache/setup-webpack-stylus-liquid)
(webpack/babel/postcss, 766 entradas no lockfile, uma dependência git-URL).

Este é um registro datado do que a instalação do toolkit de defesa num projeto
real e pré-existente revelou — e do que foi corrigido como resultado.

## O que funcionou de imediato

- O instalador recusou sobrescrever silenciosamente o `.husky/pre-commit`
  existente e abortou diante de scripts conflitantes no `package.json`
  (`setup`, `lint`) — o escape documentado (renomear os scripts do alvo para
  `setup:legacy`/`lint:legacy`, depois `--force` com backups automáticos)
  funcionou como projetado.
- Após a adoção: o `check-engines` valida contra as engines do *alvo*, o
  `check-npmrc` valida o `.npmrc` adotado, o manifesto verifica os 83
  arquivos copiados, e o registro do husky funcionou via o passo documentado
  `npm run prepare`.
- O `.npmrc` adotado imediatamente mostrou sua postura: o projeto carregava
  **29 vulnerabilidades conhecidas (2 críticas, 12 altas)** que o gate de
  pre-commit adotado agora bloqueia — a defesa fazendo seu trabalho.

## Gaps encontrados (e corrigidos neste repositório)

| # | Achado | Correção |
| --- | --- | --- |
| 1 | Dependências git-URL falhavam o portão de idade com um erro confuso de "no publish date" | `check-package-age.js` as ignora com um aviso (são fixadas por commit, não por data de publicação) |
| 2 | A mesma dependência git falhava a integridade do lockfile como "missing integrity" | `check-lockfile-integrity.js` reporta deps git/file numa seção informativa própria |
| 3 | O `check-sync` comparava versões instaladas contra o **range** do `package.json` (`^8.0.1`), reportando drift falso | A referência agora é a versão resolvida do lockfile |
| 4 | O instalador fixava pins de devDependencies (adotantes recebiam biome 2.5.8 com o projeto em 2.6.3) | Versões lidas do `package.json` da fonte no momento da instalação |
| 5 | O instalador nunca escrevia os blocos de configuração de defesa, então as ferramentas adotadas rodavam com defaults diferentes do comportamento documentado (a suíte do `check-md-links` adotado falhava no alvo) | Blocos de configuração são mesclados quando ausentes; os blocos do adotante sempre prevalecem |
| 6 | O gate `check-hooks` adotado nunca passaria: nenhum hash do hook no `package.json` do alvo | O instalador escreve `defences.huskyPreCommitHash` para o hook presente após a cópia |
| 7 | O instalador não tocava o `.gitignore`, então caches/estado das ferramentas podiam ser commitados | O instalador mescla as entradas de estado de defesa no `.gitignore` do alvo |
| 8 | O teste de config assertava o nome do diretório deste repositório; o teste CLI do SBOM truncava stdout em 1 MB — ambos só quebram dentro de um adotante | Testes agora são agnósticos ao nome do host e gravam o SBOM em arquivo temporário via `--output` |

## Validação após as correções

- Suíte adotada no projeto alvo: **549/549 testes passando** (as suítes de
  sanidade de `.github/` não são adotadas — elas protegem a superfície de AI
  deste próprio repositório).
- A dependência git é classificada corretamente pelos dois gates.
- Relevância real: o valor do toolkit nesta base é imediato — as
  vulnerabilidades encontradas são exatamente o que as camadas existem para
  bloquear.

## Lições para o toolkit

- Um instalador que só copia arquivos não basta: configuração, hashes de
  integridade e regras de ignore fazem parte da superfície adotada.
- Testes CLI que rodam contra o estado do host funcionam como sondas de saúde
  do host — úteis, mas não podem codificar o nome ou o tamanho deste
  repositório.
- Gates centrados no registry precisam de um caminho explícito para
  dependências não-registry (specs git/file/URL), ou punem setups legítimos
  com erros confusos.
