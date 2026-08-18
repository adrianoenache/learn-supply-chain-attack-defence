# O Que É um Ataque de Supply Chain?

Um ataque de supply chain tem como alvo o software do qual você depende em vez do seu próprio código. Se um atacante comprometer uma dependência, todo projeto que a instalar se torna uma vítima em potencial.

## Vetores Comuns no npm

- **Typosquatting** — publicar um pacote com nome semelhante a um popular.
- **Takeover de conta** — roubar credenciais de um mantenedor legítimo.
- **Confusão de dependências** — subir um pacote com nome privado para o registry público.
- **Atualização maliciosa** — publicar uma versão comprometida de um pacote confiável.
- **Pipeline de build/publicação comprometido** — injetar malware durante o build do pacote.

## Por Que as Camadas Importam

Nenhum controle sozinho detecta todas as ameaças. Um período de espera curto pega lançamentos maliciosos apressados; a verificação de assinaturas pega pacotes não publicados pelo registry; a auditoria pega CVEs conhecidas; a instalação determinística evita drift; os hooks de pré-commit pegam erros manuais; e o endurecimento do `.npmrc` desabilita comportamentos arriscados do npm.

_Sincronizado em: 2026-08-18_
