# Análise de Scripts de Lifecycle

O comando `defence:analyze-lifecycle-scripts` executa uma **análise estática e somente leitura** dos scripts de lifecycle declarados por uma versão de pacote npm antes que qualquer código seja instalado. Ele busca o manifesto do pacote no registry, extrai scripts como `preinstall`, `install`, `postinstall`, `prepare` e `prepublish`, e sinaliza padrões comuns que aumentam o risco de supply chain.

## Por que isso importa

Scripts de lifecycle são executados automaticamente durante `npm install`, a menos que sejam bloqueados. Este projeto já os bloqueia com `ignore-scripts=true` no `.npmrc`, que é a defesa primária. O analisador adiciona duas coisas além desse bloqueio:

1. **Visibilidade**: ele mostra *o que* rodaria se os scripts estivessem habilitados, para que você possa decidir se um pacote vale a pena passar por uma etapa manual de `npm rebuild`.
2. **Gate fail-fast**: ele pode abortar o `npm run defence:add` antes da instalação quando um pacote declara scripts de alto risco, como chamadas de rede externas, execução de shell ou avaliação dinâmica de código.

## O que é verificado

O analisador procura por padrões como:

| Padrão de risco | Severidade | Indicador de exemplo |
| --- | --- | --- |
| Cria processo filho | alta | `child_process`, `exec`, `spawn` |
| Avaliação dinâmica de código | alta | `eval`, `Function(...)`, `new Function` |
| Requisição de rede externa | alta | `fetch(`, `https.get(`, `axios` |
| Escrita no filesystem | média | `fs.writeFileSync`, `writeFile` |
| Leitura de variáveis de ambiente | média | `process.env` |
| Mudança de permissões | alta | `chmod`, `chown` |
| Compilação de addon nativo | média | `node-gyp`, `prebuild-install` |
| Payload potencialmente ofuscado | média | `atob`, `btoa`, literais Base64 longos |

Os padrões são correspondidos com expressões regulares. O analisador **não** é um sandbox e não pode provar que um script é malicioso; ele apenas destaca comportamentos incomuns para uma etapa de instalação e que merecem revisão.

## Uso

```bash
# Relatório em tabela (padrão)
npm run defence:analyze-lifecycle-scripts -- --pkg=sharp@0.33.5

# Saída JSON para CI ou processamento posterior
npm run defence:analyze-lifecycle-scripts -- --pkg=sharp@0.33.5 --format=json

# Sai com código não-zero em findings de alto risco
npm run defence:analyze-lifecycle-scripts -- --pkg=sharp@0.33.5 --fail
```

Você também pode executar o módulo subjacente diretamente:

```bash
node ./tools/analyze-lifecycle-scripts.js --pkg=sharp@0.33.5
```

## Integração com `defence:add`

O `tools/add-package.js` executa a análise automaticamente após a verificação de provenance e antes do `npm install`. O comportamento é controlado pelo campo `lifecycleScriptAnalysis` no `package.json`:

```json
{
  "lifecycleScriptAnalysis": {
    "enabled": true,
    "failOn": "high"
  }
}
```

- `enabled` — defina como `false` para pular a análise completamente.
- `failOn` — aborta a instalação quando o pacote atinge esse nível de risco. Valores permitidos: `high`, `medium`, `low`, `none`. O padrão é `high`.

Quando a análise bloqueia uma instalação, você verá uma saída similar a:

```text
Analyzing lifecycle scripts for risky-pkg@1.0.0...
  Found 1 lifecycle script(s)
  1 risky pattern(s) detected (risk level: high)
    [HIGH] postinstall: makes an outbound network request

Lifecycle script analysis FAILED for risky-pkg@1.0.0: risk level is high.
Installation aborted — review the package scripts or adjust lifecycleScriptAnalysis.failOn.
```

## Relação com outras defesas

- **Camada 6 — `.npmrc` endurecido**: `ignore-scripts=true` é a proteção primária. O analisador é uma camada de visibilidade sobre ela.
- **Camada 11 — Provenance**: a provenance diz *quem* construiu o pacote; a análise de lifecycle diz *o que* o pacote tenta fazer no momento da instalação.
- **Recompilando pacotes com lifecycle scripts**: quando você instala deliberadamente um pacote com scripts de lifecycle seguros que precisam rodar (por exemplo `esbuild` ou `sharp`), siga o [guia de recompilação](rebuilding-lifecycle-packages.md).

## Limitações

- O analisador inspeciona apenas o **pacote direto** sendo adicionado. Dependências transitivas não são escaneadas nesta primeira versão.
- Análise por expressões regulares pode perder código ofuscado e pode produzir falsos positivos. É uma ferramenta de triagem, não um substituto para revisão manual.
- Addons nativos são sinalizados como risco médio porque compilam código específico de plataforma, mesmo que muitos pacotes populares façam isso de forma legítima.
