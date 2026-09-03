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
| [`.github/agents/`](../../.github/agents/) | Agents especializados para revisões de segurança, qualidade, performance, documentação e compliance. |
| [`.github/skills/`](../../.github/skills/) | Procedimentos reutilizáveis para auditorias de segurança, revisão de dependências, atualização de docs, releases e self-review. |
| [`.github/prompts/`](../../.github/prompts/) | Templates de prompt one-shot para testes, revisões de segurança, atualização de docs, auditoria de hardcodes e revisão de saídas da AI. |
| [`.github/hooks/`](../../.github/hooks/) | Hooks de ciclo de vida que alertam ou bloqueiam solicitações de alto risco e sugerem comandos de validação. |
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

## Revisão Humana

Toda sugestão gerada pela AI deve ser revisada por um humano antes de ser commitada. Preste atenção especial a:

- Limites de segurança e decisões de política.
- Versões de dependências e compatibilidade de licenças.
- Alterações em `.husky/pre-commit`, `.npmrc` ou `package.json`.
- Novos casos de teste e impacto na cobertura.

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

Skills reutilizáveis incluem:

| Skill | Use Quando |
| --- | --- |
| [`.github/skills/security-audit/SKILL.md`](../../.github/skills/security-audit/SKILL.md) | Revisar uma mudança contra as 12 camadas de defesa. |
| [`.github/skills/dependency-review/SKILL.md`](../../.github/skills/dependency-review/SKILL.md) | Adicionar ou avaliar uma dependência. |
| [`.github/skills/docs-update/SKILL.md`](../../.github/skills/docs-update/SKILL.md) | Atualizar a documentação bilíngue. |
| [`.github/skills/release-checklist/SKILL.md`](../../.github/skills/release-checklist/SKILL.md) | Criar uma tag de release. |
| [`.github/skills/self-review/SKILL.md`](../../.github/skills/self-review/SKILL.md) | Revisar uma saída anterior da AI e melhorar as instruções. |
