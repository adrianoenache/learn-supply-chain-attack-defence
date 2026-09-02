# Camada de Defesa 11 — Verificação de Provenance e Atestado SLSA

Pacotes npm podem ser publicados com um atestado de provenance assinado que vincula o tarball a um repositório de origem, commit e workflow de CI específicos. Verificar a provenance dificulta muito que um atacante substitua um tarball que não foi construído pelo publicador legítimo.

## O Que Esta Camada Verifica

- Se a versão do pacote possui um atestado de provenance publicado.
- Se o bundle de atestado é estruturalmente válido.

## Configuração

O comportamento é controlado por `defences.provenanceMode` em `package.json`:

```json
{
  "defences": {
    "provenanceMode": "warn"
  }
}
```

Valores permitidos:

- `warn` (padrão) — provenance ausente ou inválido exibe um aviso, mas permite a instalação.
- `strict` — provenance ausente ou inválido aborta a instalação.
- `off` — provenance não é verificada.

## Implementação

Implementado em:

- [tools/lib/provenance.js](../../../tools/lib/provenance.js)
- [tools/add-package.js](../../../tools/add-package.js)

O `provenance.js` busca o bundle de atestado no registry do npm usando a camada compartilhada de cache e retry do registry. Ele analisa o bundle e verifica se contém um atestado válido para o nome e versão do pacote solicitado.

## Uso

A verificação é executada automaticamente durante o `add-package.js`, após a verificação de idade do pacote e antes da instalação:

```bash
npm run defence:add -- lodash@4.17.21
```

## Por Que Não Bloquear Por Padrão?

Nem todos os pacotes publicam provenance ainda. Começar no modo `warn` permite que o projeto colete sinal sem quebrar fluxos legítimos, enquanto o modo `strict` está disponível para equipes que exigem conformidade com SLSA.
