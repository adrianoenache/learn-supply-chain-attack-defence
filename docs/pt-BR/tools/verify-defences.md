# verify-defences

`verify-defences.js` verifica se os arquivos copiados por `install-defences.js` ainda correspondem aos hashes SHA-256 registrados em `.defence-manifest.json`.

## O que faz

- Lê `.defence-manifest.json`.
- Calcula o hash SHA-256 atual de cada arquivo listado.
- Reporta arquivos ausentes, alterados ou extras.
- Suporta saída JSON para portões de CI.

Implementado em [tools/verify-defences.js](../../../tools/verify-defences.js).

## Uso

```bash
# Verificar arquivos copiados
npm run defence:verify-defences

# Saída JSON
npm run defence:verify-defences -- --json

# Modo silencioso
npm run defence:verify-defences -- --silent

# Regenerar o manifesto após alterações deliberadas
npm run defence:verify-defences:fix
```

## Exemplo de saída

```text
Verified <N> defence file(s).
All defence files match the manifest.
```

(`<N>` é a contagem viva de entradas do manifesto, que cresce conforme arquivos de defesa são adicionados; a saída da ferramenta é em inglês.)

## Camada de defesa relacionada

- Portão de integridade de adoção.
- Parte do job `install-defences-dry-run` do CI.
