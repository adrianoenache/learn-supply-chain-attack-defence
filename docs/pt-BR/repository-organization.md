# Organização do Repositório

Como este repositório é organizado e por quê. Esta página documenta as
convenções de layout, a camada CODEOWNERS, os resultados da auditoria e as
regras que mantêm o projeto previsível à medida que cresce.

## Convenções de layout

- `tools/` — scripts de defesa (`<acao>.js`), cada um com um `<acao>.test.js`
  irmão e uma página em `docs/{en,pt-BR}/tools/`.
- `tools/lib/` — helpers compartilhados com uma única responsabilidade por
  módulo (`config.js`, `concurrency.js`, `retry-fetch.js`, `registry-cache.js`, …).
- `tools/perf/` — harness de benchmark das ferramentas de defesa.
- `tools/e2e/` — fixtures e testes de ponta a ponta (requerem acesso à rede).
- `docs/en/` e `docs/pt-BR/` — documentação bilíngue com estrutura idêntica;
  toda página existe nos dois idiomas.
- `.github/` — customizações de AI (`instructions/`, `agents/`, `skills/`,
  `hooks/`), workflows de CI, templates de issue/PR e os arquivos de
  governança (`CODEOWNERS`, `PLAN.md`).

Arquivos novos devem ser descobertos a partir de um índice, manifesto ou
página de documentação (sem arquivos órfãos).

## O que deliberadamente NÃO é extraído

A Fase H avaliou extrair `tools/lib/formatters.js` e `tools/lib/cli.js` e
decidiu **contra** (registrado em `DECISIONS.md`): os formatadores de relatório
são específicos de domínio por ferramenta (uma tabela de licenças não é uma
tabela de SBOM), e `parseCliArgs` é uma convenção de 3 linhas
(`argv.includes('--flag')`) que um módulo compartilhado complicaria, não
simplificaria. A regra: extrair apenas quando a implementação é
byte-idêntica em mais de um arquivo — como foi o caso de
`tools/lib/concurrency.js`.

## Resultados da auditoria (2026-10-08)

- **Arquivos órfãos:** nenhum. Todo script é referenciado pelo `package.json`,
  uma página de docs, uma entrada de manifesto ou um hook. Arquivos de teste
  são descobertos pelos globs do script `test` e não precisam de entrada em
  índice.
- **Higiene de applyTo:** nenhum padrão amplo `**`; toda instruction/agent
  declara um padrão com escopo. Garantido continuamente pelo
  `agents.sanity.test.js`.
- **Nomes:** ferramentas são `<acao>.js`; testes são `<acao>.test.js` irmãos;
  páginas de docs espelham o nome da ferramenta em `docs/{en,pt-BR}/tools/`.

## CODEOWNERS

As doze camadas técnicas de defesa verificam código automaticamente; o
[`.github/CODEOWNERS`](../../.github/CODEOWNERS) é a **camada
organizacional**: exige revisão humana para qualquer mudança que possa
enfraquecer um portão de segurança ou direcionar os assistentes de AI do
projeto.

### O que ele protege

| Caminho | Por que precisa de revisão |
| --- | --- |
| `tools/` | As próprias ferramentas de defesa — uma mudança sutil pode desabilitar um portão. |
| `.npmrc`, `package.json`, `package-lock.json`, `.defence-manifest.json` | Política de supply chain: registry, scripts de ciclo de vida, versões pinadas e o manifesto de adoção. |
| `.husky/`, `.github/hooks/`, `.github/workflows/` | Enforcement em tempo de commit e de CI; guardas de execução da AI. |
| `.github/copilot-instructions.md`, `.github/instructions/`, `.github/agents/`, `.github/skills/` | A superfície de customização de AI — uma edição maliciosa aqui direciona toda sessão futura de AI neste repositório. |

### Habilitando a exigência

O CODEOWNERS só faz efeito quando a branch protection o referencia:

1. Abra **Settings → Branches** no repositório do GitHub.
2. Edite a regra de `main` (e de `dev`).
3. Habilite **Require a pull request before merging**.
4. Habilite **Require review from Code Owners**.
5. Salve.

A partir daí, qualquer PR que toque um caminho protegido solicita revisão de
`@adrianoenache` automaticamente.

> **Nota sobre mantenedor único (estado atual):** o número mínimo de
> *aprovações* está em **0**, porque um mantenedor solo não pode aprovar a
> própria PR (count = 1 travaria todo merge). A exigência de revisão de Code
> Owner e os status checks permanecem totalmente ativos. Esta é uma flexibilização
> **temporária e documentada** — revisite quando o projeto ganhar mantenedores
> ou revisores adicionais. Registrado em [DECISIONS.md](../../DECISIONS.md).

### Status checks obrigatórios (próximo passo recomendado)

O CODEOWNERS garante revisão *humana*; ele não impede o merge de uma PR com o
CI vermelho. Habilitar **Require status checks to pass before merging** fecha
essa lacuna — a aprovação humana só acontece depois dos portões automáticos
estarem verdes:

1. Na mesma regra de branch, habilite **Require status checks to pass before
   merging**.
2. Habilite **Require branches to be up to date before merging** (modo
   estrito; relaxe-o primeiro se o atrito de rebase se tornar desproporcional
   em um repositório de baixo tráfego).
3. Adicione os nomes dos jobs de `.github/workflows/ci.yml` como checks
   obrigatórios: `Build`, `Test`, `Coverage`, `Lint`, `Format`,
   `Documentation Links`, `License Check`, `Lockfile Integrity`,
   `Secret Scan`, `Installer Dry-Run`, `Defence Gates`.

A cadeia de merge resultante é o projeto ensinando o próprio modelo:

```text
commit → git hooks → GitHub Actions → status checks obrigatórios → CODEOWNERS → merge
```

### Ajustando a titularidade

Edite `.github/CODEOWNERS` conforme o projeto ganha mantenedores. Prefira o
caminho mais específico no final do arquivo (a última regra correspondente
vence).
