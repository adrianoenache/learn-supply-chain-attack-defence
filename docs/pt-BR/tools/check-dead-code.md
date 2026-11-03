# check-dead-code

`check-dead-code.js` encontra *candidatos* a código morto no toolset de defesa: exports que nenhum consumidor referencia e arquivos que ninguém importa. É deliberadamente **consultivo** — sempre sai com código 0 — porque análise estática de CommonJS não consegue provar inalcançabilidade nesta base de código.

## O que faz

- Coleta os arquivos de produção em `tools/` (excluindo testes e o harness local `tools/e2e/`).
- Extrai os exports de cada arquivo (chaves do objeto `module.exports`, accessors get/set e atribuições `module.exports.<nome>`).
- Resolve consumidores pelos padrões reais de require da base: desestruturado (literal ou `path.resolve`), bindings de namespace com acesso a membros, **acesso inline `require(...).member()`**, harnesses de teste indiretados por alias (constantes `SCRIPT_PATH` — a primeira declaração vence para que strings de fixture embutidas não roubem o alias), e um fallback de presença textual quando o binding flui por uma função auxiliar.
- Trata alvos de scripts npm como entry points de CLI e requires bare de efeito colateral como opacos (todos os exports conservadoramente mantidos).

Implementado em [tools/check-dead-code.js](../../../tools/check-dead-code.js).

## Uso

```bash
npm run defence:check-dead-code                  # lista de candidatos legível
node ./tools/check-dead-code.js --format json    # legível por máquina
node ./tools/check-dead-code.js --silent         # apenas exit code
```

## Regras de triagem (importante)

A saída é uma **lista de candidatos, nunca uma lista de remoção**:

- **Desexporte, não delete** quando o símbolo ainda é usado dentro do próprio arquivo.
- **Mantenha e adicione um teste** para pontos de extensão documentados e helpers puros que merecem cobertura direta.
- **A suíte completa `npm test` é a árbitra** depois de agir sobre qualquer candidato — ela deve permanecer verde. (Agir sobre uma lista imatura quebrou 35 testes em 2026-11-03; ver `DECISIONS.md`.)

## Por que consultivo?

O contrato de DI (`setImpls`/`resetImpls`) e os padrões dinâmicos de consumo tornam falsos positivos inevitáveis. Um gate rígido no CI bloquearia exports legítimos ou forçaria ruído de anotações num recurso educacional. Ver o ADR em `DECISIONS.md` (2026-11-03).

## Relacionados

- Eixo 3 da skill `code-review-pass` (remoção de código morto), ao lado de qualidade, segurança e revisão de documentação.
