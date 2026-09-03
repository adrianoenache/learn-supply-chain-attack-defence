# Reconstrução de Pacotes com Lifecycle Scripts

Este projeto define `ignore-scripts=true` em `.npmrc` para que o npm não execute `preinstall`, `install`, `postinstall` ou outros lifecycle scripts automaticamente. Essa é uma defesa deliberada contra malware em tempo de instalação: um pacote comprometido não pode executar código arbitrário durante o `npm install`.

Alguns pacotes legítimos, no entanto, precisam compilar binários nativos durante a instalação. Exemplos comuns incluem:

- `esbuild` — faz download ou compila um binário específico da plataforma.
- `sharp` — compila bindings nativos para processamento de imagens.
- `canvas` — compila bindings do Cairo / Pango.
- `sqlite3`, `bcrypt`, `node-sass` — compilam módulos nativos.

Este guia explica como reconstruir esses pacotes com segurança após a instalação inicial com `ignore-scripts`.

---

## Quando uma Reconstrução É Necessária?

Você precisa reconstruir um pacote com lifecycle script quando:

- O pacote imprimiu um aviso sobre um binário ausente após `npm ci` ou `npm run setup`.
- Um comando falha com `Cannot find module ...` apontando para um binding nativo `.node`.
- Você mudou a versão do Node.js ou a plataforma (por exemplo, trocou de Linux para WSL, ou de x64 para ARM64).
- A documentação do pacote diz explicitamente para executar `npm rebuild <pkg>` após a instalação.

Você **não** precisa reconstruir pacotes que são JavaScript puro ou que já enviam binários pré-compilados no tarball do pacote.

---

## Procedimento Geral de Reconstrução

### 1. Confirme que o Pacote É Confiável

Antes de executar qualquer lifecycle script, verifique a identidade do pacote:

```bash
npm view <package-name>@<version> --json | jq '.dist.integrity, .published, .maintainers'
```

Verifique se:

- A versão foi publicada há mais de 7 dias (corresponde ao seu `min-release-age`).
- O pacote tem assinaturas verificadas (`npm audit signatures`).
- É o pacote que você pretendia instalar, não um typosquat.

Se não tiver certeza, use o caminho controlado de adição de dependências:

```bash
npm run defence:add -- <package-name>@<version>
```

### 2. Reconstrua Apenas o Pacote Afetado

Execute a reconstrução de um pacote por vez para poder observar a saída:

```bash
npm rebuild esbuild
```

Para vários pacotes relacionados, liste-os explicitamente:

```bash
npm rebuild esbuild sharp canvas
```

Evite executar `npm rebuild` sem argumentos em uma grande árvore de dependências, pois isso executará scripts para todos os pacotes nativos e ampliará o blast radius caso um deles seja malicioso.

### 3. Inspecione a Saída

Fique atento a:

- Downloads de rede para hosts inesperados.
- Erros de compilação apontando para bibliotecas de sistema ausentes.
- Mensagens pós-instalação pedindo para executar comandos adicionais.

Se a saída parecer suspeita, pare imediatamente, remova `node_modules/<package-name>` e investigue antes de continuar.

### 4. Verifique a Funcionalidade

Execute a parte da sua aplicação que usa o pacote reconstruído. Por exemplo:

```bash
node -e "require('esbuild').version"
node -e "require('sharp')"
```

Se o `require` funcionar e a versão esperada for reportada, a reconstrução funcionou.

### 5. Não Commite Novos Segredos

Algumas etapas de reconstrução criam arquivos temporários ou scripts de download. Execute o scanner de segredos e a verificação de sincronização antes de commitar:

```bash
npm run defence:check-secrets
npm run defence:sync-check
```

---

## Notas Específicas por Pacote

### esbuild

O `esbuild` envia binários pré-compilados para a maioria das plataformas. Se `ignore-scripts` impediu o download do binário, execute:

```bash
npm rebuild esbuild
```

Em redes restritas, você também pode fazer o download manual do binário e apontar `ESBUILD_BINARY_PATH` para ele. Consulte a [documentação do esbuild](https://esbuild.github.io/getting-started/#download-a-build) para binários específicos por plataforma.

### sharp

O `sharp` geralmente faz download de um binário libvips pré-compilado. Se essa etapa foi ignorada:

```bash
npm rebuild sharp
```

No Alpine Linux ou containers mínimos, você pode precisar de pacotes de sistema primeiro:

```bash
# Debian/Ubuntu/WSL
sudo apt-get install -y libvips-dev

# Alpine
apk add --no-cache vips-dev
```

### canvas

O `canvas` requer Cairo e Pango. Após instalar as dependências de sistema:

```bash
# Debian/Ubuntu/WSL
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

npm rebuild canvas
```

---

## Reduzindo a Necessidade de Reconstruir

Se você se encontrar reconstruindo com frequência, considere essas alternativas mais seguras:

1. **Prefira pacotes JavaScript puro** quando o desempenho for aceitável. Eles não têm etapa de build nativo.
2. **Fixe pacotes com binários pré-compilados** com versões exatas e integridade verificada para que `npm ci` possa usar artefatos em cache.
3. **Containerize o ambiente de build** para que as reconstruções aconteçam em uma imagem isolada e reprodutível em vez de nas máquinas dos desenvolvedores.
4. **Forneça binários pré-compilados internamente** em um registry privado ou repositório de artefatos e aponte o npm para eles com sobrescritas `.npmrc` apenas para escopos confiáveis.

---

## E Se a Reconstrução Falhar?

1. Verifique a mensagem de erro em busca de bibliotecas de sistema ausentes e instale-as.
2. Delete o diretório do pacote e reinstale deterministicamente:

```bash
rm -rf node_modules/<package-name> package-lock.json
npm run defence:add -- <package-name>@<version>
npm rebuild <package-name>
```

3. Se a falha persistir, consulte o guia de troubleshooting do próprio pacote e o [guia de troubleshooting do projeto](../troubleshooting.md).

---

## Resumo

- `ignore-scripts=true` bloqueia a execução de código em tempo de instalação.
- Reconstrua apenas pacotes confiáveis, um por vez, após verificar assinaturas e idade.
- Inspecione a saída da reconstrução e verifique se o pacote carrega depois.
- Execute `defence:check-secrets` e `defence:sync-check` antes de commitar.
