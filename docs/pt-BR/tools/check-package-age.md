# check-package-age

`check-package-age.js` rejeita pacotes que foram publicados recentemente demais. É a primeira linha de defesa contra malware recém-publicado.

## O que faz

- Lê dependências diretas do `package.json` ou transitivas do `package-lock.json`.
- Consulta o registro do npm para o timestamp de publicação de cada versão.
- Compara a idade com `pkgAgeCheck.minAgeDays`.
- Usa cache de registro em disco e camada compartilhada de retry para reduzir a carga no registro.

Implementado em [tools/check-package-age.js](../../../tools/check-package-age.js).

## Configuração

A idade mínima é configurada no `package.json`:

```json
{
  "pkgAgeCheck": {
    "minAgeDays": 7
  }
}
```

Para ignorar o cache durante a depuração:

```bash
DEFENCE_NO_CACHE=1 npm run defence:pkg-age-check
```

## Uso

```bash
# Apenas dependências diretas
npm run defence:pkg-age-check

# Incluir dependências transitivas
npm run defence:pkg-age-check -- --transitive

# Verificar um único pacote
npm run defence:pkg-age-check -- --pkg lodash@4.17.21
```

## Exemplo de saída

```text
lodash@4.17.21: publicado há 30 dias ✓
```

## Camada de defesa relacionada

- [Camada de Defesa 1 — Verificação de idade do pacote](../security/defense-layer-1-package-age.md)
