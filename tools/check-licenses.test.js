#!/usr/bin/env node
'use strict'

const { describe, test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const {
  main,
  parseCliArgs,
  classifyLicense,
  classifySingleLicense,
  normalizeLicense,
  readLockfilePackages,
  buildReport,
  setImpls,
  resetImpls,
} = require('./check-licenses.js')

const LOCKFILE_PATH = path.resolve(process.cwd(), 'package-lock.json')

function mockFs(files) {
  return {
    readFileSync: (filePath) => {
      if (!(filePath in files)) {
        const err = new Error(`ENOENT: ${filePath}`)
        err.code = 'ENOENT'
        throw err
      }
      return files[filePath]
    },
  }
}

function mockFsForLockfile(lockfile) {
  return mockFs({ [LOCKFILE_PATH]: JSON.stringify(lockfile) })
}

function mockExit() {
  let code = null
  const fn = (exitCode) => {
    code = exitCode
    return exitCode
  }
  fn.code = () => code
  return fn
}

describe('parseCliArgs', () => {
  test('defaults to table format and non-failing', () => {
    const args = parseCliArgs([])
    assert.equal(args.isFail, false)
    assert.equal(args.isSilent, false)
    assert.equal(args.isTransitive, false)
    assert.equal(args.format, 'table')
    assert.equal(args.singlePackage, null)
  })

  test('parses all flags', () => {
    const args = parseCliArgs([
      '--fail',
      '--silent',
      '--transitive',
      '--format=json',
      '--pkg=foo@1.0.0',
    ])
    assert.equal(args.isFail, true)
    assert.equal(args.isSilent, true)
    assert.equal(args.isTransitive, true)
    assert.equal(args.format, 'json')
    assert.equal(args.singlePackage, 'foo@1.0.0')
  })

  test('rejects invalid format', () => {
    assert.throws(() => parseCliArgs(['--format=xml']), /Invalid format/)
  })
})

describe('normalizeLicense', () => {
  test('lowercases and trims', () => {
    assert.equal(normalizeLicense('  MIT  '), 'mit')
  })
})

describe('classifySingleLicense', () => {
  test('allows MIT', () => {
    assert.equal(classifySingleLicense('MIT').status, 'allowed')
  })

  test('prohibits GPL-3.0', () => {
    assert.equal(classifySingleLicense('GPL-3.0').status, 'prohibited')
  })

  test('flags unknown license', () => {
    assert.equal(classifySingleLicense('Custom-License').status, 'flagged')
  })
})

describe('classifyLicense with SPDX expressions', () => {
  test('allows MIT OR Apache-2.0', () => {
    assert.equal(classifyLicense('MIT OR Apache-2.0').status, 'allowed')
  })

  test('flags unknown OR unknown', () => {
    assert.equal(classifyLicense('Custom-A OR Custom-B').status, 'flagged')
  })

  test('prohibits if any OR branch is prohibited', () => {
    assert.equal(classifyLicense('MIT OR GPL-3.0').status, 'prohibited')
  })

  test('allows MIT AND ISC', () => {
    assert.equal(classifyLicense('MIT AND ISC').status, 'allowed')
  })

  test('prohibits MIT AND GPL-3.0', () => {
    assert.equal(classifyLicense('MIT AND GPL-3.0').status, 'prohibited')
  })

  test('flags missing license', () => {
    const result = classifyLicense(null)
    assert.equal(result.status, 'flagged')
    assert.equal(result.reason, 'missing license')
  })
})

describe('buildReport', () => {
  test('sorts packages into allowed, flagged, and prohibited', () => {
    const packages = [
      { name: 'mit-pkg', version: '1.0.0', license: 'MIT' },
      { name: 'gpl-pkg', version: '2.0.0', license: 'GPL-3.0' },
      { name: 'unknown-pkg', version: '3.0.0', license: 'Unknown' },
    ]
    const report = buildReport(packages)
    assert.equal(report.allowed.length, 1)
    assert.equal(report.prohibited.length, 1)
    assert.equal(report.flagged.length, 1)
    assert.equal(report.allowed[0].name, 'mit-pkg')
    assert.equal(report.prohibited[0].name, 'gpl-pkg')
    assert.equal(report.flagged[0].name, 'unknown-pkg')
  })
})

describe('readLockfilePackages', () => {
  test('reads packages from the configured lockfile path', () => {
    setImpls({
      fs: mockFsForLockfile({
        packages: { 'node_modules/foo': { version: '1.0.0', license: 'MIT' } },
      }),
    })
    try {
      const packages = readLockfilePackages(LOCKFILE_PATH)
      assert.equal(packages.length, 1)
      assert.equal(packages[0].name, 'foo')
    } finally {
      resetImpls()
    }
  })
})

describe('main with mock lockfile', () => {
  test('returns 0 when all licenses are allowed', () => {
    const exit = mockExit()
    setImpls({
      fs: mockFsForLockfile({
        packages: {
          'node_modules/foo': { version: '1.0.0', license: 'MIT' },
          'node_modules/bar': { version: '2.0.0', license: 'ISC' },
        },
      }),
      exit,
    })
    try {
      assert.equal(main(['--silent']), 0)
    } finally {
      resetImpls()
    }
  })

  test('returns 0 by default when prohibited license exists', () => {
    setImpls({
      fs: mockFsForLockfile({
        packages: {
          'node_modules/gpl-pkg': { version: '1.0.0', license: 'GPL-3.0' },
        },
      }),
    })
    try {
      assert.equal(main(['--silent']), 0)
    } finally {
      resetImpls()
    }
  })

  test('returns 1 with --fail when prohibited license exists', () => {
    setImpls({
      fs: mockFsForLockfile({
        packages: {
          'node_modules/gpl-pkg': { version: '1.0.0', license: 'GPL-3.0' },
        },
      }),
    })
    try {
      assert.equal(main(['--fail', '--silent']), 1)
    } finally {
      resetImpls()
    }
  })

  test('returns 1 with --fail when unknown license exists', () => {
    setImpls({
      fs: mockFsForLockfile({
        packages: {
          'node_modules/unknown-pkg': { version: '1.0.0', license: 'Custom' },
        },
      }),
    })
    try {
      assert.equal(main(['--fail', '--silent']), 1)
    } finally {
      resetImpls()
    }
  })

  test('json format returns 0 with valid JSON', () => {
    setImpls({
      fs: mockFsForLockfile({
        packages: {
          'node_modules/foo': { version: '1.0.0', license: 'MIT' },
        },
      }),
    })
    try {
      assert.equal(main(['--format=json', '--silent']), 0)
    } finally {
      resetImpls()
    }
  })

  test('single package mode finds and checks one package', () => {
    setImpls({
      fs: mockFsForLockfile({
        packages: {
          'node_modules/foo': { version: '1.0.0', license: 'MIT' },
          'node_modules/bar': { version: '2.0.0', license: 'GPL-3.0' },
        },
      }),
    })
    try {
      assert.equal(main(['--pkg=foo@1.0.0', '--silent']), 0)
      assert.equal(main(['--pkg=bar@2.0.0', '--fail', '--silent']), 1)
    } finally {
      resetImpls()
    }
  })

  test('single package mode returns 1 when package is not found', () => {
    const exit = mockExit()
    setImpls({
      fs: mockFsForLockfile({
        packages: {
          'node_modules/foo': { version: '1.0.0', license: 'MIT' },
        },
      }),
      exit,
    })
    try {
      assert.equal(main(['--pkg=missing@1.0.0', '--silent']), 1)
      assert.equal(exit.code(), 1)
    } finally {
      resetImpls()
    }
  })

  test('returns 0 when lockfile has no packages', () => {
    setImpls({ fs: mockFsForLockfile({}) })
    try {
      assert.equal(main(['--silent']), 0)
    } finally {
      resetImpls()
    }
  })
})
