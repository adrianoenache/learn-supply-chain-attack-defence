'use strict'

// Defesa contra supply chain attacks do tipo "fast publish":
// Impede a instalação de pacotes publicados recentemente no npm registry.
// Ataques como event-stream (2018) e ua-parser-js (2021) envolvem a publicação
// de uma versão maliciosa e sua remoção antes de ser amplamente detectada.
// Um atraso mínimo de dias dá tempo para scanners e a comunidade identificarem a ameaça.
//
// Uso: node ./tools/check-package-age.js
// Invocado via script `pkg-age-check`, chamado por `setup` (uma vez) e `npm-reinstall` (duas vezes) do package.json.

const https = require('node:https')
const path = require('node:path')

// Número mínimo de dias que um pacote deve ter desde sua publicação para ser aceito.
const MIN_AGE_DAYS = 3

// Lê as dependências declaradas no package.json do projeto.
// Somente módulos nativos são usados aqui — este script não pode depender de
// pacotes instaláveis, pois é executado antes da própria instalação.
const pkg = require(path.resolve(__dirname, '../package.json'))
const deps = { ...pkg.dependencies, ...pkg.devDependencies }

// Limite máximo de tamanho por resposta do registry (padrão: 20 MB).
// Documentos completos de pacotes com histórico longo podem ser grandes, mas nenhum
// pacote real conhecido ultrapassa 20 MB. O cap protege contra cenários patológicos
// (resposta malformada, injeção de dados em trânsito, loop infinito de chunks).
// Para sobrescrever, adicione ao package.json: "pkgAgeCheck": { "maxResponseMB": 50 }
const MAX_RESPONSE_BYTES = ((pkg.pkgAgeCheck?.maxResponseMB) ?? 20) * 1024 * 1024

// Remove range operators semver (`^`, `~`, `>=`, `<=`, `>`, `<`, `=`) do início
// de uma string de versão, retornando a versão exata, ou null se não for resolvível
// (ex: `*`, `latest`, `x.x.x`). O campo `time` do registry só contém versões exatas.
function resolveExactVersion(version) {
  const exact = version.replace(/^[~^>=<*\s]+/, '').trim()
  if (!exact || exact === 'latest' || exact === 'next' || /[x*]/.test(exact)) return null
  // Espaço remanescente indica range composto (ex: "1.2 - 2.0", ">=1.0.0 <2.0.0") —
  // não é possível determinar uma versão exata sem resolver o range.
  if (/\s/.test(exact)) return null
  return exact
}

// Consulta o npm registry e retorna a idade em dias de uma versão específica de um pacote.
//
// O endpoint raiz (/name) é usado em vez do endpoint de versão (/name/version) porque
// apenas o documento completo do pacote contém o mapa `time` com a data de publicação
// de cada versão individualmente. O abbreviated packument (vnd.npm.install-v1+json) não
// inclui o campo `time`, portanto o documento completo é obrigatório.
function fetchPackageAge(name, version) {
  return new Promise((resolve, reject) => {
    // Guard contra chamadas duplas a resolve/reject: em cenários de erro de socket,
    // `res.on('error')` e `res.on('end')` podem disparar em sequência no mesmo ciclo.
    // A Promise ignora silenciosamente o segundo chamado, mas a flag torna isso explícito.
    let settled = false
    const safeResolve = (val) => { if (!settled) { settled = true; resolve(val) } }
    const safeReject = (err) => { if (!settled) { settled = true; reject(err) } }

    const url = `https://registry.npmjs.org/${encodeURIComponent(name)}`

    const req = https.get(url, { headers: { 'Accept': 'application/json' }, timeout: 10000 }, (res) => {
      let data = ''

      // Acumula os chunks da resposta HTTP em uma string.
      // Interrompe a transferência se o tamanho acumulado ultrapassar MAX_RESPONSE_BYTES.
      res.on('data', (chunk) => {
        data += chunk
        if (Buffer.byteLength(data) > MAX_RESPONSE_BYTES) {
          res.destroy()
          const limitMB = MAX_RESPONSE_BYTES / (1024 * 1024)
          safeReject(new Error(
            `Response for ${name} exceeds ${limitMB} MB limit. ` +
            `Set "pkgAgeCheck": { "maxResponseMB": <value> } in package.json to increase the limit.`
          ))
        }
      })

      // Erros mid-stream (conexão perdida após o início da resposta) disparam em `res`,
      // não em `req` — por isso precisam de um handler próprio.
      res.on('error', (err) => { safeReject(new Error(`Stream error for ${name}: ${err.message}`)) })

      res.on('end', () => {
        if (res.statusCode !== 200) {
          safeReject(new Error(`Registry returned HTTP ${res.statusCode} for ${name}`))
          return
        }

        try {
          const info = JSON.parse(data)

          // O campo `time` é um objeto onde cada chave é uma versão publicada
          // e o valor é o timestamp ISO 8601 da publicação.
          // Exemplo: { "1.0.0": "2024-01-15T10:00:00.000Z", ... }
          if (!info.time?.[version]) {
            safeReject(new Error(`No publish date found for ${name}@${version} in registry`))
            return
          }

          const published = new Date(info.time[version])

          if (Number.isNaN(published.getTime())) {
            safeReject(new Error(`Could not parse publish date for ${name}@${version}`))
            return
          }

          // Converte a diferença entre agora e a data de publicação de milissegundos para dias.
          const ageDays = (Date.now() - published.getTime()) / (1000 * 60 * 60 * 24)
          safeResolve({ name, version, ageDays, published })
        } catch (err) {
          safeReject(new Error(`Failed to parse response for ${name}: ${err.message}`))
        }
      })
    })

    req.on('timeout', () => { req.destroy(); safeReject(new Error(`Timeout fetching registry data for ${name}`)) })
    req.on('error', (err) => {
      safeReject(new Error(`Network error for ${name}: ${err.message}`))
    })
  })
}

async function main() {
  const entries = Object.entries(deps)

  if (entries.length === 0) {
    console.log('No dependencies to check.')
    process.exit(0)
  }

  console.log(`Checking publish age for ${entries.length} package(s) (minimum: ${MIN_AGE_DAYS} days)...\n`)

  // Consulta todos os pacotes em paralelo para reduzir o tempo total de execução.
  // Promise.allSettled garante que todas as consultas são concluídas antes de avaliar
  // os resultados, mesmo que algumas falhem — permitindo um relatório completo.
  // Versões com range operators (^, ~, >=, etc.) são normalizadas para a versão exata
  // antes da consulta; ranges não resolvíveis (*, latest) são rejeitados.
  const results = await Promise.allSettled(
    entries.map(([name, rawVersion]) => {
      const version = resolveExactVersion(rawVersion)
      if (!version) {
        return Promise.reject(new Error(`Cannot determine exact version for ${name}@${rawVersion} — pin to an exact version to allow age check`))
      }
      return fetchPackageAge(name, version)
    })
  )

  // Separa os pacotes em duas listas: bloqueados (muito novos) e com erro de consulta.
  // Ambos resultam em falha — não é possível instalar um pacote cuja idade não foi confirmada.
  const blocked = []
  const errors = []

  results.forEach((result) => {
    if (result.status === 'rejected') {
      errors.push(result.reason.message)
      return
    }

    const { name, version, ageDays, published } = result.value
    const age = ageDays.toFixed(1)
    const publishedStr = published.toISOString().slice(0, 10)

    if (ageDays < MIN_AGE_DAYS) {
      blocked.push(`  BLOCKED  ${name}@${version} — published ${publishedStr} (${age} days ago)`)
    } else {
      console.log(`  OK       ${name}@${version} — published ${publishedStr} (${age} days ago)`)
    }
  })

  if (errors.length > 0) {
    console.error('\nErrors during registry lookup (cannot confirm package age):')
    errors.forEach((msg) => console.error(`  ${msg}`))
  }

  if (blocked.length > 0) {
    console.error(`\nPackage age check FAILED — ${blocked.length} package(s) below minimum age of ${MIN_AGE_DAYS} days:`)
    blocked.forEach((msg) => console.error(msg))
  }

  // Sai com código 1 (falha) se qualquer pacote foi bloqueado ou se alguma consulta
  // ao registry não pôde ser concluída. Ambos os casos impedem a instalação.
  if (blocked.length > 0 || errors.length > 0) {
    process.exit(1)
  }

  console.log(`\nAll packages passed the minimum age check.`)
}

main().catch((err) => {
  console.error(`Unexpected error: ${err.message}`)
  process.exit(1)
})
