# Diretrizes de AI

Este projeto usa o GitHub Copilot com o modelo **Kimi Code** como assistente de pair programming. Estas diretrizes explicam como a AI é usada, como os humanos devem supervisioná-la e como o projeto mantém a saída gerada pela AI alinhada com seus objetivos de segurança.

## Arquivos de AI Neste Repositório

Os seguintes arquivos configuram como os assistentes de AI se comportam ao trabalhar com este código:

| Arquivo ou Diretório | Propósito |
| --- | --- |
| [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md) | Instruções sempre ativas carregadas em toda requisição de chat. |
| [`.github/instructions/security.instructions.md`](../../.github/instructions/security.instructions.md) | Contexto para `tools/**`, `.npmrc` e `package.json`. |
| [`.github/instructions/testing.instructions.md`](../../.github/instructions/testing.instructions.md) | Contexto para `tools/**/*.test.js`. |
| [`.github/instructions/shell-scripts.instructions.md`](../../.github/instructions/shell-scripts.instructions.md) | Padrões para arquivos `.sh`, hooks Husky e scripts de hooks. |
| [`.github/instructions/docs.instructions.md`](../../.github/instructions/docs.instructions.md) | Contexto para `docs/**/*.md` e `README.md`. |
| [`.github/instructions/educational-code-quality.instructions.md`](../../.github/instructions/educational-code-quality.instructions.md) | Regras para escrever código como recurso de aprendizado. |
| [`.github/instructions/file-organization.instructions.md`](../../.github/instructions/file-organization.instructions.md) | Regras para localização de arquivos e estrutura do projeto. |
| [`.github/instructions/project-evaluation.instructions.md`](../../.github/instructions/project-evaluation.instructions.md) | Critérios para relatórios de status e readiness de release. |
| [`.github/agents/`](../../.github/agents/) | Agents especializados para revisões de segurança, qualidade, performance, documentação, compliance, execução de comandos, code review, organização do repositório e avaliação do projeto. |
| [`.github/skills/`](../../.github/skills/) | Procedimentos reutilizáveis para auditorias de segurança, revisão de dependências, atualização de docs, releases, self-review, verificação de contratos de script, code review educacional, completude de docs, auditoria de organização do repositório e tarefas one-shot (testes, revisões de segurança, auditoria de hardcodes, validação de arquitetura e avaliação de status do projeto). |

> **VS Code 1.140:** o suporte a `.github/prompts/*.prompt.md` foi removido. Os antigos prompts one-shot foram convertidos em skills sob demanda em `.github/skills/` com `disable-model-invocation: true`, executadas apenas quando invocadas explicitamente pelo menu `/`.
| [`.github/hooks/`](../../.github/hooks/) | Hooks de ciclo de vida do GitHub Copilot que bloqueiam chamadas perigosas de ferramentas, sugerem comandos de validação após edições e injetam contexto do projeto no início da sessão. |
| [`.github/ai-lessons-learned.md`](../../.github/ai-lessons-learned.md) | Log de erros recorrentes da AI e correções usado para melhorar as instruções ao longo do tempo. |

Esses arquivos são lidos pelo VS Code Copilot / Kimi Code quando o workspace é aberto. Eles não alteram o modelo em si; fornecem guardrails específicos do projeto.

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

Um diretório `docs/ai/` separado poderia ser confundido com arquivos que a AI lê durante a execução. As instruções reais da AI vivem em `.github/`, onde o VS Code Copilot / Kimi Code pode descobri-las automaticamente. A explicação legível por humanos vive aqui, na árvore principal de documentação, junto com os outros guias de contribuição.

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

A [Matriz de Capacidades dos Agents](../../.github/agents/README.md) lista cada agente, suas ferramentas declaradas e as tarefas que cada um pode executar. Regenere-a com `node .github/agents/scripts/generate-capability-matrix.js` após editar qualquer agente.

Os frontmatters das skills seguem a [especificação Agent Skills](https://code.visualstudio.com/docs/agent-customization/agent-skills) (VS Code 1.140): `name` em kebab-case igual ao nome da pasta, `description` explicando o que a skill faz e quando usá-la, e sem os campos legados `applyTo`/`tools`. A suíte de sanidade `.github/skills/skills.sanity.test.js` roda com `npm test` e falha ruidosamente se uma skill violar a spec, já que o VS Code ignora skills inválidas silenciosamente.

### Skills em contexto fork (experimental)

Skills que leem muitos arquivos ou produzem raciocínio intermediário longo rodam em **contexto fork** (`context: fork` no frontmatter): executam em um subagente dedicado e apenas o resultado final retorna à conversa principal, mantendo o contexto limpo. As skills forkadas atuais são `context-recovery`, `security-audit`, `repository-organization-audit`, `project-status-evaluation`, `docs-completeness` e `validate-urls`.

> **Requisito experimental:** skills forkadas precisam do setting do VS Code
> `github.copilot.chat.skillTool.enabled` (VS Code ≥ 1.140). Se o comportamento
> desse recurso experimental mudar, o rollback é simplesmente remover
> `context: fork` do frontmatter — as skills funcionam inline de qualquer
> forma. Futuras skills com cargas pesadas de leitura/relatório devem seguir o
> mesmo padrão.
>
> **Observado (2026-10-07, VS Code 1.141.0):** a invocação de uma skill forkada
> tanto no harness Copilot SDK quanto na Agents Window executou inline/em
> background, sem indicação visível de subagente. O campo é mantido porque é
> inócuo quando não suportado e pode ser ativado em versões futuras; revalidar
> após atualizações do VS Code.

### Matriz de visibilidade das skills

Cada skill tem exatamente um modo de invocação, declarado no frontmatter:

| Modo | Frontmatter | No menu `/` | Carregada automaticamente pelo modelo | Skills |
| --- | --- | --- | --- | --- |
| **Automática** (padrão) | nenhuma flag | ✅ Sim | ✅ Sim, quando relevante | `dependency-review`, `docs-completeness`, `docs-update`, `educational-code-review`, `pre-commit-hash-sync`, `release-checklist`, `repository-organization-audit`, `script-contract-verification`, `security-audit`, `self-review`, `shell-script-review`, `validate-urls` |
| **Manual** | `disable-model-invocation: true` | ✅ Sim | ❌ Não | `check-hardcoded-values`, `generate-test`, `project-status-evaluation`, `validate-architecture` |
| **Background** | `user-invocable: false` | ❌ Não | ✅ Sim, quando relevante | `context-recovery`, `subagent-invocation` |

Convenções (estabelecidas em 2026-10-07, Fase AI-2.2):

- Novas skills são **automáticas** por padrão, salvo motivo para restringir.
- Use **manual** para skills de tarefa one-shot (convertidas dos antigos
  prompts) cuja execução deve ser sempre uma decisão explícita do usuário.
- Use **background** para conhecimento que o modelo deve carregar por
  relevância, mas que só adicionaria ruído ao menu `/`.

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
| [`.github/skills/shell-script-review/SKILL.md`](../../.github/skills/shell-script-review/SKILL.md) | Revisa scripts shell quanto a shebang, opções de segurança, quoting e tratamento de JSON. |
| [`.github/skills/subagent-invocation/SKILL.md`](../../.github/skills/subagent-invocation/SKILL.md) | Verifica o conjunto de ferramentas declarado de um agente antes de delegar trabalho via `runSubagent`. Inclui árvore de decisão, checklists pré/pós-delegação, templates de prompt, anti-patterns e passos de recuperação. |
| [`.github/skills/context-recovery/SKILL.md`](../../.github/skills/context-recovery/SKILL.md) | Reconstruir o estado do projeto no início da sessão ou após uma pausa. |

Skills sob demanda para tarefas one-shot (invocadas explicitamente pelo menu `/`, com `disable-model-invocation: true`) incluem:

| Skill | Use Quando |
| --- | --- |
| [`.github/skills/generate-test/SKILL.md`](../../.github/skills/generate-test/SKILL.md) | Gerar um teste para um script de defesa. |
| [`.github/skills/check-hardcoded-values/SKILL.md`](../../.github/skills/check-hardcoded-values/SKILL.md) | Auditar valores hardcoded. |
| [`.github/skills/validate-architecture/SKILL.md`](../../.github/skills/validate-architecture/SKILL.md) | Validar uma mudança contra a arquitetura do projeto. |
| [`.github/skills/project-status-evaluation/SKILL.md`](../../.github/skills/project-status-evaluation/SKILL.md) | Avaliar o readiness do projeto para release. |

> Após o VS Code 1.140 remover o suporte a arquivos de prompt, os antigos prompts one-shot foram convertidos em skills. Cinco deles se sobrepunham a skills existentes e foram fundidos: `review-security` em `security-audit`, `update-docs` em `docs-update`, `review-ai-output` em `self-review`, `verify-command-contract` em `script-contract-verification` e `code-review-for-learning` em `educational-code-review`.

Hooks de ciclo de vida seguem a [referência de hooks do GitHub Copilot](https://docs.github.com/en/copilot/reference/hooks-reference) (`{ "version": 1, "hooks": { ... } }`) e incluem:

| Hook | Propósito |
| --- | --- |
| [`.github/hooks/enforce-security.json`](../../.github/hooks/enforce-security.json) | Nega chamadas perigosas às ferramentas `bash`/`powershell`, como `npm install` direto ou remoção de `ignore-scripts`. |
| [`.github/hooks/auto-lint-test.json`](../../.github/hooks/auto-lint-test.json) | Sugere executar lint, testes, verificação de links, verificação de divergência de docs e verificação de contrato de comando após edições. |
| [`.github/hooks/inject-context.json`](../../.github/hooks/inject-context.json) | Injeta contexto do projeto (engines, contagem de TODOs, manifesto de defesas) no início da sessão. |
| [`.github/hooks/sync-pre-commit-hash.json`](../../.github/hooks/sync-pre-commit-hash.json) | Lembra os agentes de atualizar os hashes de integridade após edições de `.husky/pre-commit`. |
| [`.github/hooks/enforce-shell-script-standards.json`](../../.github/hooks/enforce-shell-script-standards.json) | Lembra os agents de revisar scripts shell contra os padrões do projeto após edições. |
| [`.github/hooks/subagent-invocation.json`](../../.github/hooks/subagent-invocation.json) | Valida chamadas `runSubagent`, emitindo contexto educativo, advertência ou bloqueio com base nas ferramentas declaradas do agente alvo. |

As implementações dos hooks ficam em [`.github/hooks/scripts/`](../../.github/hooks/scripts/).

As configurações dos hooks são validadas por `.github/hooks/hooks.sanity.test.js` (registrado no `npm test`): falha ruidosamente quando um JSON de hook está malformado, usa um evento não documentado, referencia um script inexistente, ou quando um script de hook menciona uma skill que não existe — o loader de hooks do Copilot descarta itens malformados silenciosamente, então essas checagens são o único alerta antecipado. Hooks de pós-edição escopam suas sugestões por caminho de arquivo dentro dos scripts (lint para `tools/**`, testes para qualquer `*.test.js`, verificação de links para docs), mantendo edições não relacionadas livres de ruído.
