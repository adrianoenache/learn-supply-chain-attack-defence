# update-packages

`update-packages.js` é um wrapper controlado para o `npm update` que reexecuta os portões de defesa após a atualização.

## O que faz

- Carrega as atualizações elegíveis de `.defence-update-check.json` (produzido pelo `defence:update-check`).
- Resolve o alvo de cada pacote como a maior versão de `intermediateEligible` (já aprovada no portão de idade no momento do scan), com fallback para `latest` em arquivos de estado antigos.
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

```text
Atualizações elegíveis: lodash 4.17.20 -> 4.17.21
Executando npm update ...
Verificação de assinatura: ok
Verificação de licença: ok
Verificação de idade: ok
```

## Camadas de defesa relacionadas

- [Camada de Defesa 1 — Verificação de idade do pacote](../security/defense-layer-1-package-age.md)
- [Camada de Defesa 2 — Verificação de assinatura](../security/defense-layer-2-signatures.md)
- [Camada de Defesa 3 — Auditoria de vulnerabilidades](../security/defense-layer-3-vulnerabilities.md)
- [Camada de Defesa 9 — Verificação de licença](../security/defense-layer-9-license-check.md)
