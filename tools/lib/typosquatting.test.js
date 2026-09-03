#!/usr/bin/env node
'use strict'

const { describe, test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')

const {
  calculateDistance,
  isSimilar,
  findConflicts,
  findTyposquattingConflicts,
  findDependencyConfusion,
  readDeclaredPackageNames,
  readInstalledPackageNames,
  loadExistingNames,
  loadInternalNames,
  setFsImpl,
  resetFsImpl,
} = require('./typosquatting.js')

function makeMockFs(files) {
  return {
    readFileSync: (p, encoding) => {
      const content = files[p]
      if (content === undefined) {
        throw new Error(`ENOENT: ${p}`)
      }
      if (Buffer.isBuffer(content)) {
        return encoding === 'utf8' ? content.toString('utf8') : content
      }
      return encoding === 'utf8' ? content : Buffer.from(content)
    },
  }
}

describe('typosquatting', () => {
  beforeEach(() => resetFsImpl())
  afterEach(() => resetFsImpl())

  test('calculateDistance returns correct edit distance', () => {
    assert.equal(calculateDistance('', ''), 0)
    assert.equal(calculateDistance('a', ''), 1)
    assert.equal(calculateDistance('', 'ab'), 2)
    assert.equal(calculateDistance('kitten', 'sitting'), 3)
    assert.equal(calculateDistance('lodash', 'loadsh'), 2)
    assert.equal(calculateDistance('express', 'express'), 0)
  })

  test('isSimilar respects threshold and excludes exact matches', () => {
    assert.equal(isSimilar('lodash', 'loadsh', 2), true)
    assert.equal(isSimilar('lodash', 'loadsh', 1), false)
    assert.equal(isSimilar('lodash', 'lodash', 2), false)
  })

  test('findTyposquattingConflicts returns similar packages', () => {
    const conflicts = findTyposquattingConflicts(
      'loadsh',
      ['lodash', 'express'],
      2,
    )
    assert.equal(conflicts.length, 1)
    assert.equal(conflicts[0].type, 'typosquatting')
    assert.equal(conflicts[0].existing, 'lodash')
    assert.equal(conflicts[0].distance, 2)
  })

  test('findTyposquattingConflicts empty when no similar packages', () => {
    const conflicts = findTyposquattingConflicts(
      'react',
      ['lodash', 'express'],
      2,
    )
    assert.equal(conflicts.length, 0)
  })

  test('findDependencyConfusion flags internal name on public registry', async () => {
    const resolver = (name) =>
      Promise.resolve(name === '@mycompany/internal-pkg')
    const conflicts = await findDependencyConfusion(
      '@mycompany/internal-pkg',
      ['@mycompany/internal-pkg'],
      resolver,
    )
    assert.equal(conflicts.length, 1)
    assert.equal(conflicts[0].type, 'dependency-confusion')
  })

  test('findDependencyConfusion ignores non-internal names', async () => {
    const resolver = () => Promise.resolve(true)
    const conflicts = await findDependencyConfusion(
      'lodash',
      ['@mycompany/pkg'],
      resolver,
    )
    assert.equal(conflicts.length, 0)
  })

  test('findConflicts combines typosquatting and dependency confusion', async () => {
    const conflicts = await findConflicts('@mycompany/internl-pkg', {
      threshold: 2,
      internalNames: ['@mycompany/internl-pkg'],
      existingNames: ['@mycompany/internal-pkg'],
      publicPackagesResolver: (name) =>
        Promise.resolve(name === '@mycompany/internl-pkg'),
    })
    assert.equal(conflicts.length, 2)
    assert.ok(conflicts.some((c) => c.type === 'typosquatting'))
    assert.ok(conflicts.some((c) => c.type === 'dependency-confusion'))
  })

  test('readDeclaredPackageNames reads dependency sections', () => {
    setFsImpl(
      makeMockFs({
        '/pkg.json': JSON.stringify({
          dependencies: { lodash: '^4.0.0' },
          devDependencies: { husky: '^9.0.0' },
          peerDependencies: { react: '^18.0.0' },
          optionalDependencies: { foo: '^1.0.0' },
        }),
      }),
    )
    const names = readDeclaredPackageNames('/pkg.json')
    assert.deepEqual(names.sort(), ['foo', 'husky', 'lodash', 'react'])
  })

  test('readInstalledPackageNames reads lockfile packages', () => {
    setFsImpl(
      makeMockFs({
        '/lock.json': JSON.stringify({
          packages: {
            'node_modules/lodash': { version: '4.17.21' },
            'node_modules/@types/node': { version: '20.0.0' },
            'not-a-package': { version: '1.0.0' },
          },
        }),
      }),
    )
    const names = readInstalledPackageNames('/lock.json')
    assert.deepEqual(names.sort(), ['@types/node', 'lodash'])
  })

  test('readInstalledPackageNames reads legacy dependencies section', () => {
    setFsImpl(
      makeMockFs({
        '/lock.json': JSON.stringify({
          dependencies: {
            lodash: { version: '4.17.21' },
            express: { version: '4.18.0' },
          },
        }),
      }),
    )
    const names = readInstalledPackageNames('/lock.json')
    assert.deepEqual(names.sort(), ['express', 'lodash'])
  })

  test('readInstalledPackageNames returns empty on missing lockfile', () => {
    setFsImpl(makeMockFs({}))
    const names = readInstalledPackageNames('/missing.json')
    assert.deepEqual(names, [])
  })

  test('readDeclaredPackageNames returns empty on missing package.json', () => {
    setFsImpl(makeMockFs({}))
    const names = readDeclaredPackageNames('/missing.json')
    assert.deepEqual(names, [])
  })

  test('loadExistingNames merges declared and installed names', () => {
    setFsImpl(
      makeMockFs({
        '/package.json': JSON.stringify({ dependencies: { lodash: '^4' } }),
        '/package-lock.json': JSON.stringify({
          packages: { 'node_modules/express': { version: '4' } },
        }),
      }),
    )
    const names = loadExistingNames('/')
    assert.deepEqual(names.sort(), ['express', 'lodash'])
  })

  test('loadInternalNames reads defences.internalPackageNames', () => {
    const names = loadInternalNames({
      defences: { internalPackageNames: ['@co/pkg'] },
    })
    assert.deepEqual(names, ['@co/pkg'])
  })

  test('loadInternalNames returns empty when defences missing', () => {
    const names = loadInternalNames({})
    assert.deepEqual(names, [])
  })
})
