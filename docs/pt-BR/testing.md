# Testes

O projeto usa o test runner nativo do Node.js (`node:test`) e o módulo de asserções (`node:assert/strict`). Não é necessário nenhum framework de testes de terceiros.

## Executando os Testes

```bash
npm test
```

## O Que Está Coberto

- Parse de especificadores de pacotes válidos e inválidos.
- Cálculo de idade dos pacotes e limitador de concorrência.
- Resolução de modo de dependência (`--dev`, `--peer`, padrão).
- Cenários de integração para `check-package-age` e `add-package` usando dependências injetadas, para que mocks e alterações no sistema de arquivos funcionem sem precisar iniciar processos filhos.

## Escrevendo Novos Testes

Os testes ficam em arquivos nomeados `*.test.js`. Use o runner nativo:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('description', () => {
  assert.equal(1 + 1, 2);
});
```

_Sincronizado em: 2026-08-18_
