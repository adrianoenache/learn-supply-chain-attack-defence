# Camada de Defesa 9 — Verificação de Licenças de Dependências

Uma dependência pode ser tecnicamente segura — assinada, com idade suficiente e sem vulnerabilidades — e ainda assim ser legalmente incompatível com o projeto. O verificador de licenças escaneia todos os pacotes registrados no `package-lock.json`, classifica cada licença contra uma lista explícita de permissões e proibições, e reporta tudo que precisa de revisão legal.

Esta camada é intencionalmente somente leitura. Ela nunca instala, modifica ou ignora uma dependência; apenas torna visíveis as informações de licenciamento para que humanos possam tomar decisões informadas.

## O que ela faz

Quando você executa `npm run defence:license-check`:

1. **Lê o lock file**: faz o parse do `package-lock.json` v3, incluindo todas as dependências diretas e transitivas.
2. **Classifica cada licença**:
   - **Permitida** — a licença está na lista explícita de permissões (ex.: `MIT`, `Apache-2.0`, `ISC`).
   - **Proibida** — a licença está na lista explícita de proibições (ex.: `GPL-3.0`, `AGPL-3.0`, `UNLICENSED`).
   - **Sinalizada para revisão** — a licença está ausente ou não é reconhecida.
3. **Lida com expressões SPDX**: suporta expressões compostas com `OR` e `AND`, como `MIT OR Apache-2.0` ou `MIT AND ISC`.
4. **Imprime um relatório**: saída em tabela, JSON ou Markdown para humanos e pipelines de CI.

Se `--fail` for fornecido, o comando sai com código 1 quando algum pacote está proibido ou sinalizado. Isso facilita adicionar uma barreira de licenças ao CI sem quebrar a exploração local.

## Configuração

O comportamento é controlado pelo bloco `licensesCheck` no `package.json`:

```json
"licensesCheck": {
  "allowed": [
    "MIT",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "ISC",
    "0BSD"
  ],
  "prohibited": [
    "GPL-1.0",
    "GPL-2.0",
    "GPL-3.0",
    "AGPL-1.0",
    "AGPL-3.0",
    "LGPL-2.0",
    "LGPL-2.1",
    "LGPL-3.0",
    "MPL-1.0",
    "MPL-1.1",
    "MPL-2.0",
    "UNLICENSED"
  ],
  "failOnUnknown": false
}
```

| Campo | Padrão | Significado |
| --- | --- | --- |
| `allowed` | licenças permissivas OSI | Licenças consideradas compatíveis com o projeto. |
| `prohibited` | copyleft / marcadores proprietários | Licenças que sempre causam falha quando `--fail` é usado. |
| `failOnUnknown` | `false` | Se `true`, licenças desconhecidas são tratadas como proibidas em vez de sinalizadas. |

Se `licensesCheck` estiver ausente, o script usa os valores padrão embutidos mostrados acima.

## Uso

```bash
# Tabela legível para humanos (padrão)
npm run defence:license-check

# Sai com código 1 em licenças proibidas ou desconhecidas
npm run defence:license-check:fail

# Saída JSON para CI / automação
npm run defence:license-check:json

# Saída Markdown para pull requests / issues
npm run defence:license-check -- --format=markdown

# Suprime a saída (útil em CI)
npm run defence:license-check -- --silent

# Verifica um único pacote
npm run defence:license-check -- --pkg=lodash@4.17.21
```

## Exemplo de saída

```text

📋 Dependency license check — 3 package(s) scanned:

   Prohibited (1):
     ❌ gpl-pkg@1.0.0 — GPL-3.0 (gpl-3.0)

   Flagged for review (1):
     ⚠️  unknown-pkg@3.0.0 — Custom (unknown license)

   Allowed (1):
     ✅ mit-pkg@1.0.0 — MIT

```

## Por que somente leitura?

- **Fail-safe**: um bug na verificação não pode remover ou fazer downgrade de uma dependência.
- **Controle do desenvolvedor**: decisões de licenciamento permanecem com o time; a ferramenta apenas informa.
- **Rápido**: a verificação lê o `package-lock.json` e termina, sem chamadas de rede ou instalação de pacotes.

## Tratamento de expressões SPDX

Pacotes modernos frequentemente declaram licenças compostas. O verificador as avalia da seguinte forma:

- **`MIT OR Apache-2.0`**: permitida se pelo menos um ramo for permitido.
- **`MIT AND ISC`**: permitida apenas se todos os ramos forem permitidos.
- **`MIT OR GPL-3.0`**: proibida se qualquer ramo for proibido.
- **`MIT AND GPL-3.0`**: proibida se qualquer ramo for proibido.

Ramos desconhecidos são tratados como sinalizados, a menos que a expressão completa se resolva através de um ramo permitido ou proibido.

## Modo de pacote único

Para triagem rápida, você pode verificar um pacote pelo nome e versão exatos:

```bash
npm run defence:license-check -- --pkg=react@18.3.1
```

Pacotes com escopo são suportados:

```bash
npm run defence:license-check -- --pkg=@biomejs/biome@2.5.8
```

Se o pacote não for encontrado no lock file, o comando sai com código 1.

## Implementação

Implementado em:

- [tools/check-licenses.js](../../../tools/check-licenses.js)
