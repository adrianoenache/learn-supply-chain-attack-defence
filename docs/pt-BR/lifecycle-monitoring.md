# Monitoramento de Processos de Lifecycle

O comando `defence:install-monitored` observa todo subprocesso gerado durante a execução de `npm install` (ou `npm ci`). Ele registra cada chamada de `spawn`, `spawnSync`, `exec` e `execSync`, classifica por risco e grava um relatório em Markdown ou JSON.

## Por que isso importa

`ignore-scripts=true` em `.npmrc` impede que o npm execute scripts `preinstall`, `install`, `postinstall` e `prepare` na maioria dos casos. No entanto, alguns pacotes contornam o mecanismo de scripts do npm executando seus próprios processos shell ou Node.js durante a instalação, e a flag `ignore-scripts` não cobre todas as situações. O monitoramento de processos fornece um histórico completo do que realmente foi executado.

Essa é uma camada de **observação em tempo de execução**, não uma análise estática. Ela complementa a [análise de scripts de lifecycle](security/lifecycle-script-analysis.md) pré-instalação mostrando o que aconteceu durante a instalação real.

## O que é registrado

Para cada subprocesso, o monitor captura:

- comando e argumentos (truncados em `maxArgsLength`)
- diretório de trabalho
- PID do processo pai
- PID do processo filho (quando disponível)
- código de saída ou sinal
- duração
- `npm_lifecycle_event` e `npm_package_name` do ambiente
- rótulos de risco

## Rótulos de risco

| Rótulo | Gatilho |
| --- | --- |
| `lifecycle` | O filho herdou um evento de lifecycle do npm, como `preinstall`, `install`, `postinstall` ou `prepare`. |
| `shell` | O comando é um interpretador shell (`sh`, `bash`, `zsh`, `cmd`, `powershell`, `pwsh`, etc.). |
| `network` | O comando pode fazer requisições de saída e os argumentos contêm `http`, `https`, `require(`, `import(` ou `fetch(`. |
| `permission` | O comando altera propriedade ou permissões (`chmod`, `chown`, `sudo`, `su`, etc.). |
| `filesystem-write` | O comando grava ou remove arquivos (`cp`, `mv`, `rm`, `mkdir`, `touch`, etc.). |
| `native-build` | O comando compila código nativo (`node-gyp`, `make`, `cmake`, `gcc`, `clang`, `python`, etc.). |
| `unknown` | Nenhum outro rótulo correspondeu ao evento. |

Um único evento pode ter vários rótulos.

## Uso

```bash
# Relatório Markdown padrão em lifecycle-monitor-report.md
npm run defence:install-monitored -- npm install

# Arquivo de saída personalizado
npm run defence:install-monitored -- --output=reports/install.md npm install

# Saída JSON
npm run defence:install-monitored -- --format=json --output=report.json npm install

# Suprime stdout do comando monitorado
npm run defence:install-monitored -- --silent npm install

# Falha se qualquer script de lifecycle for executado
npm run defence:install-monitored -- --fail-on-lifecycle npm install
```

Você também pode executar o módulo subjacente diretamente:

```bash
node ./tools/monitor-install.js --output=report.md npm install
```

## Integração com `defence:add`

O `tools/add-package.js` monitora automaticamente a etapa `npm install` que executa. Após a instalação, ele grava o relatório no caminho configurado em `lifecycleMonitoring.reportFile` e imprime um resumo como:

```text
Install monitor: 12 evento(s), 2 script(s) de lifecycle. Relatório: lifecycle-monitor-report.md
```

Se `lifecycleMonitoring.failOnLifecycle` for `true` e um evento `lifecycle` for registrado, a instalação é abortada.

## Integração com `defence:bootstrap`

O `tools/setup-bootstrap.js` também monitora a primeira etapa de `npm install`, pois um clone inicial sem arquivo de lock é um dos momentos mais arriscados do ciclo de vida das dependências. As mesmas configurações de `lifecycleMonitoring` se aplicam.

## Configuração

Adicione um bloco `lifecycleMonitoring` ao `package.json`:

```json
"lifecycleMonitoring": {
  "enabled": true,
  "reportFile": "lifecycle-monitor-report.md",
  "failOnLifecycle": false,
  "maxArgsLength": 200
}
```

- `enabled` — defina `false` para pular o monitoramento e a geração de relatório.
- `reportFile` — caminho para o relatório Markdown. A saída JSON não é afetada.
- `failOnLifecycle` — quando `true`, aborta a instalação se qualquer evento `lifecycle` for registrado.
- `maxArgsLength` — número máximo de caracteres registrados para os argumentos de cada comando.

## Formato do relatório

O relatório Markdown contém:

1. Um cabeçalho resumido com o comando monitorado, timestamp, código de saída e duração.
2. Uma tabela de risco contando eventos por rótulo.
3. Uma tabela completa de eventos com hora, comando, argumentos, evento de lifecycle, rótulos, PID, saída e duração.
4. Recomendações condicionais baseadas nos rótulos observados.

O formato JSON contém o mesmo resumo mais a matriz bruta de eventos para análise programática.

## Relação com outras defesas

- **Camada 6 — `.npmrc` endurecido**: `ignore-scripts=true` é a proteção primária. O monitoramento prova que ela está funcionando (ou detecta exceções).
- **Análise de scripts de lifecycle**: a análise estática prevê riscos antes da instalação; o monitoramento registra o que de fato aconteceu.
- **Painel de pontuação de confiança**: o risco de scripts de lifecycle é uma das entradas do cálculo de pontuação.

## Limitações

- O monitor intercepta o módulo `child_process` do Node.js dentro do processo que inicia o monitoramento. Ele não consegue ver processos criados por serviços em segundo plano já em execução ou por addons nativos que contornam as APIs do Node.js.
- Ele observa, mas não bloqueia a execução. Use-o para auditoria e decisões de fail-fast, não como sandbox.
- O truncamento de argumentos e a classificação por rótulos são heurísticas. Um evento rotulado não é automaticamente malicioso.
