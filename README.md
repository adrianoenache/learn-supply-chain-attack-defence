# Learn supply chain attack defence

## Ambiente de Desenvolvimento

Este projeto é desenvolvido em **WSL 2 com Ubuntu 24.04**, usando **nvm** como gerenciador do Node.js e a versão estável mais recente do Git.

### Pré-requisitos

#### 1. WSL 2 + Ubuntu 24.04

Instale o WSL 2 com Ubuntu a partir do PowerShell no Windows:

```powershell
wsl --install
```

> O Ubuntu é a distribuição padrão. Para mais detalhes, consulte a [documentação oficial do WSL](https://learn.microsoft.com/pt-br/windows/wsl/install).

Após a instalação, atualize os pacotes da distribuição:

```bash
sudo apt update && sudo apt upgrade
```

#### 2. Git (versão estável mais recente)

O pacote `git` dos repositórios padrão do Ubuntu pode estar desatualizado. Para instalar a versão estável mais recente, use o PPA oficial do Git, conforme indicado em [git-scm.com/install/linux](https://git-scm.com/install/linux):

```bash
sudo add-apt-repository ppa:git-core/ppa
sudo apt update
sudo apt install git
```

Verifique a versão instalada:

```bash
git --version
```

#### 3. nvm + Node.js

Instale o nvm conforme recomendado pela [documentação da Microsoft para Node.js no WSL](https://learn.microsoft.com/pt-br/windows/dev-environment/javascript/nodejs-on-wsl):

```bash
sudo apt-get install curl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
```

Feche e reabra o terminal, depois instale e ative a versão LTS do Node.js:

```bash
nvm install --lts
nvm use --lts
```

Confirme as versões instaladas (o projeto exige as versões definidas no campo `engines` do `package.json`):

```bash
node --version
npm --version
```

---

### Configuração do Husky no WSL com nvm

O Husky executa os hooks Git em um **shell não-interativo**, que não carrega o `.bashrc` ou `.zshrc`. Por isso, o nvm não é inicializado automaticamente e o `npm` não é encontrado no `PATH`, causando o erro:

```
.husky/pre-commit: 1: npm: not found
husky - pre-commit script failed (code 127)
```

**Solução:** criar o arquivo de inicialização global do Husky em `~/.config/husky/init.sh`, que é carregado automaticamente antes de qualquer hook:

```bash
mkdir -p ~/.config/husky
cat > ~/.config/husky/init.sh << 'EOF'
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
EOF
```

> **Nota:** versões anteriores do Husky suportavam `~/.huskyrc`, mas esse caminho está deprecado desde o Husky v9. O caminho correto é `~/.config/husky/init.sh`.

Após criar o arquivo, valide executando um commit de teste:

```bash
git commit --allow-empty -m "test: verify husky pre-commit hook"
```

O hook deve executar com sucesso, sem o erro `npm: not found`.

---

## Git Hooks

> **Pré-requisito:** em ambientes WSL com nvm, configure o Husky antes de usar os hooks — veja [Configuração do Husky no WSL com nvm](#configuração-do-husky-no-wsl-com-nvm).

O [Husky](https://typicode.github.io/husky/) executa automaticamente as seguintes verificações
**antes de cada commit**:

1. `npm audit signatures` — verifica a integridade dos pacotes contra o registry
2. `npm audit --audit-level=high` — bloqueia commits se CVEs altas ou críticas estiverem presentes

---

## Segurança

Este projeto adota defesa em profundidade contra ataques à cadeia de suprimentos de software
(*supply chain attacks*). As medidas implementadas atuam em camadas complementares, cobrindo
desde a instalação das dependências até cada commit realizado.

---

### O que é um Supply Chain Attack?

Um ataque à cadeia de suprimentos ocorre quando um agente malicioso compromete não o sistema-alvo
diretamente, mas uma **dependência de terceiros** que ele utiliza. No ecossistema npm, os vetores
mais comuns são:

- **Typosquatting** — publicação de pacotes com nomes semelhantes a pacotes legítimos
  (ex: `lodahs` no lugar de `lodash`)
- **Fast-publish attack** — uma versão maliciosa é publicada, usada brevemente e removida antes
  de ser amplamente detectada
- **Account takeover** — credenciais de um mantenedor legítimo são comprometidas, permitindo a
  publicação de uma versão infectada
- **Dependency confusion** — pacotes privados são substituídos por versões públicas maliciosas
  com número de versão maior

#### Casos reais que motivaram as proteções deste projeto

| Ano  | Incidente        | Impacto                                                                                         |
|------|------------------|-------------------------------------------------------------------------------------------------|
| 2018 | **event-stream** | Código malicioso injetado via dependência transitiva; roubava carteiras Bitcoin                 |
| 2021 | **ua-parser-js** | Credenciais do mantenedor comprometidas; versão infectada publicada com minerador e RAT         |
| 2022 | **node-ipc**     | Mantenedor inseriu deliberadamente código destrutivo (protestware) na própria biblioteca        |

---

### Medida 1 — Verificação de Idade dos Pacotes (`check-package-age.js`)

**Arquivo:** `tools/check-package-age.js`  
**Executado em:** `npm run setup` e `npm run npm-reinstall`

Esta ferramenta consulta o registry do npm para **cada dependência declarada** no `package.json`
e verifica há quantos dias aquela versão específica foi publicada. Se qualquer pacote foi publicado
há menos de **3 dias**, a instalação é abortada com erro.

#### Por que 3 dias?

A janela de 3 dias é baseada no tempo médio que scanners de segurança automatizados,
pesquisadores e a comunidade levam para identificar e reportar versões maliciosas publicadas
no npm. Ataques do tipo fast-publish dependem de uma janela curta de exposição antes da remoção;
esse atraso elimina a janela.

#### Como funciona tecnicamente

```
package.json (dependencies + devDependencies)
        │
        ▼
  Para cada pacote@versão
        │
        ▼
  GET https://registry.npmjs.org/{nome}
        │
        ▼
  Lê campo time[versão] → data de publicação ISO 8601
        │
        ▼
  idade = hoje − data_publicação (em dias)
        │
        ├─ idade >= 3 dias → OK, continua
        └─ idade < 3 dias  → ERRO, aborta instalação
```

> **Nota de design:** o script usa apenas módulos nativos do Node.js (`node:https`, `node:path`).
> Isso é intencional — o script é executado **antes** de `npm ci`, portanto não pode
> depender de nenhum pacote instalável. Qualquer dependência aqui seria um vetor de ataque em si.
> O `package.json` é lido via `require()`, sem necessidade de `node:fs`. Adicionalmente, todas as
> requisições ao registry têm um timeout de 10 segundos (`timeout: 10000`), evitando que o
> processo trave indefinidamente em caso de lentidão ou indisponibilidade do registry.

---

### Medida 2 — Verificação de Assinaturas (`npm audit signatures`)

**Executado em:** `npm run setup`, `npm run npm-reinstall` e no hook de **pré-commit**

O npm registry assina criptograficamente cada pacote publicado via [Sigstore](https://www.sigstore.dev/).
O comando `npm audit signatures` verifica que os pacotes instalados em `node_modules/` correspondem
às assinaturas registradas, detectando:

- Adulteração do pacote em trânsito (ataque MITM)
- Substituição local do conteúdo de `node_modules/`
- Inconsistência entre o que foi baixado e o que está no registry

Se qualquer assinatura falhar, o comando retorna erro e o pipeline é interrompido.

---

### Medida 3 — Auditoria de Vulnerabilidades (`npm audit`)

**Executado automaticamente em:** `npm run setup` e `npm run npm-reinstall` (via `audit=true` no `.npmrc`, ativado pelo `npm ci`)  
**Executado explicitamente em:** hook de **pré-commit**

O `npm audit --audit-level=high` verifica as dependências instaladas contra o banco de dados de
vulnerabilidades do npm (alimentado pelo [GitHub Advisory Database](https://github.com/advisories)).
O pipeline é bloqueado se qualquer CVE de severidade **alta** ou **crítica** for detectada.

Nos scripts `setup` e `npm-reinstall`, o audit é disparado automaticamente pelo `npm ci` graças à
configuração `audit=true` no `.npmrc`. No hook de pré-commit, é chamado explicitamente por
`npm audit --audit-level=high`.

Isso garante que vulnerabilidades conhecidas não sejam acidentalmente commitadas.

---

### Medida 4 — Instalação Determinística (`npm ci`)

Em vez de `npm install`, o projeto usa `npm ci` em todos os fluxos automatizados. Diferenças
relevantes para segurança:

| Comportamento                    | `npm install`            | `npm ci`                                  |
|----------------------------------|--------------------------|-------------------------------------------|
| Resolve versões                  | Sim (pode atualizar)     | Não (usa exatamente o `package-lock.json`)|
| Modifica `package-lock.json`     | Sim                      | Nunca                                     |
| Falha se lock está desatualizado | Não                      | Sim                                       |
| Garante reprodutibilidade        | Parcialmente             | Completamente                             |

O `npm ci` garante que **exatamente os mesmos pacotes** sejam instalados em qualquer ambiente,
eliminando ataques que dependam de resolução de versão não determinística.

---

### Medida 5 — Hook de Pré-commit (Husky)

O hook `pre-commit` reexecuta as verificações de segurança críticas antes de cada commit,
impedindo que código com dependências inseguras seja registrado no histórico do repositório:

```
git commit
    │
    ├── npm audit signatures          → falha se assinaturas inválidas
    └── npm audit --audit-level=high  → falha se CVEs altas/críticas presentes
```

---

### Medida 6 — Configuração de Segurança do npm (`.npmrc`)

**Arquivo:** `.npmrc`  
**Ativo em:** todos os comandos npm executados no projeto

O arquivo `.npmrc` estabelece uma camada de defesa base que atua em qualquer operação npm,
independentemente do fluxo automatizado:

| Configuração     | Valor                             | Proteção                                                                      |
|------------------|-----------------------------------|-------------------------------------------------------------------------------|
| `save-exact`     | `true`                            | Novas dependências salvas com versão exata, sem `^` ou `~`                    |
| `registry`       | `https://registry.npmjs.org/`     | Fixa o registry oficial, impedindo redirect para mirrors comprometidos        |
| `ignore-scripts` | `true`                            | Bloqueia lifecycle scripts (`preinstall`, `postinstall`) de todos os pacotes  |
| `audit`          | `true`                            | Executa `npm audit` automaticamente em todo `npm ci` ou `npm install`         |
| `audit-level`    | `high`                            | Falha automaticamente se CVEs de severidade alta ou crítica forem detectadas  |

> **Por que `ignore-scripts` é crítico:** os lifecycle scripts de pacotes (`preinstall`,
> `postinstall`, `install`) são o principal vetor dos ataques mais impactantes da história do
> npm, incluindo event-stream (2018) e ua-parser-js (2021). Bloquear sua execução por padrão
> elimina esse vetor completamente para todas as dependências instaladas.

---

### Resumo das Camadas de Defesa

```
┌──────────────────────┬────────────────────────────────────────────────────────┐
│ Momento              │ Verificação                                             │
├──────────────────────┼────────────────────────────────────────────────────────┤
│ Sempre               │ .npmrc                                                  │
│ (qualquer npm)       │ → save-exact, registry fixo, ignore-scripts, audit      │
├──────────────────────┼────────────────────────────────────────────────────────┤
│ Antes do             │ check-package-age.js                                    │
│ npm ci               │ → bloqueia pacotes publicados há < 3 dias               │
├──────────────────────┼────────────────────────────────────────────────────────┤
│ Após o               │ npm audit signatures                                    │
│ npm ci               │ → verifica integridade criptográfica                    │
│                      │ npm audit (automático via .npmrc)                       │
│                      │ → bloqueia CVEs altas/críticas                          │
├──────────────────────┼────────────────────────────────────────────────────────┤
│ Após                 │ check-package-age.js (reexecutado)                      │
│ npm audit fix        │ → valida idade das versões atualizadas pelo audit fix   │
├──────────────────────┼────────────────────────────────────────────────────────┤
│ Antes do             │ npm audit signatures                                    │
│ git commit           │ → verifica integridade criptográfica                    │
│ (Husky)              │ npm audit --audit-level=high                            │
│                      │ → bloqueia CVEs altas/críticas                          │
└──────────────────────┴────────────────────────────────────────────────────────┘
```

---

## Referências

- [npm: Criando Módulos Node.js](https://docs.npmjs.com/creating-node-js-modules) — estrutura do projeto e scripts
- [node:https — Node.js v24.15.0](https://nodejs.org/docs/latest-v24.x/api/https.html) — módulo HTTP/S nativo usado no script de verificação de idade
- [node:path — Node.js v24.15.0](https://nodejs.org/docs/latest-v24.x/api/path.html) — módulo de caminhos nativo usado no script de verificação de idade
- [Husky](https://typicode.github.io/husky/) — hooks Git
- [Sigstore](https://www.sigstore.dev/) — infraestrutura de assinatura criptográfica de pacotes npm
- [GitHub Advisory Database](https://github.com/advisories) — banco de dados de CVEs utilizado pelo npm audit

---

**Autor:** Adriano Enache
**Licença:** MIT