# Glossário

Este glossário define termos usados em toda a documentação do projeto. É destinado a aprendizes, contribuidores e auditores que podem não estar familiarizados com a terminologia de segurança de supply chain.

## Confusão de dependências (dependency confusion)

Ataque em que um pacote público é publicado com o mesmo nome de um pacote privado interno. Se o gerenciador de pacotes resolver o nome público primeiro, o código malicioso é instalado em vez do interno.

## Distância de Levenshtein

Medida de quantas edições de caractere único são necessárias para transformar uma string em outra. Este projeto a utiliza para detectar nomes de pacotes visualmente semelhantes a dependências existentes (typosquatting).

## Instalação determinística

Processo de instalação que produz a mesma árvore de dependências toda vez que é executado. Em projetos npm, isso é alcançado instalando a partir de um `package-lock.json` verificado usando `npm ci` em vez de `npm install`.

## Integridade do lock file

Propriedade de uma entrada do `package-lock.json` que inclui um hash criptográfico (geralmente SHA-512) do tarball do pacote. Verificar a integridade garante que o pacote instalado corresponde ao que foi auditado.

## Provenance

Uma atestação assinada do registry de pacotes que registra como um pacote foi construído e publicado. Provenance ajuda os usuários a verificar se um pacote veio de uma fonte e pipeline de build esperados.

## SBOM (Software Bill of Materials)

Inventário legível por máquina de todos os componentes de um projeto de software. Este projeto pode gerar um SBOM CycloneDX 1.4 JSON a partir do `package-lock.json` para compliance e resposta a incidentes.

## Scripts de lifecycle

Scripts npm como `postinstall`, `preinstall` e `prepare` que são executados automaticamente durante a instalação de pacotes. Eles são um caminho de execução comum para código malicioso, por isso este projeto os desabilita por padrão via `ignore-scripts` no `.npmrc`.

## SLSA

Supply-chain Levels for Software Artifacts. Um framework de segurança que fornece diretrizes e atestações para cadeias de suprimento de software seguras. Atestações de provenance são uma primitiva do SLSA.

## Time-of-check/time-of-use (TOCTOU)

Janela de vulnerabilidade em que um recurso é verificado e depois usado, mas o recurso pode ter mudado no intervalo. Este projeto fecha a janela TOCTOU em `add-package.js` re-verificando os metadados do pacote após a instalação.

## Typosquatting

Ataque em que um pacote malicioso é publicado com nome muito semelhante a um pacote legítimo popular, na esperança de que os usuários digitem o nome errado durante a instalação.
