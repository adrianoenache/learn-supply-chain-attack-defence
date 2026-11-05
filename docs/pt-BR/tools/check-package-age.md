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

# Modo quiet: suprime saída de sucesso, mantém falhas (CI)
npm run defence:pkg-age-check -- --quiet
```

`--silent` permanece como alias de compatibilidade de `--quiet`.

## Exemplo de saída

```text
Checking publish age for 2 declared (package.json) package(s) (minimum: 7 days)...

  ✓ OK   lodash@4.17.21 — published 2026-10-01 (32.5 days ago)
  ✓ OK   husky@9.1.7 — published 2026-08-01 (94.0 days ago)

── Summary ───────────────────────────────────────────
  ✓ OK   2 passed
```

Quando um pacote está abaixo da idade mínima, a execução falha e o sumário aponta o próximo passo:

```text
Package age check FAILED — 1 package(s) below minimum age of 7 days:
  ✗ FAIL fresh-pkg@1.0.0 — published 2026-11-04 (1.2 days ago)

── Summary ───────────────────────────────────────────
  ✓ OK   1 passed
  ✗ FAIL 1 failed
  Next: inspect publish dates with `npm view <pkg> time` or pin an older version
```

(A saída da ferramenta é em inglês.)

## Camada de defesa relacionada

- [Camada de Defesa 1 — Verificação de idade do pacote](../security/defense-layer-1-package-age.md)

## Dependências fora do registry

URLs git, specs `file:`/`link:`/`workspace:` e URLs de tarball hospedadas fora do registry configurado não podem ser verificadas por idade contra o registry — são fixadas por commit ou caminho, não por data de publicação. A ferramenta as reporta como `SKIP` com um aviso (verifique-as manualmente) em vez de falhar com um erro de consulta ao registry. No modo `--transitive`, a URL `resolved` do lockfile é comparada ao host do registry configurado, então tarballs do próprio registry continuam sendo verificados normalmente.
