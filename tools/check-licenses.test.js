#!/usr/bin/env node
'use strict'

const { describe, test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const SCRIPT_PATH = path.resolve(__dirname, './check-licenses.js')

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

  test('extracts real package name from nested node_modules paths', () => {
    setImpls({
      fs: mockFsForLockfile({
        packages: {
          'node_modules/string-width': { version: '5.0.0', license: 'MIT' },
          'node_modules/cliui/node_modules/string-width': {
            version: '4.2.3',
            license: 'MIT',
          },
          'node_modules/@scope/pkg': { version: '1.0.0', license: 'MIT' },
        },
      }),
    })
    try {
      const packages = readLockfilePackages(LOCKFILE_PATH)
      assert.equal(packages.length, 3)
      assert.ok(
        packages.some(
          (p) => p.name === 'string-width' && p.version === '5.0.0',
        ),
      )
      assert.ok(
        packages.some(
          (p) => p.name === 'string-width' && p.version === '4.2.3',
        ),
      )
      assert.ok(packages.some((p) => p.name === '@scope/pkg'))
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
    const logs = []
    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))
    try {
      assert.equal(main(['--format=json']), 0)
      const parsed = JSON.parse(logs.join('\n'))
      assert.deepEqual(
        parsed.allowed.map((i) => i.name),
        ['foo'],
      )
    } finally {
      console.log = originalLog
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

  test('single package mode supports scoped packages', () => {
    setImpls({
      fs: mockFsForLockfile({
        packages: {
          'node_modules/@scope/pkg': { version: '1.0.0', license: 'MIT' },
        },
      }),
    })
    try {
      assert.equal(main(['--pkg=@scope/pkg@1.0.0', '--silent']), 0)
    } finally {
      resetImpls()
    }
  })

  test('single package mode supports scoped package without version', () => {
    setImpls({
      fs: mockFsForLockfile({
        packages: {
          'node_modules/@scope/pkg': { version: '1.0.0', license: 'MIT' },
        },
      }),
    })
    try {
      assert.equal(main(['--pkg=@scope/pkg', '--silent']), 0)
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

  test('returns 1 with --fail when missing license exists', () => {
    setImpls({
      fs: mockFsForLockfile({
        packages: {
          'node_modules/missing-license': { version: '1.0.0', license: null },
        },
      }),
    })
    try {
      assert.equal(main(['--fail', '--silent']), 1)
    } finally {
      resetImpls()
    }
  })

  test('markdown format prints report', () => {
    setImpls({
      fs: mockFsForLockfile({
        packages: {
          'node_modules/foo': { version: '1.0.0', license: 'MIT' },
          'node_modules/bar': { version: '2.0.0', license: 'GPL-3.0' },
          'node_modules/baz': { version: '3.0.0', license: 'Custom' },
        },
      }),
    })
    const logs = []
    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))
    try {
      assert.equal(main(['--format=markdown']), 0)
      const output = logs.join('\n')
      assert.ok(output.includes('Dependency License Report'))
      assert.ok(output.includes('Prohibited'))
      assert.ok(output.includes('Flagged for review'))
      assert.ok(output.includes('Allowed'))
    } finally {
      console.log = originalLog
      resetImpls()
    }
  })

  test('table format prints report', () => {
    setImpls({
      fs: mockFsForLockfile({
        packages: {
          'node_modules/foo': { version: '1.0.0', license: 'MIT' },
          'node_modules/bar': { version: '2.0.0', license: 'GPL-3.0' },
          'node_modules/baz': { version: '3.0.0', license: 'Custom' },
        },
      }),
    })
    const logs = []
    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))
    try {
      assert.equal(main([]), 0)
      assert.ok(logs.some((line) => line.includes('Dependency license check')))
      assert.ok(logs.some((line) => line.includes('Prohibited')))
      assert.ok(logs.some((line) => line.includes('Flagged for review')))
      assert.ok(logs.some((line) => line.includes('Allowed')))
    } finally {
      console.log = originalLog
      resetImpls()
    }
  })

  test('CLI exits 0 when checking real lockfile', () => {
    const result = spawnSync(process.execPath, [SCRIPT_PATH, '--silent'], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 0)
  })
})
