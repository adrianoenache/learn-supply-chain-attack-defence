# Ferramentas

Este projeto depende de um pequeno conjunto de ferramentas cuidadosamente escolhidas. Cada ferramenta é nativa do ecossistema Node.js ou escrita com módulos nativos, mantendo a superfície de supply chain mínima.

## Runtime

### Node.js >= 24.19.0

O projeto utiliza uma versão recente da linha LTS do Node.js para garantir suporte a:

- `node:test` e `node:assert/strict` (sem framework de testes de terceiros).
- Aplicação do `min-release-age` no npm.
- APIs modernas como `fetch` e `AbortController`, se necessário no futuro.

### npm >= 11.17.0

O npm é o gerenciador de pacotes. O projeto o utiliza tanto para instalação quanto como primitivo de segurança por meio de comandos como `npm audit signatures` e `npm audit --audit-level=high`.

## Dependências de Desenvolvimento

### Husky 9.1.7

[Husky](https://typicode.github.io/husky/) gerencia os hooks do Git. Ele instala o hook `.husky/pre-commit` para que cada commit execute automaticamente as verificações defensivas do projeto.

**Critérios de seleção**:

- Amplamente adotado e minimalista.
- Publicado há mais de 7 dias antes da adoção (verificado pelo `defence:add`).
- Não requer scripts de postinstall em uso normal.

### Biome 2.5.8

[Biome](https://biomejs.dev/) é o linter e formatter do projeto. Substitui o ESLint + Prettier por uma única toolchain rápida.

**Critérios de seleção**:

- Linter e formatter unificados.
- Performance nativa e pequena pegada de dependências.
- A versão 2.5.8 tinha pelo menos 7 dias de publicação no momento da adoção (2026-08-18), satisfazendo `min-release-age=7`.

## Scripts Customizados

Todos os scripts customizados ficam em `tools/` e usam apenas módulos nativos do Node.js. Cada ferramenta tem uma página dedicada com exemplos de uso e camadas de defesa relacionadas; veja o [índice de referência de ferramentas](tools/).

| Script | Propósito | Página |
| --- | --- | --- |
| `add-package.js` | Adiciona uma dependência com segurança, com verificações de idade, assinatura, audit, análise de scripts de lifecycle e idade transitiva. | [add-package](tools/add-package.md) |
| `analyze-lifecycle-scripts.js` | Análise estática e somente leitura dos scripts de lifecycle de um pacote npm antes da instalação. | [analyze-lifecycle-scripts](tools/analyze-lifecycle-scripts.md) |
| `check-engines.js` | Valida se o Node.js e o npm ativos satisfazem o campo `engines` do package.json. | [check-engines](tools/check-engines.md) |
| `check-external-urls.js` | Valida acessibilidade de URLs externas na documentação e arquivos fonte. | [check-external-urls](tools/check-external-urls.md) |
| `check-hooks.js` | Verifica se `.husky/pre-commit` corresponde ao hash conhecido em `package.json`. | [check-hooks](tools/check-hooks.md) |
| `check-licenses.js` | Scanner somente leitura de licenças de dependências com classificação por lista de permissões e proibições. | [check-licenses](tools/check-licenses.md) |
| `check-lockfile-integrity.js` | Verifica se cada entrada do lockfile possui um campo de integridade SHA-512. | [check-lockfile-integrity](tools/check-lockfile-integrity.md) |
| `check-md-links.js` | Valida links internos na documentação markdown. | [check-md-links](tools/check-md-links.md) |
| `check-package-age.js` | Impõe a idade mínima dos pacotes para dependências diretas ou transitivas. | [check-package-age](tools/check-package-age.md) |
| `check-secrets.js` | Verifica arquivos em busca de possíveis segredos antes do commit. | [check-secrets](tools/check-secrets.md) |
| `check-sync.js` | Comando standalone que verifica se `node_modules` corresponde ao `package-lock.json`. | [check-sync](tools/check-sync.md) |
| `check-updates.js` | Auxiliar somente leitura para pré-commit que avisa sobre atualizações elegíveis e em quarentena. | [check-updates](tools/check-updates.md) |
| `generate-sbom.js` | Gera um SBOM CycloneDX 1.4 JSON a partir do `package-lock.json`. | [generate-sbom](tools/generate-sbom.md) |
| `generate-trust-report.js` | CLI do dashboard de trust score; emite relatórios em tabela, JSON ou Markdown. | [generate-trust-report](tools/generate-trust-report.md) |
| `install-defences.js` | Copia as defesas para outro projeto Node.js e escreve o manifesto. | [install-defences](tools/install-defences.md) |
| `monitor-install.js` | Wrapper de CLI para executar qualquer comando `npm install`/`ci` sob monitoramento de processos. | [monitor-install](tools/monitor-install.md) |
| `run-audit-with-retry.js` | Wrapper para `npm audit` com retry em erros transitórios de rede. | [run-audit-with-retry](tools/run-audit-with-retry.md) |
| `setup-bootstrap.js` | Realiza a primeira instalação controlada quando `package-lock.json` está ausente. | [setup-bootstrap](tools/setup-bootstrap.md) |
| `update-badge.js` | Atualiza o badge de contagem de testes no `README.md` a partir de `tools/*.test.js`. | [update-badge](tools/update-badge.md) |
| `update-packages.js` | Wrapper controlado para `npm update` com verificações pós-atualização e aprovação interativa opcional. | [update-packages](tools/update-packages.md) |
| `verify-defences.js` | Verifica arquivos copiados pelo `install-defences.js` contra `.defence-manifest.json`. | [verify-defences](tools/verify-defences.md) |

### Bibliotecas compartilhadas

| Biblioteca | Propósito |
| --- | --- |
| `lib/config.js` | Loader centralizado de configuração usado pelas ferramentas de defesa. |
| `lib/install-monitor-report.js` | Formatador de relatórios Markdown/JSON a partir da saída do process-monitor. |
| `lib/package-utils.js` | Utilitários compartilhados para parse e validação de especificadores de pacotes. |
| `lib/process-monitor.js` | Hook nativo do Node.js para `spawn`, `spawnSync`, `exec` e `execSync` com classificação de risco. |
| `lib/provenance.js` | Helpers para verificação de provenance e atestações SLSA de pacotes npm. |
| `lib/profiler.js` | Profiler leve usado pelas ferramentas com instrumentação `withProfile`. |
| `lib/registry-cache.js` | Cache de registro com TTL usado pelas ferramentas que consomem o registro. |
| `lib/retry-fetch.js` | Camada compartilhada de fetch para o registro com retry, gzip e limites de tamanho. |
| `lib/script-analyzer.js` | Motor compartilhado de análise de scripts de lifecycle usado por `analyze-lifecycle-scripts.js` e `add-package.js`. |
| `lib/sync-check.js` | Lógica compartilhada de sync-check usada por `check-updates.js` e `check-sync.js`. |
| `lib/trust-engine.js` | Agrega sinais existentes de supply chain em uma pontuação de confiança de 0 a 100 por pacote. |
| `lib/typosquatting.js` | Detecção de typosquatting e confusão de dependência por distância de Levenshtein. |

## Hardening do `.npmrc`

O projeto mantém um [.npmrc](../../.npmrc) endurecido na raiz. Ele é copiado para projetos adotados pelo `install-defences.js`. Veja o [guia de hardening do `.npmrc`](npmrc-hardening.md) para entender a razão de cada configuração, opções consideradas mas não adotadas, e orientações para registries privados e patches de emergência.

## Benchmarks de Performance

A suite `tools/perf/benchmark.js` mede o comportamento das ferramentas dependentes do registry em condições controladas:

| Script npm | Propósito |
| --- | --- |
| `npm run defence:perf` | Executa a suite completa de benchmarks e compara os resultados com `tools/perf/baselines.json`. |
| `npm run defence:perf:baseline` | Re-salva os resultados atuais como baseline. Execute isto após melhorias deliberadas de performance. |
| `npm run defence:perf:check-package-age` | Executa apenas o benchmark de `check-package-age`. |
| `npm run defence:perf:check-updates` | Executa apenas o benchmark de `check-updates`. |

Uma regressão é sinalizada quando uma métrica fica pior que a baseline em mais de 20%. Mantenha a baseline commitada para que o CI possa detectar lentidões ou chamadas de rede extras não intencionais.

## Dashboard de Trust Score

| Script npm | Propósito |
| --- | --- |
| `npm run defence:trust-report` | Gera um relatório Markdown de trust score para todas as dependências. |
| `npm run defence:trust-report:json` | Gera saída JSON para consumo programático. |
| `npm run defence:trust-report:fail` | Falha (exit code 1) se algum pacote estiver abaixo do mínimo configurado. |

Veja [Trust scoring](trust-scoring.md) para detalhes dos sinais, configuração e integração com `defence:add`.

## Manifesto de Adoção

Quando `install-defences.js` copia as defesas para outro projeto, ele escreve `.defence-manifest.json` com hashes SHA-256 de cada arquivo copiado. O projeto de origem mantém seu próprio manifesto commitado para que `npm run defence:verify-defences` possa detectar drift no CI.

Como edições legítimas nos arquivos copiados naturalmente alteram seus hashes, o hook de pré-commit regenera o manifesto automaticamente. Você também pode atualizá-lo manualmente:

| Script npm | Propósito |
| --- | --- |
| `npm run defence:verify-defences` | Compara os arquivos atuais com `.defence-manifest.json` e reporta divergências. |
| `npm run defence:verify-defences:fix` | Recomputa os hashes a partir da árvore de origem atual e sobrescreve `.defence-manifest.json`. |

Execute o script de correção após qualquer mudança deliberada nos arquivos listados em `install-defences.js`, depois commit o manifesto atualizado.

## Integração com CI/CD

As ferramentas se integram ao workflow do GitHub Actions descrito em [Visão geral de CI/CD](ci-cd-overview.md). Integrações principais:

- `generate-sbom.js` produz o artefato SBOM enviado pelo job `defence-gates` (veja [SBOM e Conformidade](sbom-and-compliance.md)).
- `verify-defences.js` e `install-defences.js --dry-run` executam no job `install-defences-dry-run` para detectar drift do manifesto.
- `perf/benchmark.js` suporta verificações de regressão de performance no CI (veja [Ajuste de Performance](performance-tuning.md)).

## Testes

| Script | Propósito |
| --- | --- |
| `integration.test.js` | Testes de integração cross-tool com registry mockado e fixtures em memória. |
| `e2e/e2e.test.js` | Testes end-to-end opcionais contra o npm registry real. |

## Por Que Nenhum Framework de Testes de Terceiros?

O runner nativo `node:test` é suficiente para este projeto. Evitar Jest, Mocha ou Vitest remove outra dependência da supply chain e mantém o setup reprodutível com `npm ci`.
