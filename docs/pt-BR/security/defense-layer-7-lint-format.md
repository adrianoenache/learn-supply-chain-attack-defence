# Camada de Defesa 7 — Gate de Lint / Formatação

O Biome impõe um estilo de código consistente e detecta erros comuns antes que eles cheguem ao repositório.

## O Que Ele Verifica

O projeto usa [Biome](https://biomejs.dev/) tanto como linter quanto como formatter:

- **Formatter**: indentação, aspas, pontos-e-vírgulas e quebras de linha consistentes.
- **Linter**: regras recomendadas mais verificações estritas para imports e variáveis não utilizadas.

## Onde Executa

- `npm run lint` — reporta problemas.
- `npm run lint:fix` — corrige automaticamente problemas seguros.
- `npm run format` — formata todos os arquivos configurados.
- `.husky/pre-commit` — bloqueia commits que falham no `npm run lint`.

## Configuração

Veja [biome.json](../../../biome.json) para a configuração completa. Principais configurações:

- Aspas simples e pontos-e-vírgulas opcionais para JavaScript.
- Indentação de 2 espaços.
- Quebras de linha LF.
- `noUnusedImports` e `noUnusedVariables` tratados como erros.

## Por Que Isso Importa

Um código-base uniforme reduz a carga cognitiva, simplifica revisões e evita que bugs triviais (como imports não utilizados ou variáveis faltantes) sejam commitados.

_Sincronizado em: 2026-08-18_.
