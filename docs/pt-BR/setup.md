# Setup

O script npm `setup` instala as dependências e executa todas as camadas de segurança na ordem correta.

## O Que Ele Executa

```bash
"setup": "npm ci && npm audit signatures && npm audit --audit-level=high && npm run pkg-age-check"
```

1. `npm ci` — instalação determinística a partir do `package-lock.json`.
2. `npm audit signatures` — verifica as assinaturas do registry dos pacotes instalados.
3. `npm audit --audit-level=high` — falha se houver qualquer CVE alta ou crítica.
4. `npm run pkg-age-check` — garante que toda dependência direta tenha pelo menos 7 dias de idade.

## Quando Executar

- Logo após clonar o repositório.
- Após fazer pull de atualizações de outra branch.
- Como baseline antes de adicionar ou remover dependências.

## Códigos de Saída

Se algum passo falhar, o script sai com código diferente de zero. Corrija o problema reportado antes de continuar.

_Sincronizado em: 2025-06-25_
