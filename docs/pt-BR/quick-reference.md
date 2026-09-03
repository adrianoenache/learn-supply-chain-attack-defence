# Referência Rápida

Uma lista concisa de todos os comandos necessários para trabalhar com este projeto.

## Setup Inicial

```bash
# Clone e instalação (requer Node.js >= 24.19.0 e npm >= 11.17.0)
git clone git@github.com:adrianoenache/learn-supply-chain-attack-defence.git
cd learn-supply-chain-attack-defence
npm run setup
```

## Comandos do Dia a Dia

| Comando | O que faz |
| --- | --- |
| `npm run setup` | Executa verificação de engines, verificação de idade, `npm ci`, audit de assinaturas e instala os hooks do Husky. Começa com `npm run defence:check-engines` para impor os requisitos do campo `engines`. |
| `npm test` | Executa a suite de testes completa com o runner nativo do Node.js. |
| `npm run lint` | Reporta problemas de lint e formatação com Biome. |
| `npm run lint:fix` | Corrige automaticamente problemas seguros do Biome. |
| `npm run format` | Formata todos os arquivos configurados com Biome. |

## Comandos de Dependências

| Comando | O que faz |
| --- | --- |
| `npm run defence:add -- pkg@x.y.z` | Adiciona uma dependência de runtime pelo gate de segurança. |
| `npm run defence:add -- --dev pkg@x.y.z` | Adiciona uma devDependency pelo gate de segurança. |
| `npm run defence:add -- --peer pkg@x.y.z` | Adiciona uma peerDependency pelo gate de segurança. |
| `npm run defence:add -- pkg@x.y.z --dry-run` | Simula a verificação de idade sem instalar. |
| `npm run defence:update` | Atualiza dependências com verificações de segurança pós-atualização. |
| `npm run defence:update -- --dry-run` | Simula o fluxo de atualização. |
| `npm run defence:update:interactive` | Seleciona quais pacotes elegíveis atualizar a partir de uma lista. |
| `npm run defence:update:interactive -- --dry-run` | Pré-visualiza a lista interativa de atualização. |
| `npm run defence:update-check` | Avisa sobre atualizações disponíveis sem instalá-las. |
| `npm run defence:update-badge` | Atualiza o badge de contagem de testes no README.md. |
| `npm run defence:update-badge:dry-run` | Imprime o valor do badge sem alterar o README.md. |
| `npm run defence:update-check:force` | Ignora cache e executa novo scan de atualizações. |
| `npm run defence:update-check:json` | Saída JSON das atualizações disponíveis. |
| `npm run defence:update-check -- --format=markdown` | Saída Markdown das atualizações disponíveis. |
| `npm run defence:update-check:offline` | Usa o scan em cache sem chamadas de rede. |
| `npm run defence:sync-check` | Verifica se `node_modules` corresponde ao `package-lock.json`. |
| `npm run defence:sync-check -- --fix` | Exibe o comando `npm ci` quando desatualizado. |
| `npm run defence:license-check` | Escaneia licenças de dependências contra listas de permissões e proibições. |
| `npm run defence:license-check:fail` | Sai com código 1 em licenças proibidas ou desconhecidas. |
| `npm run defence:license-check:json` | Saída JSON do scan de licenças. |
| `npm run defence:license-check -- --format=markdown` | Saída Markdown do scan de licenças. |
| `npm run defence:license-check -- --pkg=nome@versao` | Verifica a licença de um único pacote. |

## Comandos de Segurança / Manutenção

| Comando | O que faz |
| --- | --- |
| `npm run defence:pkg-age-check` | Verifica dependências diretas contra a idade mínima de 7 dias. |
| `npm run defence:pkg-age-check -- --transitive` | Verifica todos os pacotes resolvidos no `package-lock.json`. |
| `npm run defence:bootstrap` | Helper de primeira instalação quando `package-lock.json` está ausente. |
| `npm run defence:reinstall` | Apaga `node_modules`, reinstala e reexecuta todas as verificações. |
| `npm run defence:pre-commit` | Executa audits de assinatura, vulnerabilidade e verificação de atualizações. |
| `bash .husky/pre-commit` | Executa o hook de pré-commit completo localmente. |
| `npm run defence:check-hooks` | Verifica se `.husky/pre-commit` corresponde ao hash conhecido. |
| `npm run defence:check-lockfile-integrity` | Verifica se cada entrada do lockfile possui um campo de integridade SHA-512. |
| `npm run defence:check-secrets` | Verifica arquivos rastreados em busca de possíveis secrets. |
| `npm run defence:generate-sbom -- --output=sbom.json` | Gera um SBOM CycloneDX 1.4 JSON. |
| `npm run defence:verify-defences` | Verifica arquivos copiados pelo `install-defences.js` contra o manifesto. |

## Adoção em Outros Projetos

```bash
# Copia as defesas para outro projeto
node ./tools/install-defences.js /caminho/do/projeto-destino

# Visualiza as alterações
node ./tools/install-defences.js /caminho/do/projeto-destino --dry-run

# Sobrescreve arquivos existentes (backups são criados)
node ./tools/install-defences.js /caminho/do/projeto-destino --force
```
