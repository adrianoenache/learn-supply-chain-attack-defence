# Testes

O projeto usa o test runner nativo do Node.js (`node:test`) e o módulo de asserções (`node:assert/strict`). Não é necessário nenhum framework de testes de terceiros.

## Executando os Testes

```bash
npm test
```

## Testes End-to-end

O projeto também inclui uma suíte E2E opcional que valida `check-package-age.js` e `add-package.js` contra pacotes estáveis no npm registry real. Esses testes são pulados por padrão para manter a suíte regular rápida e independente de rede.

```bash
npm run test:e2e
```

As respostas do registry são cacheadas em `tools/e2e/.cache/` por 24 horas para acelerar execuções repetidas localmente. Use `E2E_NO_CACHE=true` para forçar chamadas de rede frescas.

## O Que Está Coberto

- Parse de especificadores de pacotes válidos e inválidos (`tools/lib/package-utils.js`).
- Cálculo de idade dos pacotes e limitador de concorrência (`tools/check-package-age.js`).
- Resolução de modo de dependência (`--dev`, `--peer`, padrão).
- Validação de engines contra `package.json` `engines` (`tools/check-engines.js`).
- Verificação de atualizações disponíveis, score de confiança e modo offline
  (`tools/check-updates.js`).
- Verificação de licenças com tratamento de expressões SPDX
  (`tools/check-licenses.js`).
- Verificação de sincronização entre `node_modules` e `package-lock.json`
  (`tools/check-sync.js` e `tools/lib/sync-check.js`).
- Verificação de integridade do hook de pré-commit (`tools/check-hooks.js`).
- Scan de secrets (`tools/check-secrets.js`).
- Verificação de integridade do lockfile (`tools/check-lockfile-integrity.js`).
- Wrapper de retry para auditoria de vulnerabilidades
  (`tools/run-audit-with-retry.js`).
- Geração de SBOM (`tools/generate-sbom.js`).
- Atualizador do badge de testes no README (`tools/update-badge.js`).
- Cenários de integração para `add-package`, `check-package-age` e
  `check-updates` usando dependências injetadas, para que mocks e alterações no
  sistema de arquivos funcionem sem precisar iniciar processos filhos
  (`tools/integration.test.js`).
- Comportamento do bootstrap de primeiro setup quando `package-lock.json` está
  ausente (`tools/setup-bootstrap.js`).
- Comportamento do instalador cross-project, incluindo `--dry-run`, `--force`,
  detecção de conflitos, criação de backups e regeneração do manifesto
  (`tools/install-defences.js`).
- Fluxo controlado de atualização de dependências em `update-packages.js`.
- Bibliotecas compartilhadas de cache de registry, retry-fetch, provenance,
  typosquatting e profiler em `tools/lib/`.
- Testes de regressão de performance em `tools/perf/`.

## Verificações de Lint, Formatação e Links

O projeto usa Biome para lint e formatação. Execute estes comandos antes de commitar:

```bash
npm run lint                    # reporta problemas de lint e formatação
npm run lint:fix                # corrige automaticamente problemas seguros
npm run format                  # formata todos os arquivos configurados
npm run defence:check-md-links  # valida links locais de markdown
```

## Escrevendo Novos Testes

Os testes ficam em arquivos nomeados `*.test.js`. Use o runner nativo:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('description', () => {
  assert.equal(1 + 1, 2);
});
```

## Convenções de Design de Testes

### Injeção de Dependências

Os módulos de produção expõem funções setter como `setSpawnSyncImpl`, `setImpls`, `setNowImpl` e `resetNowImpl`. Prefira-as em vez de monkey-patching de globais. Isso torna os testes determinísticos e evita iniciar subprocessos reais.

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as myTool from './my-tool.js';

test('subprocesso mockado', () => {
  myTool.setSpawnSyncImpl((cmd, args) => ({ status: 0, stdout: '', stderr: '' }));
  // exercita myTool
  myTool.resetSpawnSyncImpl();
});
```

### Testes de Subprocesso

Quando precisar testar a superfície da CLI, use `spawnSync` de `node:child_process` com argumentos controlados. Evite depender de comandos reais do `npm` em testes unitários; injete a implementação de spawn quando o módulo suportar isso.

### Testes de Integração

O comportamento cross-tool é coberto em `tools/integration.test.js`. Esses testes usam um mock centralizado da camada HTTPS do registry (`tools/lib/retry-fetch.js`) e fixtures de sistema de arquivos em memória. Cada teste de integração tem um `timeout` explícito para prevenir travamentos.

### Lógica Dependente de Tempo

Para código que depende da data atual (por exemplo, cálculo de idade de pacote), use os hooks `setNowImpl` / `resetNowImpl` do módulo para tornar as asserções determinísticas.

## Cobertura

O projeto tem como meta ≥ 95% de line coverage usando a flag nativa de cobertura do Node.js:

```bash
npm run test:coverage
```

Não adicione ferramentas de cobertura externas como `c8`; elas podem introduzir dependências transitivas com licenças incompatíveis. A cobertura nativa é suficiente para os gates de qualidade atuais.

## Prevenção de Loops Infinitos

Todo teste que possa travar deve especificar um timeout:

```javascript
test('description', { timeout: 1000 }, () => {
  // ...
});
```

Em código de produção, use loops limitados, limites explícitos de iteração e condições de saída antecipada ao processar dados externos.

## Valores Hardcoded Intencionais

Se um teste precisar de um literal hardcoded (por exemplo, um fixture de edge case de parser como `>=99.0.0`), adicione um comentário inline explicando por que aquele valor permanece hardcoded e não é lido da configuração. Esta regra se aplica tanto ao código de produção quanto aos testes.
