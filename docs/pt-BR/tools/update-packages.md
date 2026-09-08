# update-packages

`update-packages.js` é um wrapper controlado para o `npm update` que reexecuta os portões de defesa após a atualização.

## O que faz

- Executa `npm update` para pacotes elegíveis.
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
