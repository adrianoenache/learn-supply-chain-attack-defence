# Setup

O script npm `setup` instala as dependências e executa todas as camadas de segurança na ordem correta.

## O Que Ele Executa

```bash
"setup": "node --version && npm --version && npm run defence:pkg-age-check && npm ci && npm audit signatures && npm run prepare"
```

O script começa com `node --version && npm --version` para falhar antecipadamente se o ambiente local não satisfizer o campo `engines` do `package.json` (Node.js >= 24.16.0 e npm >= 11.13.0). Isso evita falhas confusas mais adiante no fluxo de setup.

1. `npm run defence:pkg-age-check` — garante que toda dependência direta tenha pelo menos 7 dias de idade.
2. `npm ci` — instalação determinística a partir do `package-lock.json`.
3. `npm audit signatures` — verifica as assinaturas do registry dos pacotes instalados.
4. `npm run prepare` — instala os hooks do Husky.

O script `defence:pre-commit` (usado pelo hook do Git) também executa `npm audit --audit-level=high` para falhar em CVEs alta ou crítica.

## Primeiro Setup (Sem `package-lock.json`)

Se o repositório acabou de ser criado ou o `package-lock.json` estiver ausente, o `npm ci` vai falhar. Nesse caso, execute o bootstrap controlado:

```bash
npm run defence:bootstrap
```

O script de bootstrap:

1. Executa `npm install --ignore-scripts --save-exact` para gerar o primeiro lock file sem executar scripts de lifecycle.
2. Executa `npm run defence:pkg-age-check`.
3. Executa `npm audit signatures`.
4. Executa `npm audit --audit-level=high`.

Após o bootstrap, revise `package.json` e `package-lock.json` e commit ambos. Daí em diante, use `npm run setup` normalmente.

## Lint e Formatação

Após o setup, mantenha as verificações de qualidade de código no fluxo de pré-commit:

```bash
npm run lint      # verifica o código com Biome
npm run lint:fix  # corrige automaticamente os problemas do Biome
npm run format    # formata o código com Biome
```

## Atualizando Dependências

Para atualizar dependências existentes de forma controlada, use o script dedicado em vez de executar `npm update` diretamente:

```bash
npm run defence:update
```

O script `defence:update` executa `npm update` e depois reexecuta a verificação transitiva de idade dos pacotes, a verificação de assinaturas e o audit de vulnerabilidades.

## Quando Executar

- Logo após clonar o repositório.
- Após fazer pull de atualizações de outra branch.
- Como baseline antes de adicionar ou remover dependências.

## Códigos de Saída

Se algum passo falhar, o script sai com código diferente de zero. Corrija o problema reportado antes de continuar.
