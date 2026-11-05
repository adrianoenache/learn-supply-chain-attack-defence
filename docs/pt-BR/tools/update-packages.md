# update-packages

`update-packages.js` é um wrapper controlado para o `npm update` que reexecuta os portões de defesa após a atualização.

## O que faz

- Carrega as atualizações elegíveis de `.defence-update-check.json` (produzido pelo `defence:update-check`).
- Resolve o alvo de cada pacote como a maior versão de `intermediateEligible` (já aprovada no portão de idade no momento do scan), com fallback para `latest` em arquivos de estado antigos.
- **Quarentena acionável:** pacotes em quarentena cujo único bloqueio é idade (`too recent`) e que têm intermediárias aprovadas no portão também são oferecidos/aplicados — a intermediária passou pelo mesmo portão de idade; `latest` permanece bloqueado até passar. Falhas de consulta ao registry nunca são acionáveis.
- Instala alvos fixados com `npm install --save-exact --ignore-scripts <pkg>@<alvo>`; usa o `npm update` genérico (dentro do range) apenas quando não existe estado de scan.
- Reexecuta verificações de idade, assinatura, auditoria de vulnerabilidades e licenças.
- Suporta aprovação interativa de cada atualização.
- Suporta modo dry-run para pré-visualização segura.

Implementado em [tools/update-packages.js](../../../tools/update-packages.js).

## Uso

```bash
# Atualização não-interativa com pós-verificações
npm run defence:update

# Aprovação interativa
npm run defence:update -- --interactive

# Pré-visualização em dry-run
npm run defence:update -- --interactive --dry-run
```

## Exemplo de saída

Saída real de dry-run (capturada em 2026-11-03; a ferramenta imprime em inglês):

```text
[dry-run] Would update dependencies with:
  - pinned quarantine intermediate: @biomejs/biome@2.6.3 (latest 2.6.4 still in quarantine)
  - npm run defence:pkg-age-check -- --transitive
  - npm audit signatures
  - npm audit --audit-level=high
  - npm run defence:license-check:fail
```

E o fechamento de uma execução real:

```text
  ✓ OK   update complete — 1 pinned package(s) applied

── Summary ───────────────────────────────────────────
  ✓ OK   1 passed
  Next: review package.json and package-lock.json, then commit both files
```

Assim como o `add-package`, este workflow interativo intencionalmente não tem modo `--quiet`.

## Camadas de defesa relacionadas

- [Camada de Defesa 1 — Verificação de idade do pacote](../security/defense-layer-1-package-age.md)
- [Camada de Defesa 2 — Verificação de assinatura](../security/defense-layer-2-signatures.md)
- [Camada de Defesa 3 — Auditoria de vulnerabilidades](../security/defense-layer-3-vulnerabilities.md)
- [Camada de Defesa 9 — Verificação de licença](../security/defense-layer-9-license-check.md)
