# Troubleshooting

Este guia lista as falhas mais comuns que você pode ver ao usar as ferramentas defensivas deste projeto, por que elas acontecem e como corrigi-las. Cada comando também pode ser executado manualmente para iteração mais rápida.

## Fluxo de Diagnóstico Geral

Quando um comando falhar, siga esta ordem:

1. Leia a mensagem de erro com atenção. A maioria dos scripts imprime o arquivo, pacote ou comando que falhou.
2. Execute o comando diretamente (sem os scripts npm) para ver a saída bruta.
3. Verifique se seu ambiente satisfaz [os requisitos de engines](setup.md#o-que-ele-executa) (Node.js `>=24.19.0` e npm `>=11.17.0`).
4. Execute `bash .husky/pre-commit` somente depois que o comando individual passar.

---

## Falhas na Verificação de Engines

### Sintoma

```text
Error: Node.js >= 24.19.0 is required (found v22.0.0)
```

### Causa

A versão ativa do Node.js ou do npm é inferior às versões declaradas em `package.json` `engines`.

### Correção

Instale a versão necessária do Node.js com nvm e reinstale as dependências:

```bash
nvm install 24.19.0
nvm use 24.19.0
npm run setup
```

Se estiver no Windows/WSL, certifique-se de que a distribuição WSL ativa está usando a versão correta do Node:

```bash
node -v
npm -v
```

---

## Falhas na Verificação de Idade dos Pacotes

### Sintoma

```text
REJECT  some-package@1.0.0 — published 2026-09-01 (1.9 days ago)
Minimum age: 7 days
```

### Causa

Um pacote é mais novo que o valor de `min-release-age` em `.npmrc` (padrão `7` dias). Esse é o comportamento esperado e bloqueia lançamentos potencialmente imaturos ou apressados.

### Correção

1. Aguarde até que o pacote atinja a idade mínima.
2. Se o pacote foi adicionado por acidente, remova-o do `package.json` e execute `npm run defence:update`.
3. Para verificar a idade de um único pacote manualmente:

```bash
node ./tools/check-package-age.js --pkg=some-package@1.0.0
```

Para dependências transitivas, execute:

```bash
npm run defence:pkg-age-check -- --transitive
```

---

## Falhas na Auditoria de Assinaturas

### Sintoma

```text
npm audit signatures
failed to verify package signature
```

### Causa

Um pacote foi instalado a partir de um tarball cuja assinatura do registry não corresponde aos metadados atuais do registry. Isso pode acontecer se o lock file foi gerado contra um registry diferente, o pacote foi republicado ou um mirror está desatualizado.

### Correção

1. Confirme que está usando o registry público do npm (ou um mirror confiável) em `.npmrc`.
2. Delete `node_modules` e `package-lock.json` apenas se este for um projeto novo; caso contrário, execute:

```bash
npm run defence:reinstall
```

3. Se um único pacote estiver afetado, verifique sua provenance:

```bash
npm view some-package@1.0.0 --json | jq '.dist.attestations'
```

---

## Falhas na Auditoria de Vulnerabilidades

### Sintoma

```text
found 1 high severity vulnerability
```

### Causa

`npm audit --audit-level=high` detectou uma CVE alta ou crítica na árvore de dependências.

### Correção

1. Identifique o pacote afetado:

```bash
npm audit --audit-level=high
```

2. Atualize a dependência se uma versão corrigida estiver disponível:

```bash
npm run defence:update
```

3. Se não existir patch, avalie se o código vulnerável é alcançável no seu projeto. Documente o risco e considere substituir a dependência.

---

## Falhas na Verificação de Licenças

### Sintoma

```text
❌ some-package@2.0.0 — Proprietary
1 prohibited / 0 unknown license(s) found
```

### Causa

Uma dependência usa uma licença que não está na allow-list configurada em `package.json` (`pkgAgeCheck` / `licensesCheck`).

### Correção

1. Leia a expressão exata da licença:

```bash
npm run defence:license-check -- --pkg=some-package@2.0.0
```

2. Se a licença for aceitável, adicione-a à allow-list em `package.json` sob `licensesCheck.allowed` e explique a mudança na mensagem de commit.
3. Se a licença não for aceitável, remova a dependência.

---

## Falhas na Verificação de Atualizações

### Sintoma

```text
⚠️  some-package@1.0.0 → 1.1.0 (quarantined)
```

### Causa

Uma versão mais nova está disponível, mas ainda não passou pelo período de quarentena definido em `package.json` `updateCheck.history`.

### Correção

Isso é informativo no hook de pré-commit. Para ver o relatório completo de atualizações:

```bash
npm run defence:update-check
```

Para aplicar apenas atualizações elegíveis:

```bash
npm run defence:update
```

---

## Falhas na Integridade do Lockfile

### Sintoma

```text
Error: package-lock.json entry for some-package is missing integrity
```

### Causa

O `package-lock.json` contém uma entrada sem um campo `integrity` SHA-512. Isso pode acontecer após edições manuais ou ao usar um cliente npm mais antigo.

### Correção

1. Execute o verificador de integridade manualmente para ver todos os pacotes afetados:

```bash
npm run defence:check-lockfile-integrity
```

2. Regenere o lock file com segurança:

```bash
npm run defence:bootstrap
```

3. Revise o diff antes de commitar.

---

## Falhas na Integridade do Hook de Pré-commit

### Sintoma

```text
❌ Pre-commit hook hash mismatch
```

### Causa

`.husky/pre-commit` foi modificado e não corresponde mais ao hash armazenado em `package.json` `defences.hookHash`.

### Correção

1. Não ignore este erro. Pode indicar adulteração ou uma edição acidental.
2. Compare o arquivo atual com a última versão boa conhecida:

```bash
git diff HEAD -- .husky/pre-commit
```

3. Se a mudança foi intencional, atualize o hash em `package.json` após revisão:

```bash
npm run defence:check-hooks
```

4. Se a mudança foi acidental, restaure o arquivo original:

```bash
git checkout HEAD -- .husky/pre-commit
```

---

## Falhas no Scanner de Segredos

### Sintoma

```text
Potential secret detected in .env.example: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Causa

`tools/check-secrets.js` encontrou uma string que parece ser um token secreto ou credencial.

### Correção

1. Se o valor detectado for um segredo real, rotacione-o imediatamente e remova-o do arquivo e do histórico do Git.
2. Se o valor for um placeholder documentado, adicione-o a `.check-secrets-ignore` com um comentário explicando por que é seguro ignorá-lo. Exemplo:

```text
# Placeholder PAT usado na documentação do agente, não é um segredo real
ghp_000000000000000000000000000000000000
```

3. Execute o scanner manualmente para confirmar a correção:

```bash
npm run defence:check-secrets
```

---

## Falhas em Links de Markdown

### Sintoma

```text
❌ docs/en/setup.md -> ./missing-file.md (404)
```

### Causa

Um link em markdown aponta para um arquivo que não existe ou uma URL externa que retornou erro.

### Correção

1. Execute o verificador de links com saída detalhada:

```bash
npm run defence:check-md-links
```

2. Corrija caminhos internos ou remova links externos quebrados.
3. Se um link externo estiver temporariamente indisponível, mas correto, considere substituí-lo por uma versão arquivada ou documentar a falha temporária.

---

## Falhas na Verificação de Sincronização

### Sintoma

```text
node_modules is out of sync with package-lock.json
```

### Causa

O `node_modules` foi modificado manualmente, uma dependência foi instalada sem atualizar o lock file, ou a troca de branch deixou pacotes obsoletos.

### Correção

1. Execute a verificação de sincronização com a correção sugerida:

```bash
npm run defence:sync-check -- --fix
```

2. Aplique o comando impresso (geralmente `npm ci`).
3. Execute `npm run setup` para verificar se tudo está saudável.

---

## Falhas no Bootstrap de Setup

### Sintoma

```text
Error: package-lock.json is missing. Run `npm run defence:bootstrap` first.
```

### Causa

O repositório não tem `package-lock.json`, então `npm ci` não pode ser executado deterministicamente.

### Correção

Execute o bootstrap controlado e depois commite o lock file gerado:

```bash
npm run defence:bootstrap
```

Revise `package.json` e `package-lock.json` antes de commitar.

---

## Falhas na Adoção / Instalação das Defesas

### Sintoma

```text
Error: target directory is not a git repository
```

### Causa

`tools/install-defences.js` copia as defesas apenas para repositórios Git existentes para preservar a capacidade de rollback.

### Correção

1. Inicialize o repositório alvo:

```bash
cd /path/to/target-project
git init
```

2. Reexecute o comando de instalação:

```bash
node ./tools/install-defences.js /path/to/target-project
```

3. Verifique os arquivos copiados contra o manifesto:

```bash
npm run defence:verify-defences
```

---

## Problemas com Cache do Registry

### Sintoma

Uma ferramenta retorna dados desatualizados ou erros de rede inesperados após uma indisponibilidade do registry.

### Causa

`tools/lib/registry-cache.js` armazena em cache respostas do registry em disco com TTL. Um cache desatualizado pode sobreviver a um incidente no registry.

### Correção

1. Force uma atualização de cache excluindo o diretório de cache. O local padrão é impresso pela ferramenta quando `--verbose` é usado.
2. Para encontrar o caminho do cache, consulte `tools/lib/config.js` para o valor `registryCacheDir` ou a sobrescrita em `.defence.config.json`.
3. Reexecute a ferramenta que falhou e verifique a saída contra o registry:

```bash
npm view some-package@1.0.0 --json
```

---

## Ainda com Problemas?

Se uma falha não corresponder a nenhuma das entradas acima:

1. Execute o comando individual manualmente e capture a saída completa.
2. Consulte a [documentação de ferramentas](tools.md) para o script em questão.
3. Abra uma issue com a saída, suas versões do Node/npm e os passos para reproduzir.
