# Ferramentas

Este projeto depende de um pequeno conjunto de ferramentas cuidadosamente escolhidas. Cada ferramenta é nativa do ecossistema Node.js ou escrita com módulos nativos, mantendo a superfície de supply chain mínima.

## Runtime

### Node.js >= 24.16.0

O projeto utiliza uma versão recente da linha LTS do Node.js para garantir suporte a:

- `node:test` e `node:assert/strict` (sem framework de testes de terceiros).
- Aplicação do `min-release-age` no npm.
- APIs modernas como `fetch` e `AbortController`, se necessário no futuro.

### npm >= 11.13.0

O npm é o gerenciador de pacotes. O projeto o utiliza tanto para instalação quanto como primitivo de segurança por meio de comandos como `npm audit signatures` e `npm audit --audit-level=high`.

## Dependências de Desenvolvimento

### Husky 9.1.7

[Husky](https://typicode.github.io/husky/) gerencia os hooks do Git. Ele instala o hook `.husky/pre-commit` para que cada commit execute automaticamente as verificações defensivas do projeto.

**Critérios de seleção**:

- Amplamente adotado e minimalista.
- Publicado há mais de 7 dias antes da adoção (verificado pelo `defence:add`).
- Não requer scripts de postinstall em uso normal.

### Biome 2.5.8

[Biome](https://biomejs.dev/) é o linter e formatter do projeto. Substitui o ESLint + Prettier por uma única toolchain rápida.

**Critérios de seleção**:

- Linter e formatter unificados.
- Performance nativa e pequena pegada de dependências.
- A versão 2.5.8 tinha pelo menos 7 dias de publicação no momento da adoção (2026-08-18), satisfazendo `min-release-age=7`.

## Scripts Customizados

Todos os scripts customizados ficam em `tools/` e usam apenas módulos nativos do Node.js.

| Script | Propósito |
| --- | --- |
| `check-package-age.js` | Impõe a idade mínima dos pacotes para dependências diretas ou transitivas. |
| `add-package.js` | Adiciona uma dependência com segurança, com verificações de idade, assinatura, audit e idade transitiva. |
| `setup-bootstrap.js` | Realiza a primeira instalação controlada quando `package-lock.json` está ausente. |
| `update-packages.js` | Wrapper controlado para `npm update` com verificações pós-atualização. |
| `install-defences.js` | Copia as defesas para outro projeto Node.js. |
| `lib/package-utils.js` | Utilitários compartilhados para parse e validação de especificadores de pacotes. |

## Por Que Nenhum Framework de Testes de Terceiros?

O runner nativo `node:test` é suficiente para este projeto. Evitar Jest, Mocha ou Vitest remove outra dependência da supply chain e mantém o setup reprodutível com `npm ci`.
