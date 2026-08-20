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
