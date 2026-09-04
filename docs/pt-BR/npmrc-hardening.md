# Guia de Hardening do `.npmrc`

Este documento explica cada configuração do `.npmrc` usada por este projeto, por que ela foi escolhida e como a configuração protege a árvore de dependências. Também descreve opções que foram **deliberadamente não adotadas**, para que você possa tomar decisões informadas ao adaptar essas regras em outros lugares.

## Onde a configuração vive

A fonte da verdade é [.npmrc](../../.npmrc) na raiz do repositório. Quando o projeto é adotado por outro repositório, o [tools/install-defences.js](../../tools/install-defences.js) copia esse arquivo textualmente para o projeto destino.

## Visão geral das configurações

| Categoria | Configuração | Propósito |
| --- | --- | --- |
| Pinning de versão | `save-exact=true` | Fixa versões exatas sem operadores `^` ou `~`. |
| Lock file | `package-lock=true` | Sempre gera `package-lock.json`. |
| Registry | `registry=https://registry.npmjs.org/` | Usa apenas o registry oficial. |
| Saída | `fund=false` | Suprime mensagens de funding para manter a saída de segurança legível. |
| Audit | `audit=true` | Habilita audit automático durante install/fix. |
| Audit | `audit-level=high` | Falha em CVEs de alta/crítica. |
| Audit fix | `npm-audit-fix-level=high` | Restringe `npm audit fix` a correções de alta/crítica. |
| Telemetria | `send-metrics=false` | Desabilita coleta de telemetria/métricas do npm. |
| Lifecycle | `ignore-scripts=true` | Bloqueia `preinstall`, `install`, `postinstall`, `prepare`. |
| Engines | `engine-strict=true` | Impõe os requisitos do campo `engines`. |
| Idade de release | `min-release-age=7` | Rejeita pacotes publicados há menos de 7 dias. |
| Rede | `fetch-retries=3` | Refaz requisições ao registry que falharam. |
| Rede | `fetch-retry-mintimeout=10000` | Backoff mínimo entre retries. |
| Rede | `fetch-retry-maxtimeout=60000` | Backoff máximo entre retries. |
| Rede | `fetch-timeout=300000` | Timeout total da requisição. |
| Rede | `maxsockets=10` | Limita conexões simultâneas com o registry. |
| TLS | `strict-ssl=true` | Verifica certificados TLS. |

## Raciocínio detalhado

### Pinning de versão e lock file

```ini
save-exact=true
package-lock=true
```

`save-exact=true` garante que qualquer dependência adicionada ao `package.json` use uma versão exata. Isso remove a ambiguidade dos operadores de range e torna a árvore de dependências mais fácil de auditar. `package-lock=true` assegura que `package-lock.json` seja sempre gerado, mesmo em máquinas que poderiam desabilitá-lo.

### Registry e TLS

```ini
registry=https://registry.npmjs.org/
strict-ssl=true
```

Fixar a URL do registry impede que um DNS comprometido, proxy ou configuração local redirecione instalações para um mirror malicioso. `strict-ssl=true` garante que os certificados TLS sejam validados, bloqueando ataques de downgrade e man-in-the-middle.

### Bloqueio de scripts de lifecycle

```ini
ignore-scripts=true
```

Scripts de lifecycle são o vetor de ataque mais comum durante a instalação. `ignore-scripts=true` impede que `preinstall`, `install`, `postinstall` e `prepare` sejam executados automaticamente. Pacotes que realmente precisam de um passo de build (por exemplo `esbuild`, `sharp` ou `canvas`) devem ser reconstruídos manualmente:

```bash
npm_config_ignore_scripts=false npm rebuild <pacote>
```

Veja [Reconstrução de pacotes com lifecycle scripts](security/rebuilding-lifecycle-packages.md) para um fluxo seguro.

### Imposição de engines

```ini
engine-strict=true
```

Falha em `npm ci` e `npm install` se a versão ativa do Node.js ou npm não satisfizer o campo `engines` do `package.json`. Isso garante que recursos de segurança como `min-release-age` e provenance de audit estejam disponíveis.

### Idade mínima de release

```ini
min-release-age=7
```

O próprio npm rejeita versões publicadas há menos de 7 dias. Essa é uma segunda camada além do `tools/check-package-age.js` e também afeta o `npm audit fix`, que pode falhar se um patch publicado for muito recente. Para patches de emergência que não podem esperar, use a opção comentada `min-release-age-exclude[]=` temporariamente.

### Configuração de audit

```ini
audit=true
audit-level=high
npm-audit-fix-level=high
```

`audit=true` executa um audit de vulnerabilidades durante a instalação. `audit-level=high` faz o comando falhar quando CVEs de alta ou crítica são encontradas. `npm-audit-fix-level=high` é uma configuração **prospectiva/lookahead**: ela restringe o `npm audit fix` para que aplique apenas correções de alta/crítica, mas ainda não é reconhecida pelo npm 11.17.0. A linha é mantida em `.npmrc` para que versões futuras do npm a apliquem automaticamente; até lá, qualquer comando `npm audit fix` ainda deve ser revisado manualmente.

### Opt-out de telemetria

```ini
send-metrics=false
```

Desabilita a coleta de métricas/telemetria do npm. Assim como `npm-audit-fix-level`, essa é uma configuração **prospectiva/lookahead** ainda não reconhecida pelo npm 11.17.0. Ela é mantida em `.npmrc` como um opt-in explícito a uma postura de privacidade determinística para releases futuros do npm.

### Resiliência de rede

```ini
fetch-retries=3
fetch-retry-mintimeout=10000
fetch-retry-maxtimeout=60000
fetch-timeout=300000
maxsockets=10
```

Essas configurações protegem o processo de instalação contra falhas transitórias do registry sem permitir esperas ilimitadas. Os retries usam backoff exponencial entre 10 e 60 segundos, com timeout total de requisição de 5 minutos. `maxsockets=10` limita conexões simultâneas com o registry, reduzindo carga em rajada e tornando o comportamento de rede mais previsível em runners de CI compartilhados.

## Configurações prospectivas / future-facing

As configurações a seguir são mantidas intencionalmente em `.npmrc` mesmo que o npm 11.17.0 ainda não as reconheça. Elas preparam o projeto para releases futuros do npm sem exigir outra alteração de configuração.

| Configuração | Efeito futuro | Comportamento atual |
| --- | --- | --- |
| `npm-audit-fix-level=high` | Restringe `npm audit fix` a CVEs de alta/crítica. | Ignorada pelo npm 11.17.0; emite um aviso, mas não causa mudança funcional. |
| `send-metrics=false` | Desabilita explicitamente a telemetria/métricas do npm. | Ignorada pelo npm 11.17.0; emite um aviso, mas não causa mudança funcional. |

Esses avisos são esperados e seguros. Não remova as configurações a menos que prefira adotá-las apenas quando sua versão do npm as suportar explicitamente.

## Opções consideradas mas não adotadas

| Opção | Por que não foi adotada |
| --- | --- |
| `prefer-online=true` | Força o registry a ser consultado mesmo quando existe uma entrada em cache local. Isso evitaria pacotes em cache desatualizados, mas o custo de performance em cada instalação é alto e as configurações existentes de retry/fetch já mitigam a maioria dos cenários de falha no registry. |
| `legacy-peer-deps=true` | Relaxa a resolução de peer dependencies. Este projeto não precisa disso, e habilitá-lo ocultaria conflitos na árvore de dependências. |
| `workspaces-update=false` | Não é relevante para um repositório de pacote único. |
| `git-tag-version=false` | Afeta o `npm version`, não a segurança da instalação. Mantido no padrão. |

## Cenários especiais

### Patch de emergência antes da janela de idade

Use `min-release-age-exclude[]` temporariamente:

```ini
min-release-age-exclude[]=@myorg/shared-utils
```

Reverta a exclusão assim que o pacote atingir a idade mínima.

### Registry privado ou air-gapped

Altere a URL do registry e mantenha `strict-ssl=true`:

```ini
registry=https://registry.mycompany.com/
strict-ssl=true
```

Se o registry usar uma CA interna, instale o certificado da CA no nível do SO; não desabilite o `strict-ssl`.

### CI sem acesso à internet

Configure o registry do projeto para um mirror interno e mantenha todas as outras configurações de hardening. Se o mirror for somente leitura, o `npm audit` pode precisar ser desabilitado na CI através de uma variável de ambiente em vez do `.npmrc`.

## Relação com outras defesas

- **Camada 1 — Verificação de idade dos pacotes**: `min-release-age=7` é a imposição nativa do npm; `tools/check-package-age.js` fornece a verificação a nível de projeto e o scan transitivo.
- **Camada 5 — Hook de pré-commit**: o hook executa audits e verificações de idade assumindo que `ignore-scripts=true` e `audit-level=high` estão ativos.
- **Camada 6 — `.npmrc` endurecido**: este guia é a referência detalhada dessa camada.
- **Análise de scripts de lifecycle**: prevê o que rodaria se os scripts estivessem habilitados; o `.npmrc` bloqueia.
- **Monitoramento de processos de lifecycle**: registra o que realmente rodou durante a instalação; o `.npmrc` reduz a chance de scripts inesperados executarem.

## Referências

- [Documentação de config do npm](https://docs.npmjs.com/cli/v11/using-npm/config)
- [Camada 6 — `.npmrc` endurecido](security/defense-layer-6-npmrc-config.md)
- [Reconstrução de pacotes com lifecycle scripts](security/rebuilding-lifecycle-packages.md)
