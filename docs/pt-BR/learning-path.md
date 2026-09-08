# Roteiro de Aprendizado

Este guia apresenta um roteiro curado pelo repositório para iniciantes, usuários intermediários e praticantes avançados. Cada trilha se baseia na anterior, indo de conceitos até hábitos operacionais do dia a dia.

## Trilha 1 — Fundamentos

Comece aqui se você é novo em segurança de cadeia de suprimentos.

- O que são ataques de cadeia de suprimentos e por que o npm é um alvo de alto valor.
- A mentalidade de defesa em profundidade: nenhum controle isolado é suficiente.
- Visão geral das 12 camadas de defesa usadas neste projeto.

Veja [O que é um ataque de cadeia de suprimentos?](security/what-is-supply-chain-attack.md) e a [visão geral de segurança](security/index.md).

**Público:** iniciante.

## Trilha 2 — Configuração segura

Configure um ambiente local seguro antes de adicionar código ou dependências.

- Execute `npm run setup` (ou `npm run defence:bootstrap`) para instalar as defesas.
- Entenda as decisões de hardening do [`.npmrc`](../../.npmrc).
- Ative o hook de pre-commit e verifique a compatibilidade das versões do Node/npm.

Veja [Primeiros passos](getting-started.md), [Setup](setup.md) e [Camada de Defesa 6 — `.npmrc` endurecido](security/defense-layer-6-npmrc-config.md).

**Público:** iniciante, intermediário.

## Trilha 3 — Adicionando dependências com segurança

Aprenda o fluxo seguro para trazer novos pacotes para o projeto.

- Use o wrapper `defence:add` em vez de `npm install`.
- Leia os resultados da verificação de idade do pacote.
- Verifique assinaturas/provenance e inspecione scripts de lifecycle.

Veja [Adicionando dependências](dependencies.md), [Camada de Defesa 1 — Verificação de idade do pacote](security/defense-layer-1-package-age.md), [Camada de Defesa 2 — Verificação de assinatura](security/defense-layer-2-signatures.md), [Análise de scripts de lifecycle](security/lifecycle-script-analysis.md) e [Pontuação de confiança](trust-scoring.md).

**Público:** intermediário.

## Trilha 4 — Manutenção

Mantenha o projeto saudável ao longo do tempo sem contornar os controles.

- Execute `defence:update` e `defence:update-check`.
- Revise alterações de licença antes de mesclar atualizações.
- Reexecute as verificações de idade após qualquer instalação.

Veja [Camada de Defesa 8 — Verificação de disponibilidade de atualização](security/defense-layer-8-update-check.md), [Camada de Defesa 9 — Verificação de licença](security/defense-layer-9-license-check.md) e [SBOM e conformidade](sbom-and-compliance.md).

**Público:** intermediário, avançado.

## Trilha 5 — Operação e conformidade

Integre os resultados de segurança aos fluxos de revisão e release.

- Gere um SBOM para artefatos de release.
- Gere e interprete um relatório de confiança.
- Monitore instalações e reaja a drift.

Veja [SBOM e conformidade](sbom-and-compliance.md), [Pontuação de confiança](trust-scoring.md), [Monitoramento de processos de lifecycle](lifecycle-monitoring.md) e [Ferramentas](tools.md).

**Público:** avançado.

## Tutoriais práticos

### Tutorial A — Adicione sua primeira dependência com defesa

1. Escolha um pacote conhecido, por exemplo `lodash`.
2. Execute o wrapper seguro:

   ```bash
   npm run defence:add -- lodash@4.17.21
   ```

3. Revise a saída:
   - A verificação de idade deve informar que o pacote tem pelo menos 7 dias.
   - A verificação de assinatura deve passar.
   - A análise de scripts de lifecycle não deve sinalizar padrões de alto risco.
4. Se todos os controles passarem, confirme a instalação quando solicitado.
5. Inspecione as alterações em `package.json` e `package-lock.json` antes de commitar.

### Tutorial B — Gere um SBOM

1. Certifique-se de que `package-lock.json` esteja atualizado.
2. Execute:

   ```bash
   npm run defence:generate-sbom
   ```

3. Abra o arquivo `sbom.json` gerado e verifique se ele lista cada dependência com sua integridade SHA-512.
4. Anexe o SBOM aos artefatos de release ou armazene-o para resposta a incidentes.

### Tutorial C — Interprete um relatório de confiança

1. Execute o dashboard de pontuação de confiança:

   ```bash
   npm run defence:trust-report
   ```

2. Observe a divisão da pontuação por pacote:
   - Idade, cadência, downloads, mantenedores, provenance, risco de typosquatting, risco de lifecycle e licença.
3. Investigue qualquer pacote abaixo da pontuação mínima configurada.
4. Use a saída JSON para portões automatizados:

   ```bash
   npm run defence:trust-report:fail
   ```

Veja [Pontuação de confiança](trust-scoring.md).

## Próximos passos

- Navegue pela [referência completa de ferramentas](tools.md).
- Leia o [guia de referência rápida](quick-reference.md) para comandos do dia a dia.
- Se algo falhar, consulte [Solução de problemas](troubleshooting.md).
