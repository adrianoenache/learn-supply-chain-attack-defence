# Referência Rápida

Uma lista concisa de todos os comandos necessários para trabalhar com este projeto.

## Setup Inicial

```bash
# Clone e instalação (requer Node.js >= 24.16.0 e npm >= 11.13.0)
git clone git@github.com:adrianoenache/learn-supply-chain-attack-defence.git
cd learn-supply-chain-attack-defence
npm run setup
```

## Comandos do Dia a Dia

| Comando | O que faz |
| --- | --- |
| `npm run setup` | Executa verificação de idade, `npm ci`, audit de assinaturas e instala os hooks do Husky. Começa com `node --version && npm --version` para impor os requisitos do campo `engines`. |
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
| `npm run defence:update-check` | Avisa sobre atualizações disponíveis sem instalá-las. |
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

## Adoção em Outros Projetos

```bash
# Copia as defesas para outro projeto
node ./tools/install-defences.js /caminho/do/projeto-destino

# Visualiza as alterações
node ./tools/install-defences.js /caminho/do/projeto-destino --dry-run

# Sobrescreve arquivos existentes (backups são criados)
node ./tools/install-defences.js /caminho/do/projeto-destino --force
```
