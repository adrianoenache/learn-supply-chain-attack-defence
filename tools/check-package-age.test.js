'use strict'

// Testes para check-package-age.js e add-package.js.
// Usa node:test + node:assert + node:child_process (módulos nativos, Node.js >= 18) — zero dependências extras.
//
// Executar:
//   npm test
//   node --test tools/check-package-age.test.js

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { EventEmitter } = require('node:events')

// Importa as funções exportadas — o guard `require.main === module` em ambos os arquivos
// garante que main() não é executado ao importar via require().
const { resolveExactVersion, fetchPackageAge, runWithConcurrencyLimit, MAX_RESPONSE_BYTES } = require(path.resolve(__dirname, './check-package-age.js'))
const { parsePackageArg, VALID_PKG_SPECIFIER_RE } = require(path.resolve(__dirname, './lib/package-utils.js'))

// ---------------------------------------------------------------------------
// resolveExactVersion
// ---------------------------------------------------------------------------

describe('resolveExactVersion', () => {
  // Versões exatas devem ser retornadas sem modificação.
  test('retorna versão exata sem range operators', () => {
    assert.equal(resolveExactVersion('1.0.0'), '1.0.0')
    assert.equal(resolveExactVersion('4.17.21'), '4.17.21')
    assert.equal(resolveExactVersion('0.0.1'), '0.0.1')
  })

  test('retorna versão exata com pre-release tag', () => {
    assert.equal(resolveExactVersion('1.0.0-beta.1'), '1.0.0-beta.1')
    assert.equal(resolveExactVersion('2.0.0-rc.3'), '2.0.0-rc.3')
  })

  test('retorna versão exata com build metadata', () => {
    assert.equal(resolveExactVersion('1.0.0+build.123'), '1.0.0+build.123')
  })

  // Range operators devem ser removidos, expondo a versão exata subjacente.
  test('remove operador ^ e retorna versão exata', () => {
    assert.equal(resolveExactVersion('^1.0.0'), '1.0.0')
    assert.equal(resolveExactVersion('^4.17.21'), '4.17.21')
  })

  test('remove operador ~ e retorna versão exata', () => {
    assert.equal(resolveExactVersion('~2.0.1'), '2.0.1')
    assert.equal(resolveExactVersion('~1.2.3'), '1.2.3')
  })

  test('remove operadores >= e <= e retorna versão exata', () => {
    assert.equal(resolveExactVersion('>=1.0.0'), '1.0.0')
    assert.equal(resolveExactVersion('<=3.0.0'), '3.0.0')
  })

  // Valores não resolúveis para versão exata devem retornar null.
  test('retorna null para "latest"', () => {
    assert.equal(resolveExactVersion('latest'), null)
  })

  test('retorna null para "next"', () => {
    assert.equal(resolveExactVersion('next'), null)
  })

  test('retorna null para wildcard *', () => {
    assert.equal(resolveExactVersion('*'), null)
  })

  test('retorna null para versão com curinga x', () => {
    assert.equal(resolveExactVersion('1.x'), null)
    assert.equal(resolveExactVersion('x.x.x'), null)
  })

  test('retorna null para range composto com espaço', () => {
    assert.equal(resolveExactVersion('>=1.0.0 <2.0.0'), null)
    assert.equal(resolveExactVersion('1.2 - 2.0'), null)
  })

  test('retorna null para string vazia', () => {
    assert.equal(resolveExactVersion(''), null)
  })
})

// ---------------------------------------------------------------------------
// VALID_PKG_SPECIFIER_RE
// ---------------------------------------------------------------------------

describe('VALID_PKG_SPECIFIER_RE', () => {
  // Especificadores válidos devem passar na regex.
  test('aceita nome simples com versão exata', () => {
    assert.ok(VALID_PKG_SPECIFIER_RE.test('lodash@4.17.21'))
    assert.ok(VALID_PKG_SPECIFIER_RE.test('express@4.21.2'))
    assert.ok(VALID_PKG_SPECIFIER_RE.test('husky@9.1.7'))
  })

  test('aceita pacote com escopo e versão exata', () => {
    assert.ok(VALID_PKG_SPECIFIER_RE.test('@types/node@22.15.3'))
    assert.ok(VALID_PKG_SPECIFIER_RE.test('@org/my-pkg@1.0.0'))
  })

  test('aceita versão com pre-release tag', () => {
    assert.ok(VALID_PKG_SPECIFIER_RE.test('pkg@1.0.0-beta.1'))
    assert.ok(VALID_PKG_SPECIFIER_RE.test('pkg@2.0.0-rc.3'))
  })

  test('aceita nome simples sem versão', () => {
    // Sem versão é aceito pela regex — a exigência de versão exata é validada em camada superior.
    assert.ok(VALID_PKG_SPECIFIER_RE.test('lodash'))
    assert.ok(VALID_PKG_SPECIFIER_RE.test('my-pkg'))
  })

  // Injeção de shell e caracteres inválidos devem ser rejeitados.
  test('rejeita ponto-e-vírgula (injeção de shell)', () => {
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('lodash; rm -rf /'))
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('pkg;evil'))
  })

  test('rejeita ampersand (injeção de shell)', () => {
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('pkg&evil'))
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('pkg&&evil'))
  })

  test('rejeita pipe (injeção de shell)', () => {
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('pkg|evil'))
  })

  test('rejeita cifrão (expansão de variável de shell)', () => {
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('$HOME'))
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('pkg$evil'))
  })

  test('rejeita traversal de diretório', () => {
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('../../../etc/passwd'))
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('../../evil'))
  })

  test('rejeita espaços no especificador', () => {
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('lodash 4.17.21'))
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('evil pkg'))
  })

  test('rejeita string vazia', () => {
    assert.ok(!VALID_PKG_SPECIFIER_RE.test(''))
  })
})

// ---------------------------------------------------------------------------
// parsePackageArg
// ---------------------------------------------------------------------------

describe('parsePackageArg', () => {
  // Pacotes sem escopo.
  test('decompõe nome@versão corretamente', () => {
    assert.deepEqual(parsePackageArg('lodash@4.17.21'), { name: 'lodash', version: '4.17.21' })
    assert.deepEqual(parsePackageArg('express@4.21.2'), { name: 'express', version: '4.21.2' })
  })

  test('retorna version: null quando versão é omitida', () => {
    assert.deepEqual(parsePackageArg('lodash'), { name: 'lodash', version: null })
  })

  test('preserva pre-release tag na versão', () => {
    assert.deepEqual(parsePackageArg('pkg@1.0.0-beta.1'), { name: 'pkg', version: '1.0.0-beta.1' })
  })

  // Pacotes com escopo (@org/name).
  test('decompõe @escopo/nome@versão corretamente', () => {
    assert.deepEqual(parsePackageArg('@types/node@22.15.3'), { name: '@types/node', version: '22.15.3' })
    assert.deepEqual(parsePackageArg('@org/my-pkg@1.0.0'), { name: '@org/my-pkg', version: '1.0.0' })
  })

  test('retorna version: null para @escopo/nome sem versão', () => {
    assert.deepEqual(parsePackageArg('@org/pkg'), { name: '@org/pkg', version: null })
    assert.deepEqual(parsePackageArg('@types/node'), { name: '@types/node', version: null })
  })

  test('preserva o @ do escopo no campo name', () => {
    const result = parsePackageArg('@types/node@22.15.3')
    assert.ok(result.name.startsWith('@'))
    assert.equal(result.name, '@types/node')
  })
})

// ---------------------------------------------------------------------------
// runWithConcurrencyLimit
// ---------------------------------------------------------------------------

describe('runWithConcurrencyLimit', () => {
  test('resolve com [] para lista de tasks vazia', async () => {
    const results = await runWithConcurrencyLimit([], 5)
    assert.deepEqual(results, [])
  })

  test('executa todas as tasks e retorna resultados no formato allSettled', async () => {
    const tasks = [
      () => Promise.resolve('a'),
      () => Promise.resolve('b'),
      () => Promise.resolve('c'),
    ]
    const results = await runWithConcurrencyLimit(tasks, 2)
    assert.deepEqual(results, [
      { status: 'fulfilled', value: 'a' },
      { status: 'fulfilled', value: 'b' },
      { status: 'fulfilled', value: 'c' },
    ])
  })

  test('tarefa rejeitada nao interrompe as demais', async () => {
    const tasks = [
      () => Promise.resolve('ok1'),
      () => Promise.reject(new Error('falha')),
      () => Promise.resolve('ok2'),
    ]
    const results = await runWithConcurrencyLimit(tasks, 3)
    assert.equal(results.length, 3)
    assert.equal(results[0].status, 'fulfilled')
    assert.equal(results[0].value, 'ok1')
    assert.equal(results[1].status, 'rejected')
    assert.equal(results[1].reason.message, 'falha')
    assert.equal(results[2].status, 'fulfilled')
    assert.equal(results[2].value, 'ok2')
  })

  test('mantém ordem dos resultados independente da ordem de conclusão', async () => {
    // Task 0 usa setImmediate (mais lenta), task 1 resolve imediatamente.
    // O índice do resultado deve seguir a ordem de inserção, não a de conclusão.
    const results = await runWithConcurrencyLimit([
      () => new Promise((res) => setImmediate(() => res('lento'))),
      () => Promise.resolve('rapido'),
    ], 2)
    assert.equal(results[0].value, 'lento')
    assert.equal(results[1].value, 'rapido')
  })

  test('respeita o limite de concorrência', async () => {
    let running = 0
    let maxRunning = 0
    const LIMIT = 3
    const tasks = Array.from({ length: 10 }, () => () =>
      new Promise((resolve) => {
        running++
        if (running > maxRunning) maxRunning = running
        setImmediate(() => {
          running--
          resolve()
        })
      })
    )
    await runWithConcurrencyLimit(tasks, LIMIT)
    assert.ok(maxRunning <= LIMIT, `Máximo simultâneo foi ${maxRunning}, esperado <= ${LIMIT}`)
  })
})

// ---------------------------------------------------------------------------
// fetchPackageAge
// ---------------------------------------------------------------------------

describe('fetchPackageAge', () => {
  const https = require('node:https')

  // Cria um objeto de requisição mock com handlers de evento manuais.
  function makeMockRequest() {
    const req = new EventEmitter()
    req.destroy = () => {}
    return req
  }

  // Cria um objeto de resposta mock que emite data+end de forma assíncrona,
  // garantindo que os listeners sejam registrados antes da emissão.
  function makeMockResponse(statusCode, body) {
    const res = new EventEmitter()
    res.statusCode = statusCode
    res.destroy = () => {}
    setImmediate(() => {
      res.emit('data', body)
      setImmediate(() => res.emit('end'))
    })
    return res
  }

  test('retorna { name, version, ageDays, published } para HTTP 200 válido', async () => {
    const publishDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    const body = JSON.stringify({ time: { '1.0.0': publishDate } })
    const originalGet = https.get
    https.get = (_url, _opts, callback) => {
      const req = makeMockRequest()
      callback(makeMockResponse(200, body))
      return req
    }
    try {
      const result = await fetchPackageAge('mypkg', '1.0.0')
      assert.equal(result.name, 'mypkg')
      assert.equal(result.version, '1.0.0')
      assert.ok(result.ageDays >= 9.9 && result.ageDays <= 10.1)
      assert.ok(result.published instanceof Date)
    } finally {
      https.get = originalGet
    }
  })

  test('rejeita com "Registry returned HTTP" para status não-200', async () => {
    const originalGet = https.get
    https.get = (_url, _opts, callback) => {
      const req = makeMockRequest()
      callback(makeMockResponse(404, ''))
      return req
    }
    try {
      await assert.rejects(
        () => fetchPackageAge('mypkg', '1.0.0'),
        /Registry returned HTTP 404 for mypkg/
      )
    } finally {
      https.get = originalGet
    }
  })

  test('rejeita com "Timeout fetching registry data" quando timeout dispara', async () => {
    const originalGet = https.get
    https.get = (_url, _opts, _callback) => {
      const req = makeMockRequest()
      setImmediate(() => req.emit('timeout'))
      return req
    }
    try {
      await assert.rejects(
        () => fetchPackageAge('mypkg', '1.0.0'),
        /Timeout fetching registry data for mypkg/
      )
    } finally {
      https.get = originalGet
    }
  })

  test('rejeita com "Network error" para erro no req', async () => {
    const originalGet = https.get
    https.get = (_url, _opts, _callback) => {
      const req = makeMockRequest()
      setImmediate(() => req.emit('error', new Error('ECONNREFUSED')))
      return req
    }
    try {
      await assert.rejects(
        () => fetchPackageAge('mypkg', '1.0.0'),
        /Network error for mypkg: ECONNREFUSED/
      )
    } finally {
      https.get = originalGet
    }
  })

  test('rejeita com "Stream error" para erro mid-stream no res', async () => {
    const originalGet = https.get
    https.get = (_url, _opts, callback) => {
      const req = makeMockRequest()
      const res = new EventEmitter()
      res.statusCode = 200
      res.destroy = () => {}
      setImmediate(() => {
        callback(res)
        setImmediate(() => res.emit('error', new Error('socket hang up')))
      })
      return req
    }
    try {
      await assert.rejects(
        () => fetchPackageAge('mypkg', '1.0.0'),
        /Stream error for mypkg: socket hang up/
      )
    } finally {
      https.get = originalGet
    }
  })

  test('rejeita com "exceeds" quando payload ultrapassa limite de tamanho', async () => {
    const originalGet = https.get
    // Buffer.alloc é mais eficiente que uma string literal para alocar MAX_RESPONSE_BYTES + 1.
    const oversizedChunk = Buffer.alloc(MAX_RESPONSE_BYTES + 1, 120).toString() // 120 = 'x'
    https.get = (_url, _opts, callback) => {
      const req = makeMockRequest()
      const res = new EventEmitter()
      res.statusCode = 200
      res.destroy = () => {}
      setImmediate(() => {
        callback(res)
        setImmediate(() => res.emit('data', oversizedChunk))
      })
      return req
    }
    try {
      await assert.rejects(
        () => fetchPackageAge('mypkg', '1.0.0'),
        /exceeds \d+ MB limit/
      )
    } finally {
      https.get = originalGet
    }
  })

  test('rejeita com "No publish date found" quando time[version] é ausente', async () => {
    const originalGet = https.get
    const body = JSON.stringify({ time: { '2.0.0': '2024-01-01T00:00:00.000Z' } })
    https.get = (_url, _opts, callback) => {
      const req = makeMockRequest()
      callback(makeMockResponse(200, body))
      return req
    }
    try {
      await assert.rejects(
        () => fetchPackageAge('mypkg', '1.0.0'),
        /No publish date found for mypkg@1\.0\.0/
      )
    } finally {
      https.get = originalGet
    }
  })

  test('rejeita com "Could not parse publish date" para data inválida', async () => {
    const originalGet = https.get
    const body = JSON.stringify({ time: { '1.0.0': 'not-a-date' } })
    https.get = (_url, _opts, callback) => {
      const req = makeMockRequest()
      callback(makeMockResponse(200, body))
      return req
    }
    try {
      await assert.rejects(
        () => fetchPackageAge('mypkg', '1.0.0'),
        /Could not parse publish date for mypkg@1\.0\.0/
      )
    } finally {
      https.get = originalGet
    }
  })

  test('rejeita com "Failed to parse response" para JSON malformado', async () => {
    const originalGet = https.get
    https.get = (_url, _opts, callback) => {
      const req = makeMockRequest()
      callback(makeMockResponse(200, 'isto nao e json {{{{'))
      return req
    }
    try {
      await assert.rejects(
        () => fetchPackageAge('mypkg', '1.0.0'),
        /Failed to parse response for mypkg/
      )
    } finally {
      https.get = originalGet
    }
  })
})

// ---------------------------------------------------------------------------
// CLI — check-package-age flags
// ---------------------------------------------------------------------------

describe('CLI — check-package-age flags', () => {
  const { spawnSync } = require('node:child_process')
  const scriptPath = path.resolve(__dirname, './check-package-age.js')

  test('--pkg sem valor: exit 1 com mensagem de erro', () => {
    const result = spawnSync(process.execPath, [scriptPath, '--pkg'], { encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /--pkg requires a package name with an exact version/)
  })

  test('--pkg e --transitive combinados: exit 1 com mensagem de exclusão mútua', () => {
    const result = spawnSync(
      process.execPath,
      [scriptPath, '--pkg', 'lodash@4.17.21', '--transitive'],
      { encoding: 'utf8' }
    )
    assert.equal(result.status, 1)
    assert.match(result.stderr, /--pkg and --transitive are mutually exclusive/)
  })

  test('--pkg com especificador inválido: exit 1', () => {
    const result = spawnSync(
      process.execPath,
      [scriptPath, '--pkg', 'lodash; rm -rf /'],
      { encoding: 'utf8' }
    )
    assert.equal(result.status, 1)
    assert.match(result.stderr, /invalid package specifier/)
  })
})

// ---------------------------------------------------------------------------
// CLI — add-package flags
// ---------------------------------------------------------------------------

describe('CLI — add-package flags', () => {
  const { spawnSync } = require('node:child_process')
  const scriptPath = path.resolve(__dirname, './add-package.js')

  test('sem argumento de pacote: exit 1', () => {
    const result = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /missing package argument/)
  })

  test('--dev e --peer combinados: exit 1 com mensagem de exclusão mútua', () => {
    const result = spawnSync(
      process.execPath,
      [scriptPath, 'lodash@4.17.21', '--dev', '--peer'],
      { encoding: 'utf8' }
    )
    assert.equal(result.status, 1)
    assert.match(result.stderr, /--dev and --peer are mutually exclusive/)
  })

  test('versão omitida (nome sem @x.y.z): exit 1', async () => {
    const result = spawnSync(process.execPath, [scriptPath, 'lodash'], { encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /exact version required/)
  })

  test('especificador inválido: exit 1', () => {
    const result = spawnSync(
      process.execPath,
      [scriptPath, 'lodash; evil'],
      { encoding: 'utf8' }
    )
    assert.equal(result.status, 1)
    assert.match(result.stderr, /invalid package specifier/)
  })
})
