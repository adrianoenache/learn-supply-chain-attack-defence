# Organização do Repositório

Como este repositório é organizado e por quê. Esta página documenta as
convenções de layout, a camada CODEOWNERS e as regras que mantêm o projeto
previsível à medida que cresce.

> **Nota (Fase H):** esta página está sendo expandida durante a Fase H; a
> seção CODEOWNERS abaixo está completa, e a auditoria estrutural completa
> chega com o item H.5.

## Convenções de layout

- `tools/` — scripts de defesa (`<acao>.js`), cada um com um `<acao>.test.js`
  irmão e uma página em `docs/{en,pt-BR}/tools/`.
- `tools/lib/` — helpers compartilhados com uma única responsabilidade por
  módulo (`config.js`, `concurrency.js`, `retry-fetch.js`, `registry-cache.js`, …).
- `docs/en/` e `docs/pt-BR/` — documentação bilíngue com estrutura idêntica;
  toda página existe nos dois idiomas.
- `.github/` — customizações de AI (`instructions/`, `agents/`, `skills/`,
  `hooks/`), workflows de CI e templates do repositório.

Arquivos novos devem ser descobertas a partir de um índice, manifesto ou
página de documentação (sem arquivos órfãos).

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
