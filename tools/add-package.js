'use strict'

// Wrapper seguro para adicionar dependências ao projeto.
// Garante que a verificação de idade (check-package-age.js) seja executada ANTES
// de qualquer instalação, fechando o bypass silencioso que ocorre quando alguém
// roda `npm install <pacote>` diretamente sem passar pelo fluxo de segurança do projeto.
//
// Uso:
//   npm run add -- <pacote>@<versão>              — adiciona como dependência de produção
//   npm run add -- <pacote>@<versão> --dev        — adiciona como devDependency
//   npm run add -- <pacote>@<versão> --dry-run    — verifica a idade sem instalar
//
// Exemplos:
//   npm run add -- lodash@4.17.21
//   npm run add -- express@4.21.2
//   npm run add -- @types/node@22.15.3 --dev
//   npm run add -- husky@9.1.7 --dry-run
//
// Fluxo executado:
//   1. Valida o argumento (nome e versão exata obrigatória)
//   2. Verifica a idade do pacote via check-package-age.js --pkg (aborta se muito recente)
//   3. Instala com `npm install --save-exact` (pular se --dry-run)
//   4. Verifica assinaturas criptográficas com `npm audit signatures`
//   5. Audita vulnerabilidades conhecidas com `npm audit --audit-level=high`
//
// Pacotes com lifecycle scripts (postinstall, preinstall):
//   O projeto usa ignore-scripts=true no .npmrc, bloqueando lifecycle scripts de todos
//   os pacotes instalados. Pacotes que necessitem de um postinstall para funcionar
//   (ex: esbuild, sharp, canvas) precisam de uma etapa adicional manual:
//     npm_config_ignore_scripts=false npm rebuild <pacote>
//   Consulte a seção "Adicionando Novas Dependências" no README.md para detalhes.

const { execSync } = require('node:child_process')
const path = require('node:path')

// Reutiliza fetchPackageAge e resolveExactVersion do check-package-age.js para manter
// a lógica de verificação centralizada em um único lugar.
// O require funciona porque check-package-age.js exporta via module.exports ao final.
// Somente módulos nativos são usados aqui, pelo mesmo motivo do check-package-age.js.
const { fetchPackageAge, resolveExactVersion } = require(path.resolve(__dirname, './check-package-age.js'))

const pkg = require(path.resolve(__dirname, '../package.json'))

// Lê as mesmas configurações do check-package-age.js para manter comportamento consistente.
const MIN_AGE_DAYS = (pkg.pkgAgeCheck?.minAgeDays) ?? 3

// Valida caracteres permitidos em nomes de pacotes npm (incluindo escopo @org/name).
// Mesma regex do check-package-age.js — rejeita injeção de shell antes de qualquer
// uso do valor em execSync ou passagem para o registry.
// Aceita: lodash@4.17.21, @types/node@22.15.3, my-pkg@1.0.0-beta.1
// Rejeita: qualquer entrada com ;, &, |, $, `, \, <, >, !, espaços ou aspas.
const VALID_PKG_SPECIFIER_RE = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(@\d+\.\d+\.\d+[a-z0-9._+-]*)?$/i

// Parseia os argumentos da linha de comando.
// process.argv: ["node", "add-package.js", "<pacote>@<versão>", "[--dev]", "[--dry-run]"]
const args = process.argv.slice(2)
const pkgArg = args.find((a) => !a.startsWith('-'))
const isDev = args.includes('--dev')
const isDryRun = args.includes('--dry-run')

// Valida os argumentos antes de qualquer operação de rede ou disco.
// Falha com mensagem de uso clara para orientar o colaborador.
// Executado apenas no modo CLI — não dispara ao importar via require().
function validateArgs() {
  if (!pkgArg) {
    console.error('Error: missing package argument.')
    console.error('Usage: npm run add -- <package>@<version> [--dev] [--dry-run]')
    console.error('Examples:')
    console.error('  npm run add -- lodash@4.17.21')
    console.error('  npm run add -- @types/node@22.15.3 --dev')
    console.error('  npm run add -- express@4.21.2 --dry-run')
    process.exit(1)
  }

  if (!VALID_PKG_SPECIFIER_RE.test(pkgArg)) {
    console.error(`Error: invalid package specifier "${pkgArg}".`)
    console.error('Use the format: name@x.y.z or @scope/name@x.y.z (exact version required)')
    process.exit(1)
  }
}

// Decompõe "name@version" ou "@scope/name@version" em nome e versão.
// Pacotes com escopo (@org/name@version) têm o @ inicial preservado:
// remove o @ inicial, localiza o próximo @ (separador de versão), reconstrói o escopo.
// Mesma lógica do branch --pkg em check-package-age.js para consistência.
function parsePackageArg(input) {
  if (input.startsWith('@')) {
    const withoutLeadingAt = input.slice(1)           // "org/name@version"
    const atIdx = withoutLeadingAt.indexOf('@')
    if (atIdx === -1) return { name: input, version: null }
    return {
      name: '@' + withoutLeadingAt.slice(0, atIdx),   // "@org/name"
      version: withoutLeadingAt.slice(atIdx + 1),     // "x.y.z"
    }
  }
  const atIdx = input.indexOf('@')
  if (atIdx === -1) return { name: input, version: null }
  return { name: input.slice(0, atIdx), version: input.slice(atIdx + 1) }
}

async function main() {
  const { name, version: rawVersion } = parsePackageArg(pkgArg)

  // Exige versão exata — o colaborador deve decidir explicitamente qual versão está aprovando.
  // Isso evita que o fluxo automaticamente aprove uma versão recém-publicada ao resolver "latest".
  if (!rawVersion) {
    console.error(`Error: exact version required. Use: npm run add -- ${name}@x.y.z`)
    process.exit(1)
  }

  console.log(`\nadd-package: ${name}@${rawVersion}${isDev ? ' [devDependency]' : ''}${isDryRun ? ' [dry-run]' : ''}\n`)

  // Passo 1 — Confirmar que a versão informada é exata (sem range operators).
  // resolveExactVersion é importada do check-package-age.js; retorna null para dist-tags
  // e ranges como "^1.0.0", "~2.0", "latest", etc.
  const exactVersion = resolveExactVersion(rawVersion)
  if (!exactVersion) {
    console.error(`Error: "${rawVersion}" is not an exact version.`)
    console.error(`Use a pinned version, e.g.: npm run add -- ${name}@x.y.z`)
    process.exit(1)
  }

  // Passo 2 — Verificar a idade do pacote antes de qualquer instalação.
  // fetchPackageAge é importada do check-package-age.js; consulta o registry e retorna
  // o número de dias desde a publicação. Aborta se o pacote for mais novo que MIN_AGE_DAYS.
  console.log(`Checking publish age for ${name}@${exactVersion} (minimum: ${MIN_AGE_DAYS} days)...`)
  let ageResult
  try {
    ageResult = await fetchPackageAge(name, exactVersion)
  } catch (err) {
    console.error(`\nPackage age check FAILED: ${err.message}`)
    console.error('Installation aborted — package age could not be confirmed.')
    process.exit(1)
  }

  const ageDays = ageResult.ageDays.toFixed(1)
  const publishedStr = ageResult.published.toISOString().slice(0, 10)

  if (ageResult.ageDays < MIN_AGE_DAYS) {
    console.error(`\n  BLOCKED  ${name}@${exactVersion} — published ${publishedStr} (${ageDays} days ago)`)
    console.error(`\nPackage age check FAILED — below minimum age of ${MIN_AGE_DAYS} days.`)
    console.error('Installation aborted.')
    process.exit(1)
  }

  console.log(`  OK       ${name}@${exactVersion} — published ${publishedStr} (${ageDays} days ago)`)

  // Passo 3 — Instalar o pacote (apenas se não for dry-run).
  // --save-exact garante versão fixada sem operadores ^/~ no package.json,
  // alinhado com save-exact=true do .npmrc (redundância intencional para clareza).
  // O .npmrc já define ignore-scripts=true; a flag não é passada explicitamente aqui
  // pois o npm a lê automaticamente do arquivo de configuração.
  if (isDryRun) {
    console.log('\nDry-run: age check passed. Skipping installation.')
    console.log(`\nTo install, run: npm run add -- ${pkgArg}${isDev ? ' --dev' : ''}`)
    process.exit(0)
  }

  const saveFlag = isDev ? '--save-dev' : '--save'
  // O valor de name e exactVersion foi validado pelo VALID_PKG_SPECIFIER_RE antes de chegar aqui,
  // garantindo que não contêm caracteres de injeção de shell.
  const installCmd = `npm install ${saveFlag} --save-exact ${name}@${exactVersion}`

  console.log(`\nInstalling: ${installCmd}`)
  try {
    // stdio: 'inherit' repassa stdout/stderr do npm diretamente para o terminal,
    // permitindo que o colaborador veja o progresso e mensagens de erro em tempo real.
    execSync(installCmd, { stdio: 'inherit' })
  } catch {
    // O npm já imprimiu o erro via stdio: 'inherit'; apenas indica o motivo da saída.
    console.error('\nInstallation failed. See npm output above.')
    process.exit(1)
  }

  // Passo 4 — Verificar assinaturas criptográficas pós-instalação.
  // Detecta adulteração do pacote em trânsito (MITM) ou substituição local de node_modules/.
  // Complementado pelo Passo 5, que verifica CVEs conhecidas após confirmar a integridade.
  console.log('\nVerifying package signatures...')
  try {
    execSync('npm audit signatures', { stdio: 'inherit' })
  } catch {
    console.error('\nSignature verification failed. The installation may be compromised.')
    console.error('Run `npm ci` to restore a clean state from package-lock.json.')
    process.exit(1)
  }

  // Passo 5 — Auditar vulnerabilidades conhecidas pós-instalação.
  // Garante que o pacote recém-instalado não introduz CVEs de severidade alta ou crítica.
  // Executado após o audit de assinaturas para cobrir ambos os vetores no mesmo fluxo.
  console.log('\nAuditing for known vulnerabilities...')
  try {
    execSync('npm audit --audit-level=high', { stdio: 'inherit' })
  } catch {
    console.error('\nVulnerability audit FAILED — high or critical CVE detected.')
    console.error('Run `npm audit` for details, or `npm audit fix` to apply automatic fixes.')
    console.error(`To remove the package: npm uninstall ${name}`)
    process.exit(1)
  }

  console.log(`\nDone. ${name}@${exactVersion} added successfully.`)
  console.log('Remember to commit both package.json and package-lock.json.')
}

// Executa main() apenas quando o script é chamado diretamente via CLI.
// Quando importado via require() por testes ou outros módulos,
// apenas as exportações ficam disponíveis — main() não é chamado.
if (require.main === module) {
  validateArgs()
  main().catch((err) => {
    console.error(`Unexpected error: ${err.message}`)
    process.exit(1)
  })
}

// Exporta funções utilitárias para uso nos testes.
module.exports = { parsePackageArg, VALID_PKG_SPECIFIER_RE }
