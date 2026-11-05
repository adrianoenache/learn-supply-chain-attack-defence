# analyze-lifecycle-scripts

`analyze-lifecycle-scripts.js` realiza uma análise estática e somente-leitura dos scripts de lifecycle de um pacote npm antes da instalação. Ele sinaliza padrões de risco sem executar nenhum código.

## O que faz

- Busca o manifesto do pacote no registro.
- Extrai entradas de `scripts` como `postinstall`, `preinstall` e `prepare`.
- Classifica o risco com base em padrões de comando (rede, shell, ofuscação, compilação nativa etc.).
- Emite relatórios em tabela, JSON ou Markdown.
- Sai com código diferente de zero quando `--fail` é usado e scripts de alto risco são detectados.

Implementado em [tools/analyze-lifecycle-scripts.js](../../../tools/analyze-lifecycle-scripts.js).

## Uso

```bash
# Analisar um pacote específico
npm run defence:analyze-lifecycle-scripts -- --pkg=sharp@0.33.5

# Saída JSON para revisão programática
npm run defence:analyze-lifecycle-scripts -- --pkg=sharp@0.33.5 --format=json

# Falhar em scripts de alto risco
npm run defence:analyze-lifecycle-scripts -- --pkg=sharp@0.33.5 --fail
```

## Exemplo de saída

```text
⚠️ Lifecycle script analysis summary

Packages analyzed: 1
Packages with lifecycle scripts: 1
Overall risk level: HIGH
Findings: 2 (high: 1, medium: 1, low: 0)

<tabela de achados>

── Summary ───────────────────────────────────────────
  ✓ OK   1 passed
```

Com `--fail` em pacote de alto risco o código de saída é 1 e o sumário mostra `1 failed` com dica de `Next:`. `--quiet` (alias `--silent`) suprime o relatório e o sumário.

(A saída da ferramenta é em inglês.)

## Camadas de defesa relacionadas

- [Análise de scripts de lifecycle](../security/lifecycle-script-analysis.md)
- [Camada de Defesa 3 — Auditoria de vulnerabilidades](../security/defense-layer-3-vulnerabilities.md)
