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

Todos os scripts customizados ficam em `tools/` e usam apenas módulos nativos do Node.js.

| Script | Propósito |
| --- | --- |
| `check-engines.js` | Valida se o Node.js e o npm ativos satisfazem o campo `engines` do package.json. |
| `check-package-age.js` | Impõe a idade mínima dos pacotes para dependências diretas ou transitivas. |
| `add-package.js` | Adiciona uma dependência com segurança, com verificações de idade, assinatura, audit, análise de scripts de lifecycle e idade transitiva. |
| `analyze-lifecycle-scripts.js` | Análise estática e somente leitura dos scripts de lifecycle de um pacote npm antes da instalação. |
| `lib/script-analyzer.js` | Motor compartilhado de análise de scripts de lifecycle usado por `analyze-lifecycle-scripts.js` e `add-package.js`. |
| `setup-bootstrap.js` | Realiza a primeira instalação controlada quando `package-lock.json` está ausente. |
| `update-packages.js` | Wrapper controlado para `npm update` com verificações pós-atualização e aprovação interativa opcional. |
| `check-updates.js` | Auxiliar somente leitura para pré-commit que avisa sobre atualizações elegíveis e em quarentena. Deduplica requisições ao registry por execução com cache em memória de packuments e reporta métricas de hit/miss. |
| `check-licenses.js` | Scanner somente leitura de licenças de dependências com classificação por lista de permissões e proibições. |
| `check-sync.js` | Comando standalone que verifica se `node_modules` corresponde ao `package-lock.json`. |
| `lib/sync-check.js` | Lógica compartilhada de sync-check usada por `check-updates.js` e `check-sync.js`. |
| `check-md-links.js` | Valida links internos na documentação markdown. Usa cache incremental baseado no hash SHA-256 do conteúdo, de modo que execuções repetidas só revalidam arquivos alterados. |
| `check-lockfile-integrity.js` | Verifica se cada entrada do lockfile possui um campo de integridade SHA-512. |
| `check-hooks.js` | Verifica se `.husky/pre-commit` corresponde ao hash conhecido em `package.json`. |
| `check-secrets.js` | Verifica arquivos em busca de possíveis segredos antes do commit. |
| `lib/registry-cache.js` | Cache de registro com TTL usado pelas ferramentas que consomem o registro. |
| `lib/retry-fetch.js` | Camada compartilhada de fetch para o registro com retry, gzip e limites de tamanho. |
| `lib/config.js` | Loader centralizado de configuração usado pelas ferramentas de defesa. |
| `lib/provenance.js` | Helpers para verificação de provenance e atestações SLSA de pacotes npm. |
| `update-badge.js` | Atualiza o badge de contagem de testes no `README.md` a partir de `tools/*.test.js`. |
| `generate-sbom.js` | Gera um SBOM CycloneDX 1.4 JSON a partir do `package-lock.json`. |
| `verify-defences.js` | Verifica arquivos copiados pelo `install-defences.js` contra `.defence-manifest.json`. |
| `install-defences.js` | Copia as defesas para outro projeto Node.js e escreve o manifesto. |
| `lib/package-utils.js` | Utilitários compartilhados para parse e validação de especificadores de pacotes. |
| `lib/trust-engine.js` | Agrega sinais existentes de supply chain em uma pontuação de confiança de 0 a 100 por pacote. |
| `generate-trust-report.js` | CLI do dashboard de trust score; emite relatórios em tabela, JSON ou Markdown. |
| `lib/process-monitor.js` | Hook nativo do Node.js para `spawn`, `spawnSync`, `exec` e `execSync` com classificação de risco. |
| `lib/install-monitor-report.js` | Formatador de relatórios Markdown/JSON a partir da saída do process-monitor. |
| `monitor-install.js` | Wrapper de CLI para executar qualquer comando `npm install`/`ci` sob monitoramento de processos. |
| `perf/benchmark.js` | Suite de benchmarks de performance medindo tempo de execução e chamadas de rede das ferramentas que consomem o registry. Compara os resultados com `tools/perf/baselines.json` para detectar regressões. |

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

## Testes

| Script | Propósito |
| --- | --- |
| `integration.test.js` | Testes de integração cross-tool com registry mockado e fixtures em memória. |
| `e2e/e2e.test.js` | Testes end-to-end opcionais contra o npm registry real. |

## Por Que Nenhum Framework de Testes de Terceiros?

O runner nativo `node:test` é suficiente para este projeto. Evitar Jest, Mocha ou Vitest remove outra dependência da supply chain e mantém o setup reprodutível com `npm ci`.
