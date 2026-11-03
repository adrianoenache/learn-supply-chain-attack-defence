#!/usr/bin/env node
'use strict'

// Tests for measure-ai-context.js (Fase J, item P4).
// Filesystem is injected: an in-memory layer tree replaces .github/.

const { describe, test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const SCRIPT_PATH = path.resolve(__dirname, './measure-ai-context.js')

let script
let logs
let files

function readScriptExports() {
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
}

// entryFactory mimics fs.Dirent for the fields the tool reads.
function dirEntries(names, dirs = []) {
  return [
    ...names.map((name) => ({
      name,
      isFile: () => true,
      isDirectory: () => false,
    })),
    ...dirs.map((name) => ({
      name,
      isFile: () => false,
      isDirectory: () => true,
    })),
  ]
}

beforeEach(() => {
  script = readScriptExports()
  logs = []
  // Fixture tree: always-on (100 bytes), 2 instructions, 1 skill with a
  // SKILL.md in its subfolder, plus noise that must be ignored.
  files = new Map([
    ['.github/copilot-instructions.md', 'x'.repeat(100)],
    ['.github/instructions/a.instructions.md', 'x'.repeat(50)],
    ['.github/instructions/b.instructions.md', 'x'.repeat(50)],
    ['.github/skills/demo/SKILL.md', 'x'.repeat(200)],
    ['.github/skills/README.md', 'ignored-by-filter'],
    ['.github/hooks/hook.json', '{}'],
  ])
  script.setImpls({
    readFile: (p) => {
      const rel = path.relative(path.resolve(__dirname, '..'), p)
      if (!files.has(rel)) throw new Error(`unexpected read: ${rel}`)
      return files.get(rel)
    },
    listDir: (dir) => {
      const rel = path.relative(path.resolve(__dirname, '..'), dir)
      if (rel.endsWith('instructions'))
        return dirEntries(['a.instructions.md', 'b.instructions.md'])
      if (rel.endsWith('agents')) return dirEntries([])
      if (rel.endsWith('skills')) return dirEntries(['README.md'], ['demo'])
      if (rel.endsWith(path.join('skills', 'demo')))
        return dirEntries(['SKILL.md'])
      if (rel.endsWith('hooks')) return dirEntries(['hook.json'])
      throw new Error(`unexpected listDir: ${rel}`)
    },
    log: (...args) => logs.push(args.join(' ')),
  })
})

afterEach(() => {
  script.resetImpls()
})

describe('measure-ai-context', () => {
  test('collects bytes per layer with the SKILL.md/JSON filters', () => {
    const layers = script.collect()
    assert.equal(layers.alwaysOn.bytes, 100)
    assert.equal(layers.instructions.bytes, 100)
    assert.equal(layers.instructions.files, 2)
    // README.md inside skills/ is excluded; only SKILL.md files count.
    assert.equal(layers.skills.bytes, 200)
    assert.equal(layers.skills.files, 1)
    assert.equal(layers.hooks.bytes, 2)
  })

  test('prints the per-layer table with token estimates', () => {
    script.main([])
    assert.ok(logs.some((l) => l.includes('alwaysOn')))
    assert.ok(logs.some((l) => l.includes('~25 tokens'))) // 100 bytes / 4
    assert.ok(logs.some((l) => l.includes('on demand')))
  })

  test('--format json emits machine-readable totals', () => {
    script.main(['--format', 'json'])
    const report = JSON.parse(logs.join('\n'))
    assert.equal(report.totalBytes, 402)
    assert.equal(report.approxTokens, Math.round(402 / script.BYTES_PER_TOKEN))
    assert.equal(report.bytesPerTokenHeuristic, 4)
  })
})
