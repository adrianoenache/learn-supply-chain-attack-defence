# Camada de Defesa 1 — Verificação de Idade dos Pacotes

A verificação de idade dos pacotes rejeita pacotes publicados muito recentemente. Isso dá tempo para a comunidade identificar malware antes que ele entre no projeto.

## Idade Mínima

A idade mínima padrão é **7 dias**.

## Implementação

Implementado em:

- [tools/check-package-age.js](../../../tools/check-package-age.js)
- [tools/add-package.js](../../../tools/add-package.js)

O `check-package-age.js` lê `package.json` (dependências diretas) ou `package-lock.json` (dependências transitivas), consulta o registry do npm para o timestamp de publicação de cada versão e falha se algum pacote for muito novo.

## Uso

```bash
# Apenas dependências diretas
npm run pkg-age-check

# Todas as dependências, incluindo as transitivas
npm run pkg-age-check -- --transitive
```

## Por Que 7 Dias?

A maioria dos lançamentos maliciosos é detectada em poucas horas ou dias. Um período de resfriamento de 7 dias reduz drasticamente a chance de instalar um pacote malicioso recém-publicado, sem atrasar significativamente o trabalho normal.

_Sincronizado em: 2026-08-18_
