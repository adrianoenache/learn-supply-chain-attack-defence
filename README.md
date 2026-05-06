# Learn supply chain attack defence

## Índice

- [Início Rápido](#início-rápido)
  - [1. Chave SSH para o GitHub](#1-chave-ssh-para-o-github)
  - [2. Clone e setup](#2-clone-e-setup)
- [Ambiente de Desenvolvimento](#ambiente-de-desenvolvimento)
  - [Pré-requisitos](#pré-requisitos)
  - [Configuração de Identidade Git](#configuração-de-identidade-git)
  - [Configuração do Husky no WSL com nvm](#configuração-do-husky-no-wsl-com-nvm)
- [Git Hooks](#git-hooks)
- [Segurança](#segurança)
  - [O que é um Supply Chain Attack?](#o-que-é-um-supply-chain-attack)
  - [Medida 1 — Verificação de Idade dos Pacotes](#medida-1--verificação-de-idade-dos-pacotes-check-package-agejs)
  - [Medida 2 — Verificação de Assinaturas](#medida-2--verificação-de-assinaturas-npm-audit-signatures)
  - [Medida 3 — Auditoria de Vulnerabilidades](#medida-3--auditoria-de-vulnerabilidades-npm-audit)
  - [Medida 4 — Instalação Determinística](#medida-4--instalação-determinística-npm-ci)
  - [Medida 5 — Hook de Pré-commit](#medida-5--hook-de-pré-commit-husky)
  - [Medida 6 — Configuração de Segurança do npm](#medida-6--configuração-de-segurança-do-npm-npmrc)
  - [Resumo das Camadas de Defesa](#resumo-das-camadas-de-defesa)
- [Referências](#referências)

---

## Início Rápido

> **Pré-requisito:** ambiente configurado conforme [Ambiente de Desenvolvimento](#ambiente-de-desenvolvimento). As etapas abaixo pressupõem WSL 2, Git, nvm e Node.js já instalados.

### 1. Chave SSH para o GitHub

O repositório é clonado via SSH. Gere uma chave ed25519 e adicione-a à sua conta do GitHub:

```bash
# Gerar a chave (substitua pelo seu e-mail do GitHub)
ssh-keygen -t ed25519 -C "seu@email.com"
```

> Um prompt de passphrase aparecerá. Pode ser deixado em branco pressionando Enter duas vezes, mas usar uma passphrase é mais seguro.

Adicione a chave ao agente SSH:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

O agente SSH não persiste entre sessões do WSL. Para inicializá-lo automaticamente, adicione o bloco abaixo ao `~/.bashrc`:

```bash
# Inicializa o ssh-agent automaticamente se não estiver ativo
if [ -z "$SSH_AUTH_SOCK" ]; then
  eval "$(ssh-agent -s)"
  ssh-add ~/.ssh/id_ed25519
fi
```

Aplique a alteração na sessão atual:

```bash
source ~/.bashrc
```

Copie a chave pública e adicione-a em **GitHub → Settings → SSH and GPG keys → New SSH key**:

```bash
cat ~/.ssh/id_ed25519.pub
```

Valide a conexão:

```bash
ssh -T git@github.com
# Hi <usuário>! You've successfully authenticated...
```

> Instruções detalhadas em [Generating a new SSH key and adding it to the ssh-agent](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent).

### 2. Clone e setup

```bash
git clone git@github.com:adrianoenache/learn-supply-chain-attack-defence.git
cd learn-supply-chain-attack-defence
npm run setup
```

O script `npm run setup` executa, em ordem: verificação de idade dos pacotes, instalação determinística com `npm ci`, auditoria automática de vulnerabilidades (via `.npmrc`), verificação de assinaturas criptográficas e ativação dos hooks Husky.

---

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
nvm install 24.15.0
nvm alias default 24.15.0
nvm use default
```

Confirme as versões instaladas (o projeto exige as versões definidas no campo `engines` do `package.json`):

```bash
node --version
npm --version
```

---

### Configuração de Identidade Git

Configure seu nome e e-mail globalmente. Esses dados são registrados em cada commit:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
```

Para projetos que exigem uma identidade diferente, sobrescreva localmente dentro do diretório do repositório:

```bash
git config --local user.name "Outro Nome"
git config --local user.email "outro@email.com"
```

> Para mais opções de configuração, consulte o [capítulo de personalização do Git](https://git-scm.com/book/en/v2/Customizing-Git-Git-Configuration) no livro oficial.

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

O [Husky](https://typicode.github.io/husky/) executa verificações de segurança automaticamente **antes de cada commit**. Consulte [Medida 5 — Hook de Pré-commit](#medida-5--hook-de-pré-commit-husky) para detalhes.

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
**Executado em:** `npm run setup` e `npm run npm-reinstall` (duas vezes, com escopos diferentes)

Esta ferramenta consulta o registry do npm para cada dependência e verifica há quantos dias aquela versão específica foi publicada. Se qualquer pacote foi publicado há menos de **3 dias**, a instalação é abortada com erro.

O script opera em dois modos:

- **Modo padrão** (`npm run pkg-age-check`) — checa apenas as dependências declaradas em `package.json`. Usado **antes** do `npm ci`, quando o `node_modules/` ainda não existe.
- **Modo transitivo** (`node ./tools/check-package-age.js --transitive`) — lê o `package-lock.json` e checa **todas** as dependências resolvidas, incluindo transitivas. Usado **após** o `npm ci`, quando o lockfile já foi instalado.

#### Por que 3 dias?

A janela de 3 dias é baseada no tempo médio que scanners de segurança automatizados,
pesquisadores e a comunidade levam para identificar e reportar versões maliciosas publicadas
no npm. Ataques do tipo fast-publish dependem de uma janela curta de exposição antes da remoção;
esse atraso elimina a janela.

#### Como funciona tecnicamente

**Modo padrão** (pré-install):
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
        ├─ idade >= minAgeDays → OK, continua
        └─ idade < minAgeDays  → ERRO, aborta instalação
```

**Modo transitivo** (pós-install, flag `--transitive`):
```
package-lock.json (packages["node_modules/*"].version)
        │
        ▼
  Para cada pacote@versão resolvida (diretas + transitivas)
        │
        ▼
  (mesmo fluxo acima)
```

> **Nota de design:** o script usa apenas módulos nativos do Node.js (`node:https`, `node:path`).
> Isso é intencional — o modo padrão é executado **antes** de `npm ci`, portanto não pode
> depender de nenhum pacote instalável. Qualquer dependência aqui seria um vetor de ataque em si.
> Tanto `package.json` quanto `package-lock.json` são lidos via `require()`, sem necessidade de
> `node:fs`. Adicionalmente, todas as requisições ao registry têm um timeout de 10 segundos
> (`timeout: 10000`) e um limite de tamanho de resposta de 20 MB por pacote, evitando que o
> processo trave ou consuma memória excessiva em caso de lentidão, indisponibilidade ou resposta
> anômala do registry.

#### Robustez técnica

- **Range operators** — versões declaradas com `^`, `~`, `>=`, `<=` etc. têm o operador removido
  antes da consulta ao registry. Ranges não resolúveis para uma versão exata (`*`, `latest`,
  `next`, `x.x.x`, ranges compostos como `"1.2 - 2.0"` ou `">=1.0.0 <2.0.0"`) causam erro com
  mensagem orientativa solicitando que a versão seja fixada no `package.json`.

- **Erros de rede mid-stream** — o script trata tanto falhas de conexão antes da resposta
  (`req.on('error')`) quanto falhas após o início da transferência (`res.on('error')`), garantindo
  que erros parciais de rede sejam sempre reportados com mensagem descritiva.

- **Limite de tamanho de resposta** — documentos completos de pacotes com histórico longo (ex:
  `eslint`, `typescript`, `webpack`) podem ter vários MB. O script limita a resposta a **20 MB
  por pacote** por padrão, protegendo contra respostas malformadas, injeção de dados em trânsito
  e consumo excessivo de memória em projetos com muitas dependências.

- **Concorrência controlada** — as consultas ao registry são executadas com no máximo 10
  requisições simultâneas (padrão), evitando rate-limiting em projetos com muitas dependências
  transitivas. O limite é configurável via `pkgAgeCheck.concurrency`.

- **Guard de resolve/reject** — uma flag `settled` por requisição garante que `resolve` e
  `reject` sejam chamados no máximo uma vez, prevenindo comportamento indefinido em cenários
  onde `res.on('error')` e `res.on('end')` disparam em sequência no mesmo ciclo de eventos.

#### Configuração

O comportamento do script pode ser ajustado via campo `pkgAgeCheck` no `package.json`:

| Campo | Padrão | Descrição |
|---|---|---|
| `minAgeDays` | `3` | Número mínimo de dias desde a publicação para aceitar um pacote |
| `maxResponseMB` | `20` | Limite máximo de tamanho por resposta do registry, em MB |
| `concurrency` | `10` | Número máximo de consultas simultâneas ao registry |

**Exemplo — ajustar os limites:**

```json
{
  "pkgAgeCheck": {
    "minAgeDays": 7,
    "maxResponseMB": 50,
    "concurrency": 5
  }
}
```

> O limite de 20 MB cobre todos os pacotes npm conhecidos. Aumente somente se o script
> retornar o erro `Response for <nome> exceeds X MB limit` — esse erro indica que o documento
> completo do pacote no registry excede o limite configurado.

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

> **Pré-requisito:** o arquivo `package-lock.json` deve estar commitado no repositório. O `npm ci`
> falha automaticamente caso o arquivo esteja ausente ou divergente do `package.json`. Para
> verificar se ele está sob controle de versão:
> ```bash
> git ls-files package-lock.json
> # Se o comando não retornar nada, o arquivo não está versionado
> ```

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

> **Por que o Husky não é afetado por `ignore-scripts`:** `ignore-scripts` bloqueia lifecycle
> scripts de **pacotes instalados** (dependências de terceiros em `node_modules/`). O script
> `prepare` é definido no `package.json` do **próprio projeto** — o npm executa scripts do
> projeto raiz normalmente, independentemente de `ignore-scripts`. Por isso `npm run prepare`
> (que chama `husky`) funciona corretamente durante `npm ci` e `npm run setup`.

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
│ npm ci               │ → bloqueia pacotes publicados há < minAgeDays dias       │
├──────────────────────┼────────────────────────────────────────────────────────┤
│ Após o               │ npm audit signatures                                    │
│ npm ci               │ → verifica integridade criptográfica                    │
│                      │ npm audit (automático via .npmrc)                       │
│                      │ → bloqueia CVEs altas/críticas                          │
├──────────────────────┼────────────────────────────────────────────────────────┤
│ Após                 │ check-package-age.js --transitive                       │
│ npm audit fix        │ → valida idade de todas as versões resolvidas (transitivas incluídas) │
├──────────────────────┼────────────────────────────────────────────────────────┤
│ Antes do             │ npm audit signatures                                    │
│ git commit           │ → verifica integridade criptográfica                    │
│ (Husky)              │ npm audit --audit-level=high                            │
│                      │ → bloqueia CVEs altas/críticas                          │
└──────────────────────┴────────────────────────────────────────────────────────┘
```

---

## Referências

**Ambiente**

- [Documentação oficial do WSL](https://learn.microsoft.com/pt-br/windows/wsl/install) — instalação do WSL 2 com Ubuntu
- [Git — Instalando no Linux](https://git-scm.com/install/linux) — instalação do Git via PPA no Ubuntu
- [Node.js no WSL — Microsoft Docs](https://learn.microsoft.com/pt-br/windows/dev-environment/javascript/nodejs-on-wsl) — configuração do nvm e Node.js no WSL
- [Customizing Git — Git Configuration](https://git-scm.com/book/en/v2/Customizing-Git-Git-Configuration) — configuração de identidade Git
- [Generating a new SSH key and adding it to the ssh-agent](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent) — configuração de chave SSH para o GitHub

**Node.js**

- [npm: Criando Módulos Node.js](https://docs.npmjs.com/creating-node-js-modules) — estrutura do projeto e scripts
- [node:https — Node.js v24.15.0](https://nodejs.org/docs/latest-v24.x/api/https.html) — módulo HTTP/S nativo usado no script de verificação de idade
- [node:path — Node.js v24.15.0](https://nodejs.org/docs/latest-v24.x/api/path.html) — módulo de caminhos nativo usado no script de verificação de idade

**Segurança**

- [Husky](https://typicode.github.io/husky/) — hooks Git
- [Sigstore](https://www.sigstore.dev/) — infraestrutura de assinatura criptográfica de pacotes npm
- [GitHub Advisory Database](https://github.com/advisories) — banco de dados de CVEs utilizado pelo npm audit

---

**Autor:** Adriano Enache
**Licença:** MIT