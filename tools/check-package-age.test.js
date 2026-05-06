'use strict'

// Testes unitários para as funções utilitárias de check-package-age.js e add-package.js.
// Usa node:test + node:assert (módulos nativos, Node.js >= 18) — zero dependências extras.
//
// Executar:
//   npm test
//   node --test tools/check-package-age.test.js

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

// Importa as funções exportadas — o guard `require.main === module` em ambos os arquivos
// garante que main() não é executado ao importar via require().
const { resolveExactVersion } = require(path.resolve(__dirname, './check-package-age.js'))
const { parsePackageArg, VALID_PKG_SPECIFIER_RE } = require(path.resolve(__dirname, './add-package.js'))

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
