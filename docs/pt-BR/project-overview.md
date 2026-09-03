# Visão Geral do Projeto

Este repositório é um ambiente prático de aprendizado para entender e aplicar defesas em camadas contra ataques de supply chain em projetos Node.js/npm.

## Propósito

Projetos JavaScript modernos dependem de centenas ou milhares de pacotes open-source. Cada dependência é um potencial ponto de entrada para atacantes. Este projeto demonstra como construir uma estratégia de **defesa em profundidade** que torna significativamente mais difícil a entrada de um pacote malicioso ou comprometido na sua base de código.

Em vez de depender de uma única ferramenta ou verificação, o projeto combina múltiplas salvaguardas independentes:

- Limites de idade para pacotes recém-publicados.
- Verificação de assinaturas do registry.
- Auditoria de vulnerabilidades.
- Instalações determinísticas a partir de um lock file.
- Gates de segurança de pré-commit.
- Configuração npm endurecida.
- Fiscalização de lint e formatação.
- Verificações de compatibilidade de licenças.
- Verificação de typosquatting e provenance.
- Reforço da integridade do hook.

## Para Quem É Este Projeto?

O projeto é útil para:

- **Aprendizes e estudantes** que querem entender como ataques de supply chain funcionam e como se defender contra eles.
- **Desenvolvedores conscientes de segurança** que querem uma linha de base comprovada para novos projetos Node.js.
- **Times e organizações** que buscam um conjunto reprodutível e auditável de defesas que podem ser copiadas para repositórios existentes.
- **Desenvolvedores assistidos por AI** que querem convenções claras para colaborar de forma segura com assistentes de código.

## O Que É Um Ataque de Supply Chain?

Um ataque de supply chain de software acontece quando um atacante introduz código malicioso em um projeto através de uma de suas dependências ou ferramentas de build. Técnicas comuns incluem:

- **Typosquatting** — publicar um pacote malicioso com nome semelhante a um popular.
- **Dependency confusion** — enviar um pacote público com o mesmo nome de um pacote privado interno.
- **Conta de mantenedor comprometida** — assumir o controle de um pacote legítimo e publicar uma versão maliciosa.
- **Scripts de lifecycle maliciosos** — executar código prejudicial durante `npm install` via hooks `postinstall`.

Este projeto ensina como cada camada de defesa mitiga uma ou mais dessas técnicas.

## Como Usar Este Repositório

1. **Leia a [visão geral de segurança](security/index.md)** para entender as doze camadas de defesa.
2. **Siga o [getting started](getting-started.md)** para configurar o projeto localmente.
3. **Explore as [ferramentas](tools.md)** para ver como cada defesa é implementada.
4. **Consulte o [quick reference](quick-reference.md)** para os comandos do dia a dia.
5. **Revisite a [arquitetura](architecture.md)** para entender como as peças se encaixam.
6. **Adote as defesas** no seu próprio projeto usando o [`install-defences.js`](../../tools/install-defences.js); veja [adotando em outros projetos](adopting-in-other-projects.md).

## Aprendizado vs. Adoção

Este repositório serve a dois objetivos ao mesmo tempo:

- **Aprendizado:** Cada defesa é documentada, testada e explicada para que os leitores entendam *por que* ela importa e *quando* ela é acionada.
- **Adoção:** As defesas são empacotadas como scripts standalone que podem ser copiados para outros projetos Node.js sem publicar um novo pacote npm.

Você pode usar este repositório como referência, material didático ou ponto de partida para endurecer seus próprios projetos.

## Desenvolvimento Assistido por AI

Este projeto foi construído com a assistência do GitHub Copilot e do Kimi 2.7 Code. A colaboração é regida por instruções explícitas em `.github/copilot-instructions.md` e documentada para contribuidores humanos nas [diretrizes de AI](ai-guidelines.md).
