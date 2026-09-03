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

- Parse de especificadores de pacotes válidos e inválidos.
- Cálculo de idade dos pacotes e limitador de concorrência.
- Resolução de modo de dependência (`--dev`, `--peer`, padrão).
- Cenários de integração para `check-package-age` e `add-package` usando dependências injetadas, para que mocks e alterações no sistema de arquivos funcionem sem precisar iniciar processos filhos.
- Comportamento do bootstrap de primeiro setup quando `package-lock.json` está ausente.
- Comportamento do instalador cross-project, incluindo `--dry-run`, `--force`, detecção de conflitos e criação de backups.
- Fluxo controlado de atualização de dependências em `update-packages.js`.

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
