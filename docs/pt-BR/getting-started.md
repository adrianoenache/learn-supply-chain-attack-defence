# Primeiros Passos

## Ambiente de Desenvolvimento

### Pré-requisitos

- WSL 2, Git e nvm instalados (este guia assume um ambiente WSL 2 baseado em Debian/Ubuntu).
- Node.js `>=24.16.0` e npm `>=11.13.0`.
- Uma conta no GitHub com chave SSH configurada.

### Identidade Git

Configure sua identidade de commit para que o hook de pré-commit e os commits funcionem corretamente:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
```

### Chave SSH para o GitHub

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

Em seguida, copie a chave pública e cole-a em **GitHub → Settings → SSH and GPG keys**:

```bash
cat ~/.ssh/id_ed25519.pub
```

### Clone e Setup

```bash
git clone git@github.com:adrianoenache/learn-supply-chain-attack-defence.git
cd learn-supply-chain-attack-defence
npm run setup
```

O script `setup` executa as camadas de segurança do projeto de forma controlada. Veja detalhes em [Setup](setup.md).

### Husky com nvm no WSL

Se o Husky não encontrar o `node` no WSL, crie `~/.huskyrc` para que o hook localize a versão ativa do Node:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Depois recarregue o terminal ou execute:

```bash
source ~/.huskyrc
```
