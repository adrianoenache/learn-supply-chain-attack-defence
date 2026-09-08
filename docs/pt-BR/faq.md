# Perguntas Frequentes (FAQ)

Esta página responde perguntas conceituais sobre o projeto e suas defesas. Para problemas operacionais, como comandos que falham ou erros de pre-commit, consulte [Solução de problemas](troubleshooting.md).

## O que é defesa em profundidade?

Defesa em profundidade é uma estratégia de segurança que usa múltiplos controles independentes em vez de depender de um único mecanismo. Neste projeto, os controles abrangem idade do pacote, verificação de assinatura, auditoria de vulnerabilidades, instalação determinística, hooks de pre-commit, verificação de licenças e muito mais. Se um controle não detectar uma ameaça, outro provavelmente detectará.

## Por que não executar `npm install` diretamente?

O `npm install` resolve a versão mais recente que satisfaz um range, que pode ter sido publicada minutos atrás e pode vir de uma conta comprometida. O wrapper `defence:add` impõe verificações de idade, auditoria de assinaturas, análise de lifecycle e verificações transitivas antes de instalar, dando tempo à comunidade para detectar malware e a você para revisar.

Veja [Adicionando dependências](dependencies.md).

## O que a verificação de idade do pacote protege?

Ela rejeita pacotes publicados há menos de 7 dias. A maioria dos lançamentos maliciosos é detectada em horas ou dias, então o período de espera reduz drasticamente a chance de instalar malware recém-publicado.

Veja [Camada de Defesa 1 — Verificação de idade do pacote](security/defense-layer-1-package-age.md).

## O que é provenance de pacote npm?

Provenance é metadado verificável que vincula um pacote ao seu repositório de origem e processo de build, geralmente por meio de atestações SLSA publicadas pelo npm. Ela ajuda a garantir que o pacote instalado foi construído a partir da fonte esperada e não foi adulterado no laptop de um mantenedor.

Veja [Camada de Defesa 11 — Provenance e atestações SLSA](security/defense-layer-11-provenance.md).

## Quando devo usar `defence:add` em vez de `npm install`?

Sempre use `defence:add` ao adicionar ou atualizar uma dependência neste projeto. É o único caminho suportado para instalação de pacotes. O `npm install` direto ignora verificações de idade, assinatura, auditoria e lifecycle.

## Como adoto essas defesas em outro projeto?

Use `install-defences.js` para copiar os scripts de defesa, hooks, configuração e manifesto para o projeto alvo:

```bash
node /caminho/para/este/repo/tools/install-defences.js /caminho/para/projeto-alvo
```

Depois execute `npm install` no projeto alvo, verifique o hook com `bash .husky/pre-commit` e commite as alterações.

Veja [Adotando em outros projetos](adopting-in-other-projects.md).

## Quais licenças são permitidas?

A lista de permissão padrão inclui licenças permissivas como MIT, Apache-2.0, BSD-2/3-Clause, ISC e 0BSD. Licenças copyleft (GPL, AGPL, LGPL, MPL) e UNLICENSED são proibidas por padrão. Você pode personalizar as listas em `package.json` sob `licensesCheck`.

Veja [Camada de Defesa 9 — Verificação de licença](security/defense-layer-9-license-check.md).

## Por que o `.npmrc` é endurecido?

O [`.npmrc`](../../.npmrc) raiz desativa scripts de lifecycle inseguros por padrão, habilita verificações de assinatura e integridade, fixa requisitos de provenance, reduz telemetria e fortalece configurações TLS. Ele transforma o próprio npm em uma camada de defesa.

Veja [Endurecimento do `.npmrc`](npmrc-hardening.md) e [Camada de Defesa 6 — `.npmrc` endurecido](security/defense-layer-6-npmrc-config.md).

## Como atualizo dependências com segurança?

Use o wrapper controlado:

```bash
npm run defence:update
```

Para aprovação interativa, execute:

```bash
npm run defence:update -- --interactive
```

O wrapper reexecuta verificações de idade, assinatura, auditoria e licença após a atualização.

## O que é o hook de pre-commit?

O `.husky/pre-commit` executa assinatura, auditoria, verificação de atualizações e outros portões antes de cada commit. Ele garante que o código não possa ser commitado sem passar pelas defesas de linha de base.

Veja [Camada de Defesa 5 — Hook de pre-commit](security/defense-layer-5-precommit-hook.md).

## Como verifico se o hook não foi adulterado?

Execute:

```bash
npm run defence:check-hooks
```

Isso compara `.husky/pre-commit` com o hash SHA-256 conhecido armazenado em `package.json`.

Veja [Camada de Defesa 12 — Integridade do hook de pre-commit](security/defense-layer-12-hook-integrity.md).

## Onde posso obter ajuda?

Abra uma issue com o label `question` no rastreador de issues do repositório. Antes de abrir, consulte [Solução de problemas](troubleshooting.md) e o [glossário](glossary.md).
