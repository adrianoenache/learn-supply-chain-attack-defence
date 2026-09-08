# check-external-urls

`check-external-urls.js` valida se as URLs externas referenciadas em arquivos Markdown, JSON, YAML, JavaScript e shell estão acessíveis. Ele evita que a documentação prometa links quebrados.

## O que faz

- Descobre URLs `http://` e `https://` em arquivos fonte rastreados.
- Ignora caminhos da lista de permissões e URLs documentadas como mortas conhecidas.
- Verifica acessibilidade com retry, timeout e cache.
- Relata URLs inacessíveis e estatísticas de cache.

Implementado em [tools/check-external-urls.js](../../../tools/check-external-urls.js).

## Configuração

As configurações ficam no `package.json` sob `checkExternalUrls`:

```json
{
  "checkExternalUrls": {
    "ignoredDirs": ["node_modules", ".git", "coverage", ".cache", "tmp"],
    "cacheTtlHours": 24,
    "timeoutMs": 15000,
    "concurrency": 10
  }
}
```

URLs mortas conhecidas podem ser registradas em `.github/known-dead-urls.md`.

## Uso

```bash
# Execução normal (usa cache)
npm run defence:check-external-urls

# Forçar re-verificação de todas as URLs
npm run defence:check-external-urls -- --force
```

## Exemplo de saída

```text
95 URLs verificadas, 0 inacessíveis, 2 mortas conhecidas ignoradas.
```

## Camada de defesa relacionada

- Portão de qualidade da documentação.
- Executado pelo `.husky/pre-commit` após alterações na documentação.
