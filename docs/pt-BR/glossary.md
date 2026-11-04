# Glossário

Este glossário define termos usados em toda a documentação do projeto. É destinado a aprendizes, contribuidores e auditores que podem não estar familiarizados com a terminologia de segurança de supply chain.

## Agent

Agente de AI customizado definido em `.github/agents/<nome>.agent.md` (description, tools e escopo `applyTo` no frontmatter). Agents atuam como revisores especializados por domínio, invocados em tarefas delegadas a subagentes; a suíte `agents.sanity.test.js` protege sua configuração.

## CODEOWNERS

Arquivo do GitHub (`.github/CODEOWNERS`) que atribui propriedade de paths do repositório a mantenedores. Combinado com a proteção de branches, forma a camada de defesa *organizacional*: mudanças em paths críticos (ferramentas de defesa, hooks, workflows, configuração npm, customizações de AI) exigem revisão do code owner antes do merge.

## Confusão de dependências (dependency confusion)

Ataque em que um pacote público é publicado com o mesmo nome de um pacote privado interno. Se o gerenciador de pacotes resolver o nome público primeiro, o código malicioso é instalado em vez do interno.

## Distância de Levenshtein

Medida de quantas edições de caractere único são necessárias para transformar uma string em outra. Este projeto a utiliza para detectar nomes de pacotes visualmente semelhantes a dependências existentes (typosquatting).

## Fork

Campo opcional do frontmatter de skills (`context: fork`, especificação Agent Skills do VS Code, experimental) destinado a executar a skill num contexto dedicado de subagente, de modo que apenas o resultado final retorne à conversa principal. Até o VS Code 1.144.1 não tem efeito observado, e as notas da 1.145 não mencionam o campo; o projeto o mantém por ser inócuo e revalida a cada atualização do editor.

## Hook

Hook de lifecycle do Copilot (`.github/hooks/*.json` + script shell) executado em eventos como início de sessão ou pré/pós uso de ferramenta. Hooks são a camada determinística da superfície de AI: impõem garantias (bloquear comandos perigosos, proteger paths de escrita) que não podem depender do julgamento do modelo.

## Instalação determinística

Processo de instalação que produz a mesma árvore de dependências toda vez que é executado. Em projetos npm, isso é alcançado instalando a partir de um `package-lock.json` verificado usando `npm ci` em vez de `npm install`.

## Integridade do lock file

Propriedade de uma entrada do `package-lock.json` que inclui um hash criptográfico (geralmente SHA-512) do tarball do pacote. Verificar a integridade garante que o pacote instalado corresponde ao que foi auditado.

## intermediateEligible

Campo produzido pelo `check-updates.js` listando as versões entre a instalada e a `latest` que já satisfazem o portão de idade mínima, em ordem crescente. O `update-packages.js` prefere a maior intermediária elegível em vez de pular direto para uma `latest` recente demais.

## Provenance

Uma atestação assinada do registry de pacotes que registra como um pacote foi construído e publicado. Provenance ajuda os usuários a verificar se um pacote veio de uma fonte e pipeline de build esperados.

## Quarentena (quarantine)

Classificação que o `check-updates.js` dá a uma versão publicada recentemente demais para passar no portão de idade mínima. Pacotes em quarentena não são instalados; os que têm versões intermediárias elegíveis são "quarentena acionável" e podem avançar para a intermediária aprovada por idade mais recente.

## SBOM (Software Bill of Materials)

Inventário legível por máquina de todos os componentes de um projeto de software. Este projeto pode gerar um SBOM CycloneDX 1.4 JSON a partir do `package-lock.json` para compliance e resposta a incidentes.

## schemaVersion

Campo de versão embutido nos arquivos de estado das ferramentas (ex.: `.defence-update-check.json`). Leitores avisam quando um arquivo carrega um schema mais novo do que o suportado, prevenindo leituras silenciosamente incorretas entre versões de ferramentas.

## Scripts de lifecycle

Scripts npm como `postinstall`, `preinstall` e `prepare` que são executados automaticamente durante a instalação de pacotes. Eles são um caminho de execução comum para código malicioso, por isso este projeto os desabilita por padrão via `ignore-scripts` no `.npmrc`.

## Skill

Procedimento de AI empacotado seguindo a especificação Agent Skills: `.github/skills/<nome>/SKILL.md` com `name` em kebab-case igual à pasta e `description` dizendo o que faz e quando usar. Skills carregam por relevância para o modelo ou por invocação explícita via `/`; a suíte `skills.sanity.test.js` garante conformidade com a spec.

## SLSA

Supply-chain Levels for Software Artifacts. Um framework de segurança que fornece diretrizes e atestações para cadeias de suprimento de software seguras. Atestações de provenance são uma primitiva do SLSA.

## Time-of-check/time-of-use (TOCTOU)

Janela de vulnerabilidade em que um recurso é verificado e depois usado, mas o recurso pode ter mudado no intervalo. Este projeto fecha a janela TOCTOU em `add-package.js` re-verificando os metadados do pacote após a instalação.

## Typosquatting

Ataque em que um pacote malicioso é publicado com nome muito semelhante a um pacote legítimo popular, na esperança de que os usuários digitem o nome errado durante a instalação.
