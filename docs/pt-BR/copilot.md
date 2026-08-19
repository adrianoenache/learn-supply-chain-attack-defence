# Construído com GitHub Copilot e Kimi K2.7 Code

Este projeto foi desenvolvido com o auxílio do **GitHub Copilot**, alimentado pelo modelo **Kimi K2.7 Code**.

## O Que a IA Ajudou a Construir

O GitHub Copilot foi usado como um assistente de pair programming ao longo do projeto. A IA contribuiu com:

- Estrutura inicial e scaffolding do projeto.
- Rascunho dos scripts de defesa (`check-package-age.js`, `add-package.js`, `setup-bootstrap.js`, `update-packages.js`, `install-defences.js`).
- Escrita de testes unitários e de integração com o runner nativo do Node.js.
- Criação da documentação multilíngue (`docs/en/` e `docs/pt-BR/`).
- Refatoração para testabilidade, como o padrão de injeção de `spawnSync`.
- Avaliação de escolhas de ferramentas, incluindo a decisão de adotar o Biome em vez do ESLint.

## O Que Foi Revisado por um Humano

Toda sugestão gerada pela IA foi revisada, validada e ajustada pelo autor do projeto. Em particular, as seguintes decisões foram tomadas manualmente:

- Limiares de segurança (por exemplo, `min-release-age=7`, `audit-level=high`).
- Versões exatas de dependências, verificadas contra as datas de publicação no npm.
- A escolha do Biome 2.5.8 baseada na política de idade do projeto.
- A sequência de verificações em cada script de defesa.
- Toda a documentação de arquitetura e modelo de ameaças.

## Por Que Documentar Isso

A transparência sobre o uso de IA no desenvolvimento importa para:

- **Confiança**: os leitores sabem quais partes do código foram geradas e quais foram validadas por humanos.
- **Manutenção**: futuros contribuidores podem identificar seções que podem precisar de revisão humana extra.
- **Aprendizado**: o projeto é educacional, então mostrar a colaboração entre humano e IA faz parte da experiência de aprendizado.

## Recomendação

Se você reutilizar qualquer código deste repositório, revise-o com atenção. Código gerado por IA pode ser um ponto de partida poderoso, mas não substitui o julgamento humano, especialmente em contextos sensíveis à segurança.
