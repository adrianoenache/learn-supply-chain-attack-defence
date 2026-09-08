# check-md-links

`check-md-links.js` valida se os links internos relativos na documentação Markdown apontam para arquivos reais. Ele garante que as referências cruzadas entre documentos apontem para arquivos existentes.

## O que faz

- Descobre todos os arquivos `.md` no repositório fora dos diretórios ignorados.
- Extrai links relativos e referências de imagem.
- Verifica se o arquivo ou âncora de destino existe.
- Usa cache por hash de conteúdo para que execuções repetidas só re-verifiquem arquivos alterados.

Implementado em [tools/check-md-links.js](../../../tools/check-md-links.js).

## Configuração

Configurações de cache no `package.json` sob `checkMdLinks`:

```json
{
  "checkMdLinks": {
    "ignoredDirs": ["node_modules", ".git"],
    "cacheTtlHours": 24,
    "cacheFile": ".md-links-cache.json"
  }
}
```

## Uso

```bash
# Execução normal
npm run defence:check-md-links

# Forçar re-verificação de todos os links
npm run defence:check-md-links -- --force
```

## Exemplo de saída

```text
128 arquivos markdown verificados, 0 links quebrados.
```

## Camada de defesa relacionada

- Portão de qualidade da documentação.
- Executado pelo `.husky/pre-commit` após alterações em markdown.
