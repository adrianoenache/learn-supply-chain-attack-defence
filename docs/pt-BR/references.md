# Referências

Esta página reúne links úteis sobre as defesas implementadas neste projeto e sobre tópicos relacionados à segurança de supply chain. As seções extras abaixo são **apenas para referência** — não fazem parte do código do projeto, mas podem ajudar você a decidir o que implementar em seus próprios repositórios.

## Referências do Projeto

- [npm audit](https://docs.npmjs.com/cli/commands/npm-audit)
- [npm audit signatures](https://docs.npmjs.com/cli/commands/npm-audit#audit-signatures)
- [npm ci](https://docs.npmjs.com/cli/commands/npm-ci)
- [npm config](https://docs.npmjs.com/cli/commands/npm-config)
- [Husky](https://typicode.github.io/husky/)
- [Node.js test runner](https://nodejs.org/api/test.html)
- [OpenSSF Scorecard](https://github.com/ossf/scorecard)
- [A successful Git branching model (Vincent Driessen, 2010)](https://nvie.com/posts/a-successful-git-branching-model/) — o modelo Gitflow que este repositório segue com comandos git puros; ver [Fluxo de trabalho Git](git-workflow.md).
- [gitworkflows(7) — documentação oficial do git](https://git-scm.com/docs/gitworkflows) — a descrição do próprio upstream dos fluxos de branches de tópico/release/hotfix.

## Segurança de Agentes de AI

Referências acadêmicas e da indústria relevantes para a camada de customização de AI do projeto (hooks, skills e agents em `.github/`).

- [APPA: Recoverable Information-Flow Control for Real-World LLM Agents (arXiv:2607.24625)](https://arxiv.org/abs/2607.24625v2) — monitor de referência em duas fases (pré-dispatch + validação de output), branches descartáveis de confinamento de taint e recuperação em vez de aborto. Inspirou os itens AI-2.7.5 e AI-3.2 do plano.
- [How we built Copilot Cowork: migração Python→Rust (Microsoft Command Line, 2026-11-02)](https://commandline.microsoft.com/how-we-built-copilot-cowork-python-to-rust-migration/) — seis práticas de um time cujos agentes escreveram a maior parte do código: spec antes do código, agentes estreitos dentro de fronteiras claras (o host decide, o modelo nunca detém credenciais), checks que precisam provar que checaram algo, aprendizados do time commitados no repositório, codebase moldado para trabalho paralelo e loops automatizados com alvos e limites. Comparado com a infraestrutura de AI deste repositório em DECISIONS.md (ADR 2026-11-12).

## Referências Extras

### Gerenciamento de Segredos

Ferramentas para armazenar e recuperar valores sensíveis (chaves de API, tokens, credenciais de banco de dados) fora do código-fonte.

- [HashiCorp Vault OSS](https://www.vaultproject.io/) — Gerenciador de segredos open source. Auto-hospedado, gratuito.
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/) — Armazenamento gerenciado de segredos. Pago; aproximadamente **US$ 0,40 por segredo/mês** mais **US$ 0,05 a cada 10.000 chamadas de API**. Preços variam por região.
- [Azure Key Vault](https://azure.microsoft.com/en-us/products/key-vault) — Armazenamento gerenciado de segredos e chaves. Pago; aproximadamente **US$ 0,03 a cada 10.000 operações** mais custos de armazenamento de chaves/certificados. Preços variam por região.
- [Google Secret Manager](https://cloud.google.com/secret-manager) — Armazenamento gerenciado de segredos. Pago; aproximadamente **US$ 0,06 por segredo/mês** mais **US$ 0,03 a cada 10.000 acessos**. Preços variam por região.

### Assinatura de Artefatos e Provenance

Ferramentas e frameworks para verificar se um artefato publicado foi construído a partir de uma fonte confiável.

- [Sigstore](https://www.sigstore.dev/) — Padrão gratuito e open source para assinar e verificar artefatos de software. Inclui o [Cosign](https://github.com/sigstore/cosign) para assinatura de containers.
- [SLSA — Supply-chain Levels for Software Artifacts](https://slsa.dev/) — Framework gratuito e aberto para melhorar a integridade de artefatos e a segurança da supply chain.

### Padrões de SBOM

Padrões para descrever os componentes de uma lista de materiais de software.

- [CycloneDX](https://cyclonedx.org/) — Padrão de SBOM gratuito e open source mantido pela OWASP.
- [SPDX](https://spdx.dev/) — Padrão de SBOM gratuito e open source mantido pela Linux Foundation e reconhecido como padrão ISO.

### Secret Scanning

Ferramentas para detectar segredos acidentalmente commitados no controle de versão.

- [TruffleHog](https://trufflesecurity.com/trufflehog) — Scanner de segredos open source. Também existe uma versão comercial com recursos extras.
- [git-secrets](https://github.com/awslabs/git-secrets) — Ferramenta gratuita e open source da AWS Labs que evita o commit de segredos no Git.
