# Getting Started

## Development Environment

### Prerequisites

- WSL 2, Git, and nvm installed (this guide assumes a Debian/Ubuntu-based WSL 2 environment).
- Node.js `>=24.16.0` and npm `>=11.13.0`.
- A GitHub account with an SSH key configured.

### Git Identity

Set your committer identity so the pre-commit hook and commits work correctly:

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### GitHub SSH Key

The repository is cloned via SSH. Generate an ed25519 key and add it to your GitHub account:

```bash
# Generate the key (replace with your GitHub email)
ssh-keygen -t ed25519 -C "your@email.com"
```

> A passphrase prompt will appear. You can leave it blank by pressing Enter twice, but using a passphrase is more secure.

Add the key to the SSH agent:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

Then copy the public key and paste it in **GitHub → Settings → SSH and GPG keys**:

```bash
cat ~/.ssh/id_ed25519.pub
```

### Clone and Setup

```bash
git clone git@github.com:adrianoenache/learn-supply-chain-attack-defence.git
cd learn-supply-chain-attack-defence
npm run setup
```

The `setup` script runs the project's security layers in a controlled way. See [Setup](setup.md) for details.

### Husky with nvm on WSL

If Husky does not find `node` on WSL, create `~/.huskyrc` so the hook can locate the active Node version:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Then reload the terminal or run:

```bash
source ~/.huskyrc
```

_Last sync: 2026-08-18_
