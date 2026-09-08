# check-licenses

`check-licenses.js` varre as dependências e classifica suas licenças contra uma lista de permissões e uma lista de proibições. É somente-leitura e seguro para executar a qualquer momento.

## O que faz

- Lê dependências diretas ou transitivas do `package.json` e `package-lock.json`.
- Normaliza expressões SPDX incluindo `OR` e `AND`.
- Classifica cada licença como permitida, proibida ou desconhecida.
- Emite relatórios em tabela, JSON ou Markdown.
- Falha em licenças proibidas ou desconhecidas quando `--fail` é usado.

Implementado em [tools/check-licenses.js](../../../tools/check-licenses.js).

## Configuração

As listas são configuradas no `package.json` sob `licensesCheck`:

```json
{
  "licensesCheck": {
    "allowed": ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD"],
    "prohibited": ["GPL-3.0", "AGPL-3.0"],
    "failOnUnknown": false
  }
}
```

## Uso

```bash
# Verificar dependências diretas
npm run defence:license-check

# Incluir dependências transitivas
npm run defence:license-check -- --transitive

# Falhar se licenças proibidas ou desconhecidas forem encontradas
npm run defence:license-check -- --fail

# Saída JSON
npm run defence:license-check -- --format=json
```

## Exemplo de saída

```text
Pacote          Licença  Status
lodash@4.17.21  MIT      permitida
```

## Camada de defesa relacionada

- [Camada de Defesa 9 — Verificação de licença](../security/defense-layer-9-license-check.md)
