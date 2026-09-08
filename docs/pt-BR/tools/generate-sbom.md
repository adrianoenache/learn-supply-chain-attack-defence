# generate-sbom

`generate-sbom.js` cria um SBOM CycloneDX 1.4 em JSON a partir do `package-lock.json` para conformidade e resposta a incidentes.

## O que faz

- Faz o parsing do lockfile para enumerar todas as dependências.
- Extrai metadados do pacote e valores de integridade SHA-512.
- Grava um arquivo CycloneDX 1.4 JSON.

Implementado em [tools/generate-sbom.js](../../../tools/generate-sbom.js).

## Uso

```bash
# Gerar sbom.json
npm run defence:generate-sbom

# Caminho de saída personalizado
node ./tools/generate-sbom.js --output=dist/sbom.json
```

## Exemplo de saída

```text
SBOM gravado em sbom.json
```

O `sbom.json` gerado contém um array `components` com o nome, versão, purl e hashes de cada dependência.

## Camada de defesa relacionada

- [SBOM e conformidade](../sbom-and-compliance.md)
- Parte do job `defence-gates` do CI/CD.
