# Diretrizes de AI

Este projeto usa o GitHub Copilot com o modelo **Kimi 2.7 Code** como assistente de pair programming. Estas diretrizes explicam como a AI é usada, como os humanos devem supervisioná-la e como o projeto mantém a saída gerada pela AI alinhada com seus objetivos de segurança.

## Arquivos de AI Neste Repositório

Os seguintes arquivos configuram como os assistentes de AI se comportam ao trabalhar com este código:

| Arquivo ou Diretório | Propósito |
| --- | --- |
| [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md) | Instruções sempre ativas carregadas em toda requisição de chat. |
| [`.github/instructions/security.instructions.md`](../../.github/instructions/security.instructions.md) | Contexto para `tools/**`, `.npmrc` e `package.json`. |
| [`.github/instructions/testing.instructions.md`](../../.github/instructions/testing.instructions.md) | Contexto para `tools/**/*.test.js`. |
| [`.github/instructions/docs.instructions.md`](../../.github/instructions/docs.instructions.md) | Contexto para `docs/**/*.md` e `README.md`. |
| [`.github/instructions/educational-code-quality.instructions.md`](../../.github/instructions/educational-code-quality.instructions.md) | Regras para escrever código como recurso de aprendizado. |
| [`.github/instructions/file-organization.instructions.md`](../../.github/instructions/file-organization.instructions.md) | Regras para localização de arquivos e estrutura do projeto. |
| [`.github/instructions/project-evaluation.instructions.md`](../../.github/instructions/project-evaluation.instructions.md) | Critérios para relatórios de status e readiness de release. |
| [`.github/agents/`](../../.github/agents/) | Agents especializados para revisões de segurança, qualidade, performance, documentação, compliance, execução de comandos, code review, organização do repositório e avaliação do projeto. |
| [`.github/skills/`](../../.github/skills/) | Procedimentos reutilizáveis para auditorias de segurança, revisão de dependências, atualização de docs, releases, self-review, verificação de contratos de script, code review educacional, completude de docs e auditoria de organização do repositório. |
| [`.github/prompts/`](../../.github/prompts/) | Templates de prompt one-shot para testes, revisões de segurança, atualização de docs, auditoria de hardcodes, revisão de saídas da AI, code review para aprendizado, verificação de contrato de comando, validação de arquitetura e avaliação de status do projeto. |
| [`.github/hooks/`](../../.github/hooks/) | Hooks de ciclo de vida do GitHub Copilot que bloqueiam chamadas perigosas de ferramentas, sugerem comandos de validação após edições e injetam contexto do projeto no início da sessão. |
| [`.github/ai-lessons-learned.md`](../../.github/ai-lessons-learned.md) | Log de erros recorrentes da AI e correções usado para melhorar as instruções ao longo do tempo. |

Esses arquivos são lidos pelo VS Code Copilot / Kimi 2.7 Code quando o workspace é aberto. Eles não alteram o modelo em si; fornecem guardrails específicos do projeto.

## Regras de Segurança para Interações com AI

Ao pedir para a AI alterar código ou documentação, mantenha as seguintes regras em mente:

1. **Nunca enfraqueça um gate de segurança.** Não peça para a AI pular verificações de idade, auditorias de assinatura, verificações de licença ou etapas de pré-commit.
2. **Nunca adicione uma dependência diretamente.** Sempre encaminhe novos pacotes por `npm run defence:add` para que os gates de idade, assinatura, auditoria e licença sejam executados.
3. **Sempre valide após alterações.** Depois que a AI editar ou criar código, execute:
   - `npm run lint`
   - `npm test`
   - `npm run defence:check-md-links` (para alterações em markdown)
4. **Previna loops infinitos.** Toda execução conduzida pela AI deve ter um timeout, limite de iterações ou condição de parada explícita.
5. **Justifique valores hardcoded.** Se a AI deixar um valor literal no código, ela deve adicionar um comentário explicando por que aquele valor não é configurável.
6. **Mantenha a documentação bilíngue.** Quando a AI alterar comportamento voltado ao usuário, atualize tanto `docs/en/` quanto `docs/pt-BR/`.

## Validação de URLs

Antes de adicionar URLs externas em documentação, customizações de AI ou arquivos de configuração, verifique se elas são acessíveis. URLs fictícias dentro de exemplos de saída de CLI devem ser marcadas como ilustrativas. URLs mortas mantidas intencionalmente devem ser registradas em `.github/known-dead-urls.md`.

Execute `npm run defence:check-external-urls` após editar arquivos que contenham URLs.

## Revisão Humana

Toda sugestão gerada pela AI deve ser revisada por um humano antes de ser commitada. Preste atenção especial a:

- Limites de segurança e decisões de política.
- Versões de dependências e compatibilidade de licenças.
- Alterações em `.husky/pre-commit`, `.npmrc` ou `package.json`.
- Novos casos de teste e impacto na cobertura.

Se `.husky/pre-commit` for modificado, o agente também deve atualizar
`defences.huskyPreCommitHash` em `package.json` e executar
`npm run defence:verify-defences:fix` antes da revisão humana.

## Ciclo de Feedback

Quando a AI comete um erro que não é pego pelas instruções existentes:

1. Corrija o erro no código ou documentação.
2. Atualize `.github/copilot-instructions.md` ou o `.github/instructions/*.md` relevante para que o mesmo erro seja menos provável de acontecer novamente.
3. Se o erro se encaixar em um domínio específico, atualize o `.github/agents/*.agent.md` correspondente.
4. Se o mesmo padrão se repetir, adicione uma nota curta em [`.github/ai-lessons-learned.md`](../../.github/ai-lessons-learned.md) para que sessões futuras comecem com esse contexto.
5. Revise `.github/ai-lessons-learned.md` ao final de cada fase ou antes de um release para identificar lacunas nas instruções.

## Por Que Não `docs/ai/`?

Um diretório `docs/ai/` separado poderia ser confundido com arquivos que a AI lê durante a execução. As instruções reais da AI vivem em `.github/`, onde o VS Code Copilot / Kimi 2.7 Code pode descobri-las automaticamente. A explicação legível por humanos vive aqui, na árvore principal de documentação, junto com os outros guias de contribuição.

## Agents e Skills Disponíveis

Os seguintes agents especializados podem ser invocados explicitamente ou correspondidos automaticamente com base nos arquivos sendo editados:

| Agent | Escopo |
| --- | --- |
| [`.github/agents/security.agent.md`](../../.github/agents/security.agent.md) | Revisões de segurança para dependências, hooks, `.npmrc`, `package.json`, CI. |
| [`.github/agents/quality.agent.md`](../../.github/agents/quality.agent.md) | Lint, testes, cobertura, valores hardcoded. |
| [`.github/agents/performance.agent.md`](../../.github/agents/performance.agent.md) | Cache, retry, uso de rede, benchmarks. |
| [`.github/agents/docs.agent.md`](../../.github/agents/docs.agent.md) | Documentação bilíngue, links, glossário, qualidade markdown. |
| [`.github/agents/compliance.agent.md`](../../.github/agents/compliance.agent.md) | Licenças, SBOM, manifesto de adoção, readiness de release. |
| [`.github/agents/command-execution.agent.md`](../../.github/agents/command-execution.agent.md) | Execução segura de subprocessos, parse de argumentos CLI, contratos de comando. |
| [`.github/agents/code-review.agent.md`](../../.github/agents/code-review.agent.md) | Code review educacional: clareza, headers, mensagens de erro, valores hardcoded. |
| [`.github/agents/repository-organization.agent.md`](../../.github/agents/repository-organization.agent.md) | Estrutura de arquivos, padrões applyTo, arquivos órfãos, integridade do manifesto. |
| [`.github/agents/project-evaluation.agent.md`](../../.github/agents/project-evaluation.agent.md) | Readiness de release, relatórios de status, avaliação de nota 10/10. |

Skills reutilizáveis incluem:

| Skill | Use Quando |
| --- | --- |
| [`.github/skills/security-audit/SKILL.md`](../../.github/skills/security-audit/SKILL.md) | Revisar uma mudança contra as 12 camadas de defesa. |
| [`.github/skills/dependency-review/SKILL.md`](../../.github/skills/dependency-review/SKILL.md) | Adicionar ou avaliar uma dependência. |
| [`.github/skills/docs-update/SKILL.md`](../../.github/skills/docs-update/SKILL.md) | Atualizar a documentação bilíngue. |
| [`.github/skills/release-checklist/SKILL.md`](../../.github/skills/release-checklist/SKILL.md) | Criar uma tag de release. |
| [`.github/skills/self-review/SKILL.md`](../../.github/skills/self-review/SKILL.md) | Revisar uma saída anterior da AI e melhorar as instruções. |
| [`.github/skills/script-contract-verification/SKILL.md`](../../.github/skills/script-contract-verification/SKILL.md) | Verificar o contrato CLI de um script de defesa. |
| [`.github/skills/educational-code-review/SKILL.md`](../../.github/skills/educational-code-review/SKILL.md) | Revisar código como recurso de aprendizado. |
| [`.github/skills/docs-completeness/SKILL.md`](../../.github/skills/docs-completeness/SKILL.md) | Auditar a completude da documentação bilíngue. |
| [`.github/skills/repository-organization-audit/SKILL.md`](../../.github/skills/repository-organization-audit/SKILL.md) | Auditar a estrutura do projeto e a higiene dos padrões applyTo. |
| [`.github/skills/validate-urls/SKILL.md`](../../.github/skills/validate-urls/SKILL.md) | Procedimento passo a passo para verificar URLs externas antes de commitá-las. |
| [`.github/skills/pre-commit-hash-sync/SKILL.md`](../../.github/skills/pre-commit-hash-sync/SKILL.md) | Mantém os hashes de integridade de `.husky/pre-commit` sincronizados após edições do hook. |

Prompts para tarefas one-shot incluem:

| Prompt | Use Quando |
| --- | --- |
| [`.github/prompts/generate-test.prompt.md`](../../.github/prompts/generate-test.prompt.md) | Gerar um teste para um script de defesa. |
| [`.github/prompts/review-security.prompt.md`](../../.github/prompts/review-security.prompt.md) | Revisar uma mudança quanto a riscos de segurança. |
| [`.github/prompts/update-docs.prompt.md`](../../.github/prompts/update-docs.prompt.md) | Atualizar documentação após uma mudança. |
| [`.github/prompts/check-hardcoded-values.prompt.md`](../../.github/prompts/check-hardcoded-values.prompt.md) | Auditar valores hardcoded. |
| [`.github/prompts/review-ai-output.prompt.md`](../../.github/prompts/review-ai-output.prompt.md) | Revisar uma saída anterior da AI. |
| [`.github/prompts/code-review-for-learning.prompt.md`](../../.github/prompts/code-review-for-learning.prompt.md) | Revisar código como recurso de aprendizado. |
| [`.github/prompts/verify-command-contract.prompt.md`](../../.github/prompts/verify-command-contract.prompt.md) | Verificar o contrato de comando de um script. |
| [`.github/prompts/validate-architecture.prompt.md`](../../.github/prompts/validate-architecture.prompt.md) | Validar uma mudança contra a arquitetura do projeto. |
| [`.github/prompts/project-status-evaluation.prompt.md`](../../.github/prompts/project-status-evaluation.prompt.md) | Avaliar o readiness do projeto para release. |

Hooks de ciclo de vida seguem a [referência de hooks do GitHub Copilot](https://docs.github.com/en/copilot/reference/hooks-reference) (`{ "version": 1, "hooks": { ... } }`) e incluem:

| Hook | Propósito |
| --- | --- |
| [`.github/hooks/enforce-security.json`](../../.github/hooks/enforce-security.json) | Nega chamadas perigosas às ferramentas `bash`/`powershell`, como `npm install` direto ou remoção de `ignore-scripts`. |
| [`.github/hooks/auto-lint-test.json`](../../.github/hooks/auto-lint-test.json) | Sugere executar lint, testes, verificação de links, verificação de divergência de docs e verificação de contrato de comando após edições. |
| [`.github/hooks/inject-context.json`](../../.github/hooks/inject-context.json) | Injeta contexto do projeto (engines, contagem de TODOs, manifesto de defesas) no início da sessão. |
| [`.github/hooks/sync-pre-commit-hash.json`](../../.github/hooks/sync-pre-commit-hash.json) | Lembra os agentes de atualizar os hashes de integridade após edições de `.husky/pre-commit`. |

As implementações dos hooks ficam em [`.github/hooks/scripts/`](../../.github/hooks/scripts/).
