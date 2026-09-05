# SBOM e Conformidade

Um Software Bill of Materials (SBOM) é um inventário de todos os componentes de um produto de software. Para segurança da cadeia de suprimentos, um SBOM torna possível saber exatamente quais dependências foram usadas para construir uma release e reagir rapidamente quando uma vulnerabilidade é divulgada.

## Por que o SBOM importa

- **Resposta a vulnerabilidades:** quando um pacote é comprometido, o SBOM informa se a release é afetada.
- **Conformidade de licenças:** auditores podem verificar se apenas licenças aprovadas estão presentes.
- **Reprodutibilidade:** o SBOM captura as versões exatas usadas durante um build.

## CycloneDX 1.4

Este projeto gera SBOMs no formato CycloneDX 1.4:

```bash
npm run defence:generate-sbom
```

A saída é escrita em `/tmp/sbom.json` e inclui metadados dos componentes, dependências e hashes.

## Consumindo o `sbom.json`

Inspecione os metadados de topo:

```bash
jq '.metadata' /tmp/sbom.json
```

Liste todos os nomes de pacotes:

```bash
jq '.components[].name' /tmp/sbom.json
```

Conte os componentes:

```bash
jq '.components | length' /tmp/sbom.json
```

### Exemplos de integração

- **OWASP Dependency-Check:** aponte-o para `sbom.json` como uma entrada CycloneDX.
- **Dependency-Track:** envie o SBOM para um servidor Dependency-Track para monitoramento contínuo.
- **Auditorias manuais:** use `jq` ou um editor de texto para revisar pacotes inesperados ou campos de licença.

## Artefato SBOM no CI

O job `defence-gates` envia o SBOM gerado como um artefato do workflow:

```text
sbom-${{ github.run_id }}
```

com `retention-days: 30` e `archive: false`. Baixe-o pelo sumário da execução do workflow ou com:

```bash
gh run download <run-id> -n sbom-<run-id>
```

Consulte [ci-cd-overview.md](ci-cd-overview.md) para mais detalhes sobre o workflow de CI.

## Casos de uso de conformidade

| Cenário | Como o SBOM ajuda |
|---|---|
| Incidente de segurança | Identificar rapidamente releases e componentes afetados. |
| Auditoria de licenças | Provar que apenas licenças aprovadas são enviadas. |
| Revisão de fornecedor | Compartilhar o SBOM com consumidores downstream. |
| Solicitação regulatória | Fornecer um inventário legível por máquina de código de terceiros. |
