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
