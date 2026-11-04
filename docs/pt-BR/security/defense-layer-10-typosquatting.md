# Camada de Defesa 10 — Detecção de Typosquatting e Confusão de Dependências

Atacantes registram nomes de pacotes visualmente similares a pacotes populares (`loadsh` em vez de `lodash`) ou publicam nomes de pacotes internos no registry público. Esses ataques exploram erros humanos e sistemas de build que baixam de registros privados e públicos ao mesmo tempo.

## O Que Esta Camada Detecta

- **Typosquatting**: o nome solicitado está dentro de uma distância Levenshtein configurável de uma dependência existente.
- **Confusão de dependências**: o nome solicitado coincide com um nome de pacote interno/privado configurado que já existe no registry público do npm.

## Configuração

Defina o limite e os nomes internos em `package.json`:

```json
{
  "defences": {
    "typosquattingThreshold": 2,
    "internalPackageNames": ["@mycompany/core", "@mycompany/shared"]
  }
}
```

- `typosquattingThreshold` — distância de edição máxima que dispara um conflito (padrão: `2`).
- `internalPackageNames` — lista de nomes de pacotes privados que nunca deveriam aparecer no registry público.

## Implementação

Implementado em:

- [tools/lib/typosquatting.js](../../../tools/lib/typosquatting.js)
- [tools/add-package.js](../../../tools/add-package.js)

O `add-package.js` executa a verificação antes de qualquer requisição de rede ou instalação. Ele carrega os nomes das dependências existentes a partir do `package.json` e do `package-lock.json`, depois compara o nome do pacote solicitado com eles. Para nomes internos, ele consulta o registry público do npm; um 404 significa que o nome é seguro, enquanto qualquer outra resposta é tratada como um potencial squat.

## Uso

A verificação é executada automaticamente sempre que uma dependência é adicionada:

```bash
npm run defence:add -- lodash@4.17.21
```

Se um conflito for detectado, a instalação é abortada com uma explicação clara.

## Por Que Distância Levenshtein?

A distância Levenshtein conta o número mínimo de edições de caractere único (inserções, exclusões, substituições) necessárias para transformar um nome em outro. Um limite de `2` captura erros de digitação comuns e engodos visuais sem sinalizar nomes legítimos não relacionados.
