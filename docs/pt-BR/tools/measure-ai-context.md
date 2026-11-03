# measure-ai-context

`measure-ai-context.js` mede a pegada de tokens de cada camada de customização de AI a partir do disco — instruções always-on, instructions com escopo, agents, skills e hooks — para que avaliações reportem números medidos em vez de estimativas.

## O que faz

- Percorre `.github/` e soma bytes por camada (skills contam apenas os arquivos `SKILL.md`; o índice gerado e recursos empacotados são excluídos).
- Converte bytes em tokens aproximados com a heurística padrão de ~4 bytes/token (para comparação entre camadas e ao longo do tempo, não para precisão de cobrança).
- Imprime uma tabela por camada ou um relatório legível por máquina.
- Mede a injeção dinâmica de `sessionStart` executando o hook `inject-context` uma vez (a base da decisão AI-3.1).

Implementado em [tools/measure-ai-context.js](../../../tools/measure-ai-context.js).

## Uso

```bash
npm run defence:measure-ai-context                       # tabela
node ./tools/measure-ai-context.js --format json         # legível por máquina
```

## Exemplo de saída

```text
AI context footprint (measured from disk):

  alwaysOn         1 file(s)     2996 bytes  ~749 tokens
  instructions     7 file(s)    12378 bytes  ~3095 tokens
  agents           9 file(s)    23942 bytes  ~5986 tokens
  skills          19 file(s)    51291 bytes  ~12823 tokens
  hooks            9 file(s)     2082 bytes  ~521 tokens
```

(O relatório também inclui uma linha `sessionStart` com o payload do `inject-context` medido no momento da execução.)

(A saída da ferramenta é em inglês.) Apenas as instruções always-on vão em **toda** requisição; as demais camadas carregam sob demanda por escopo/relevância.

## Relacionados

- Alimenta a seção de desenvolvimento assistido por AI do `PROJECT_STATUS_REPORT.md` (Fase J).
- Insumo da decisão AI-3.1 (se o hook inject-context precisa de otimização).
- Não é adotado em outros projetos: mede `.github/`, que adotantes só recebem via a feature de scaffolding de AI (v1.1.0).
