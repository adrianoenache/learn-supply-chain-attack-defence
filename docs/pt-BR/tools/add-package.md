# add-package

`add-package.js` é o wrapper seguro para instalação de dependências. Ele executa todos os portões de defesa relevantes antes de permitir que um pacote entre no projeto.

## O que faz

- Analisa o especificador do pacote e valida que está no formato `nome@versão`.
- Impõe a verificação mínima de idade do pacote.
- Verifica as assinaturas do npm com `npm audit signatures`.
- Executa uma auditoria de vulnerabilidades.
- Realiza análise estática de scripts de lifecycle no pacote e em suas dependências transitivas.
- Verifica a compatibilidade de licença.
- Relata um resumo e solicita confirmação, a menos que `--dry-run` seja usado.

Implementado em [tools/add-package.js](../../../tools/add-package.js).

## Uso

```bash
# Adicionar uma dependência de produção
npm run defence:add -- lodash@4.17.21

# Adicionar uma dependência de desenvolvimento
npm run defence:add -- @types/node@22.15.3 --dev

# Adicionar uma dependência peer
npm run defence:add -- react-native-svg@12.0.0 --peer

# Simular sem instalar
npm run defence:add -- lodash@4.17.21 --dry-run
```

## Exemplo de saída

```text
Checking package age for lodash@4.17.21 ... ok (published 30 days ago)
Verifying npm signatures ... ok
Running vulnerability audit ... ok
Analyzing lifecycle scripts ... ok
License MIT is allowed.
Summary: lodash@4.17.21 passed all defense gates.
Prosseguir com a instalação? (y/n)
```

## Camadas de defesa relacionadas

- [Camada de Defesa 1 — Verificação de idade do pacote](../security/defense-layer-1-package-age.md)
- [Camada de Defesa 2 — Verificação de assinatura](../security/defense-layer-2-signatures.md)
- [Camada de Defesa 3 — Auditoria de vulnerabilidades](../security/defense-layer-3-vulnerabilities.md)
- [Camada de Defesa 9 — Verificação de licença](../security/defense-layer-9-license-check.md)
- [Camada de Defesa 10 — Typosquatting e confusão de dependência](../security/defense-layer-10-typosquatting.md)
