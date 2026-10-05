# Checklist de Verificação de Comandos

Este checklist documenta o **contrato de comando** de cada script `defence:*` no
`package.json`: propósito, flags, modos silencioso/formato, códigos de saída,
arquivo de teste e observações. Use-o ao verificar o comportamento de um script
(veja a skill `script-contract-verification`) ou ao adicionar um novo script.

## Modelo de entrada

Cada ferramenta é documentada com os seguintes campos:

- **Propósito** — o que o script faz e por que existe.
- **Scripts** — os aliases `defence:*` que o invocam.
- **Flags** — todas as flags CLI e argumentos posicionais suportados, com defaults.
- **Modos silencioso/formato** — comportamento de `--silent` e `--format` quando suportados.
- **Códigos de saída** — `0` para sucesso/sem problemas, `1` para falha/problemas.
- **Testes** — o arquivo que cobre o contrato.
- **Observações** — efeitos colaterais, arquivos de estado e ressalvas de segurança.

Procedimento de verificação para qualquer entrada: execute o script com
`--dry-run` (ou seu padrão somente-leitura), confirme que o código de saída
corresponde à tabela abaixo e compare o comportamento com o comentário de
cabeçalho no arquivo da ferramenta.

## Resumo por categoria

| Categoria | Scripts |
|---|---|
| Setup & Bootstrap | `defence:bootstrap`, `defence:check-engines`, `defence:install-monitored`, `defence:reinstall` |
| Gerenciamento de Dependências | `defence:add`, `defence:update`, `defence:update:interactive`, `defence:update:interactive:dry-run`, `defence:update-check`, `defence:update-check:force`, `defence:update-check:json`, `defence:update-check:offline`, `defence:analyze-lifecycle-scripts` |
| Auditoria & Verificação | `defence:pkg-age-check`, `defence:audit`, `defence:license-check`, `defence:license-check:fail`, `defence:license-check:json`, `defence:trust-report`, `defence:trust-report:json`, `defence:trust-report:fail`, `defence:check-lockfile-integrity`, `defence:check-hooks`, `defence:check-secrets`, `defence:generate-sbom` |
| Estado & Sincronização | `defence:sync-check`, `defence:sync-check:fix`, `defence:verify-defences`, `defence:verify-defences:fix`, `defence:update-badge`, `defence:update-badge:dry-run` |
| Documentação & Compliance | `defence:check-md-links`, `defence:check-external-urls`, `defence:check-external-urls:force` |
| Performance & Monitoramento | `defence:perf`, `defence:perf:baseline`, `defence:perf:check-package-age`, `defence:perf:check-updates` |
| Diversos | `defence:pre-commit` |

---

## Setup & Bootstrap

### setup-bootstrap.js

- **Propósito:** bootstrap em um comando para novos contribuidores (`npm ci` + portões de defesa).
- **Scripts:** `defence:bootstrap`
- **Flags:** nenhuma.
- **Modos silencioso/formato:** não suportados.
- **Códigos de saída:** `0` sucesso; `1` quando qualquer etapa do bootstrap falha.
- **Testes:** `tools/setup-bootstrap.test.js`
- **Observações:** executa `npm ci` (scripts de ciclo de vida desabilitados pelo `.npmrc`); seguro para reexecutar.
- **Docs:** [tools/setup-bootstrap.md](tools/setup-bootstrap.md)

### check-engines.js

- **Propósito:** verifica se as versões de Node.js/npm em execução satisfazem `engines` no `package.json`.
- **Scripts:** `defence:check-engines`
- **Flags:** nenhuma.
- **Modos silencioso/formato:** não suportados.
- **Códigos de saída:** `0` engines satisfeitas; `1` incompatibilidade ou `package.json` ilegível.
- **Testes:** `tools/check-engines.test.js`
- **Observações:** somente leitura; usado por `defence:reinstall` e pelo CI.
- **Docs:** [tools/check-engines.md](tools/check-engines.md)

### monitor-install.js

- **Propósito:** envolve a instalação de dependências com monitoramento de scripts de ciclo de vida e relatório.
- **Scripts:** `defence:install-monitored`
- **Flags:** `--format=<table|json>`, `--output=<path>` (destino do relatório).
- **Modos silencioso/formato:** `--format=json` muda o relatório para JSON.
- **Códigos de saída:** `0` instalação limpa; `1` instalação falhou ou atividade suspeita detectada.
- **Testes:** `tools/monitor-install.test.js`
- **Observações:** executa uma instalação real — não execute esperando dry-run; use `defence:add` para novos pacotes.
- **Docs:** [tools/monitor-install.md](tools/monitor-install.md)

### defence:reinstall (composto)

- **Propósito:** reinstalação "opção nuclear" quando a árvore de dependências é suspeita: verificação de engines, verificação de idade, `rm -rf node_modules`, limpeza de cache, `npm ci`, assinaturas, rebuild com aprovação, `audit fix` e uma re-verificação final de idade transitiva.
- **Scripts:** `defence:reinstall`
- **Flags:** nenhuma (pipeline fixo).
- **Códigos de saída:** `0` todas as etapas passaram; `1` na primeira etapa que falhar.
- **Testes:** coberto indiretamente pelos testes das ferramentas compostas.
- **Observações:** **destrutivo** — apaga `node_modules` e o cache do npm; nunca execute em CI sem intenção explícita.

---

## Gerenciamento de Dependências

### add-package.js

- **Propósito:** a única forma sancionada de adicionar uma dependência — executa portões de idade, proveniência, scripts de ciclo de vida e confiança antes de instalar.
- **Scripts:** `defence:add`
- **Flags:** posicional `pkg@x.y.z` (versão exata obrigatória); `--dry-run` (apenas portões, sem instalação); `--dev`; `--peer`.
- **Modos silencioso/formato:** não suportados.
- **Códigos de saída:** `0` todos os portões passaram (ou dry-run passou); `1` algum portão falhou.
- **Testes:** `tools/add-package.test.js`, `tools/integration.test.js`
- **Observações:** modifica `package.json`/`package-lock.json` exceto com `--dry-run`.
- **Docs:** [tools/add-package.md](tools/add-package.md)

### check-updates.js

- **Propósito:** scan somente-leitura de dependências desatualizadas; classifica elegível vs quarentena por idade de publicação e lista as versões `intermediateEligible`.
- **Scripts:** `defence:update-check`, mais as variantes `:force`, `:json`, `:offline`.
- **Flags:** `--force` (ignora cache), `--offline` (apenas cache), `--silent`, `--format=<table|json|markdown>`.
- **Modos silencioso/formato:** `--silent` suprime **apenas relatórios**; avisos de segurança (dessincronização, fallback offline) sempre são impressos no **stderr**. `--format` muda o renderizador do relatório.
- **Códigos de saída:** `0` em todos os caminhos normais (ferramenta consultiva, nunca bloqueia); `1` em erro interno.
- **Testes:** `tools/check-updates.test.js`, `tools/integration.test.js`
- **Observações:** grava o estado `.defence-update-check.json` (ignorado pelo git); nunca instala nada.
- **Docs:** [tools/check-updates.md](tools/check-updates.md)

### update-packages.js

- **Propósito:** aplica atualizações com segurança — instalações pinadas do maior alvo `intermediateEligible` aprovado no portão de idade, depois reexecuta todas as camadas de verificação.
- **Scripts:** `defence:update`, `defence:update:interactive`, `defence:update:interactive:dry-run`
- **Flags:** `--interactive` (y/n/q por pacote), `--dry-run`.
- **Modos silencioso/formato:** não suportados.
- **Códigos de saída:** `0` concluído (incluindo "nada a fazer"); `1` quando qualquer instalação ou verificação falha.
- **Testes:** `tools/update-packages.test.js`
- **Observações:** modifica dependências exceto com `--dry-run`; usa `npm update` genérico quando não há estado de scan; registra decisões em `.defence-update-decisions.json`.
- **Docs:** [tools/update-packages.md](tools/update-packages.md)

### analyze-lifecycle-scripts.js

- **Propósito:** inspeciona um pacote (ou o lockfile) em busca de scripts de ciclo de vida pre/post/install.
- **Scripts:** `defence:analyze-lifecycle-scripts`
- **Flags:** `--pkg=<name[@version]>`; `--fail` (saída 1 quando scripts são encontrados); `--silent`; `--format=<table|json>`.
- **Modos silencioso/formato:** `--silent` suprime a listagem; `--format=json` para máquinas.
- **Códigos de saída:** `0` sem scripts (ou sem `--fail`); `1` scripts encontrados com `--fail`, ou erro de consulta.
- **Testes:** `tools/analyze-lifecycle-scripts.test.js`
- **Docs:** [tools/analyze-lifecycle-scripts.md](tools/analyze-lifecycle-scripts.md)

---

## Auditoria & Verificação

### check-package-age.js

- **Propósito:** Camada de Defesa 1 — bloqueia pacotes publicados há menos de `minAgeDays`.
- **Scripts:** `defence:pkg-age-check`
- **Flags:** `--transitive` (varre todo o lockfile); `--pkg <name@version>` (pacote único).
- **Modos silencioso/formato:** não suportados.
- **Códigos de saída:** `0` todos os pacotes antigos o suficiente; `1` algum pacote abaixo da idade mínima.
- **Testes:** `tools/check-package-age.test.js`, `tools/integration.test.js`
- **Docs:** [tools/check-package-age.md](tools/check-package-age.md)

### run-audit-with-retry.js

- **Propósito:** envolve `npm audit --audit-level=high` com retry/backoff limitado para instabilidade do registry.
- **Scripts:** `defence:audit`
- **Flags:** nenhuma (parâmetros de retry vêm da config `retryFetch`).
- **Códigos de saída:** `0` auditoria limpa; `1` auditoria reporta vulnerabilidades altas/críticas após retries.
- **Testes:** `tools/run-audit-with-retry.test.js`
- **Docs:** [tools/run-audit-with-retry.md](tools/run-audit-with-retry.md)

### check-licenses.js

- **Propósito:** Camada de Defesa 9 — verifica licenças de dependências contra a política de allow/deny.
- **Scripts:** `defence:license-check`, mais as variantes `:fail` e `:json`.
- **Flags:** `--fail` (saída 1 em incompatível), `--transitive`, `--pkg=<name>`, `--silent`, `--format=<table|json|markdown>`.
- **Modos silencioso/formato:** `--silent` suprime a tabela; formatos mudam o renderizador.
- **Códigos de saída:** `0` compatível (ou sem `--fail`); `1` licença incompatível com `--fail`.
- **Testes:** `tools/check-licenses.test.js`
- **Docs:** [tools/check-licenses.md](tools/check-licenses.md)

### generate-trust-report.js

- **Propósito:** compõe sinais de idade, mantenedores, downloads e proveniência em um trust score por pacote.
- **Scripts:** `defence:trust-report`, mais as variantes `:json` e `:fail`.
- **Flags:** `--pkg <name@x.y.z>` (versão exata obrigatória), `--direct`, `--transitive`, `--fail`, `--silent`, `--format=<table|json>`, `--output=<path>`.
- **Modos silencioso/formato:** `--silent` suprime a tabela; `--format=json` para máquinas.
- **Códigos de saída:** `0` relatório gerado; com `--fail`, `1` quando o menor score fica abaixo do limiar configurado.
- **Testes:** `tools/generate-trust-report.test.js`
- **Docs:** [tools/generate-trust-report.md](tools/generate-trust-report.md)

### check-lockfile-integrity.js

- **Propósito:** verifica os campos de integridade do `package-lock.json` e a consistência com o `package.json`.
- **Scripts:** `defence:check-lockfile-integrity`
- **Flags:** `--silent`, `--format=<table|json|markdown>`.
- **Modos silencioso/formato:** `--silent` suprime o relatório; formatos mudam o renderizador.
- **Códigos de saída:** `0` lockfile íntegro; `1` problemas de integridade encontrados.
- **Testes:** `tools/check-lockfile-integrity.test.js`
- **Docs:** [tools/check-lockfile-integrity.md](tools/check-lockfile-integrity.md)

### check-hooks.js

- **Propósito:** Camada de Defesa 12 — verifica se `.husky/pre-commit` corresponde ao hash SHA-256 registrado no `package.json`.
- **Scripts:** `defence:check-hooks`
- **Flags:** nenhuma.
- **Códigos de saída:** `0` hashes iguais; `1` drift detectado (hook adulterado ou hash desatualizado).
- **Testes:** `tools/check-hooks.test.js`
- **Observações:** após editar intencionalmente `.husky/pre-commit`, siga a skill `pre-commit-hash-sync`.
- **Docs:** [tools/check-hooks.md](tools/check-hooks.md)

### check-secrets.js

- **Propósito:** varre arquivos em busca de segredos/tokens antes que sejam commitados.
- **Scripts:** `defence:check-secrets`
- **Flags:** caminhos de arquivo posicionais (usado pelo hook de pre-commit com arquivos staged).
- **Códigos de saída:** `0` nenhum segredo encontrado; `1` potencial segredo detectado.
- **Testes:** `tools/check-secrets.test.js`
- **Docs:** [tools/check-secrets.md](tools/check-secrets.md)

### generate-sbom.js

- **Propósito:** gera o SBOM do projeto (CycloneDX) para releases e auditorias.
- **Scripts:** `defence:generate-sbom`
- **Flags:** `--format=cyclonedx` (padrão), `--output=<path>`.
- **Modos silencioso/formato:** formato fixo em CycloneDX.
- **Códigos de saída:** `0` SBOM gravado; `1` geração falhou.
- **Testes:** `tools/generate-sbom.test.js`
- **Docs:** [tools/generate-sbom.md](tools/generate-sbom.md)

---

## Estado & Sincronização

### check-sync.js

- **Propósito:** verifica se `node_modules` corresponde ao `package-lock.json` (suporte à Camada 4).
- **Scripts:** `defence:sync-check`, `defence:sync-check:fix`
- **Flags:** `--fix` (executa `npm ci` para reparar), `--silent`.
- **Modos silencioso/formato:** `--silent` suprime a saída de sucesso.
- **Códigos de saída:** `0` sincronizado; `1` dessincronizado (sem `--fix`) ou reparo falhou.
- **Testes:** `tools/check-sync.test.js`, `tools/lib/sync-check.test.js`
- **Docs:** [tools/check-sync.md](tools/check-sync.md)

### verify-defences.js / install-defences.js

- **Propósito:** verifica se cada arquivo de defesa adotado corresponde ao manifesto SHA-256 (`verify-defences`); regenera o manifesto (`verify-defences:fix`); instala as defesas em outro projeto (`install-defences`).
- **Scripts:** `defence:verify-defences`, `defence:verify-defences:fix`
- **Flags:** `verify-defences`: `--json`, `-s`/`--silent`. `install-defences`: `--dry-run`, `--force`, `--update-local-manifest`, `--format=json`, `--tool=<name>`.
- **Códigos de saída:** `0` manifesto confere / instalação ok; `1` drift ou falha de instalação.
- **Testes:** `tools/verify-defences.test.js`, `tools/install-defences.test.js`
- **Observações:** `verify-defences:fix` reescreve `.defence-manifest.json` — commite-o junto com as mudanças de arquivo que causaram o drift.
- **Docs:** [tools/verify-defences.md](tools/verify-defences.md), [tools/install-defences.md](tools/install-defences.md)

### update-badge.js

- **Propósito:** mantém o badge de testes do README sincronizado com a contagem real do `node --test`.
- **Scripts:** `defence:update-badge`, `defence:update-badge:dry-run`
- **Flags:** `--dry-run`.
- **Códigos de saída:** `0` badge atualizado/inalterado; `1` a própria suíte de testes falhou.
- **Testes:** `tools/update-badge.test.js`
- **Observações:** invocado automaticamente pelo hook de pre-commit.
- **Docs:** [tools/update-badge.md](tools/update-badge.md)

---

## Documentação & Compliance

### check-md-links.js

- **Propósito:** valida todos os links locais da árvore de markdown.
- **Scripts:** `defence:check-md-links`
- **Flags:** `--force` (ignora o cache de resultados).
- **Códigos de saída:** `0` todos os links válidos; `1` links quebrados encontrados.
- **Testes:** `tools/check-md-links.test.js`
- **Observações:** usa `.md-links-cache.json` (ignorado pelo git) para velocidade.
- **Docs:** [tools/check-md-links.md](tools/check-md-links.md)

### check-external-urls.js

- **Propósito:** verifica se URLs externas em docs, customizações de AI e arquivos de configuração estão acessíveis.
- **Scripts:** `defence:check-external-urls`, `defence:check-external-urls:force`
- **Flags:** `--force` (revalida tudo), `--silent`.
- **Modos silencioso/formato:** `--silent` suprime o progresso por URL; falhas são sempre reportadas.
- **Códigos de saída:** `0` todas as URLs alcançáveis ou na allow-list; `1` URLs inalcançáveis encontradas.
- **Testes:** `tools/check-external-urls.test.js`
- **Observações:** URLs intencionalmente mortas ficam em `.github/known-dead-urls.md`; cache em `.external-urls-cache.json` (ignorado pelo git).
- **Docs:** [tools/check-external-urls.md](tools/check-external-urls.md)

---

## Performance & Monitoramento

### perf/benchmark.js

- **Propósito:** micro-benchmarks das ferramentas de defesa (tempo de execução, chamadas de rede, cache hits).
- **Scripts:** `defence:perf`, `defence:perf:baseline`, `defence:perf:check-package-age`, `defence:perf:check-updates`
- **Flags:** `--tool=<name>`, `--depth=<n>`, `--save-baseline`, `--silent`.
- **Modos silencioso/formato:** `--silent` suprime a saída por iteração.
- **Códigos de saída:** `0` benchmark concluído; `1` benchmark ou comparação com baseline falhou.
- **Testes:** `tools/perf/*.test.js`
- **Observações:** resultados alimentam `.defence-profile.json` (ignorado pelo git); baselines são comparáveis entre execuções.

---

## Diversos

### defence:pre-commit (composto)

- **Propósito:** a cadeia completa de portões de pre-commit: `npm audit signatures`, `defence:audit` (com retry), `defence:update-check`.
- **Scripts:** `defence:pre-commit`
- **Flags:** nenhuma (pipeline fixo).
- **Códigos de saída:** `0` todos os portões passaram; `1` no primeiro portão que falhar.
- **Testes:** coberto pelos testes das ferramentas compostas e pelo hook Husky.
- **Observações:** o `.husky/pre-commit` real executa camadas adicionais (lint, segredos, URLs externas, licenças, manifesto, badge).
