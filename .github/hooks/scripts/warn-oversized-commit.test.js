#!/usr/bin/env node
'use strict'

// Tests for warn-oversized-commit.sh (Fase AI-4.1).
// Subprocess tests exercise the hook exactly as the runtime invokes it —
// JSON on stdin, decision JSON on stdout — against throwaway git repos so
// the staged-diff measurement is real, not mocked.

const { describe, test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const { execFileSync, execSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const SCRIPT = path.resolve(__dirname, './warn-oversized-commit.sh')

// Hook scripts now emit observability events; point the log at a throwaway
// file so the suite never pollutes the real (gitignored) observability.jsonl.
const OBS_LOG = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), 'obs-test-')),
  'observability.jsonl',
)
const tempDirs = []

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woc-test-'))
  tempDirs.push(dir)
  const git = (args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' })
  git(['init', '-q'])
  // RFC 2606 reserved TLD — intentionally not a real address (test fixture).
  git(['config', 'user.email', 'test@example.invalid'])
  git(['config', 'user.name', 'Hook Test'])
  fs.writeFileSync(path.join(dir, 'README.md'), '# tmp\n')
  git(['add', '.'])
  git(['commit', '-q', '-m', 'init'])
  return { dir, git }
}

function runHook(cwd, command, env = {}) {
  const input = JSON.stringify({
    toolName: 'bash',
    toolArgs: JSON.stringify({ command }),
  })
  const output = execSync(`bash "${SCRIPT}"`, {
    input,
    encoding: 'utf8',
    timeout: 10000, // cold git + node spawns on loaded machines
    cwd,
    env: { ...process.env, OBS_LOG_FILE: OBS_LOG, ...env },
  }).trim()
  return JSON.parse(output)
}

function stageFile(git, dir, relativePath, content = 'x\n') {
  const absolute = path.join(dir, relativePath)
  fs.mkdirSync(path.dirname(absolute), { recursive: true })
  fs.writeFileSync(absolute, content)
  git(['add', relativePath])
}

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true })
  }
})

describe('warn-oversized-commit.sh', () => {
  test('ignores non-commit commands', () => {
    const { dir } = makeRepo()
    const output = runHook(dir, 'git status --short')
    assert.deepEqual(output, {})
  })

  test('allows a small single-domain commit', () => {
    const { dir, git } = makeRepo()
    stageFile(git, dir, 'tools/new-tool.js')
    stageFile(git, dir, 'tools/new-tool.test.js')
    const output = runHook(dir, 'git commit -m "feat: add tool"')
    assert.deepEqual(output, {})
  })

  test('warns when the staged file count exceeds the threshold', () => {
    const { dir, git } = makeRepo()
    stageFile(git, dir, 'tools/a.js')
    stageFile(git, dir, 'tools/b.js')
    stageFile(git, dir, 'tools/c.js')
    const output = runHook(dir, 'git commit -m "x"', {
      WARN_COMMIT_MAX_FILES: '2',
    })
    assert.ok(output.additionalContext.includes('3 files'))
    assert.ok(output.additionalContext.includes('advisory'))
  })

  test('warns when the changed-line count exceeds the threshold', () => {
    const { dir, git } = makeRepo()
    stageFile(git, dir, 'tools/big.js', 'line\n'.repeat(8))
    const output = runHook(dir, 'git commit -m "x"', {
      WARN_COMMIT_MAX_LINES: '5',
    })
    assert.ok(output.additionalContext.includes('8 changed lines'))
  })

  test('warns when the staged diff spans more than two domains', () => {
    const { dir, git } = makeRepo()
    stageFile(git, dir, 'tools/tool.js')
    stageFile(git, dir, '.github/hooks/hook.json')
    stageFile(git, dir, 'docs/en/page.md')
    const output = runHook(dir, 'git commit -m "x"')
    assert.ok(output.additionalContext.includes('3 domain(s)'))
    assert.ok(output.additionalContext.includes('one commit = one intent'))
  })

  test('counts a bilingual docs pair as a single domain', () => {
    const { dir, git } = makeRepo()
    stageFile(git, dir, 'docs/en/page.md')
    stageFile(git, dir, 'docs/pt-BR/page.md')
    const output = runHook(dir, 'git commit -m "docs: bilingual pair"')
    assert.deepEqual(output, {})
  })

  test('includes unstaged tracked changes for git commit -a', () => {
    const { dir, git } = makeRepo()
    // Tracked files across three domains, committed in the initial state.
    stageFile(git, dir, 'tools/tool.js')
    stageFile(git, dir, '.github/config.json')
    stageFile(git, dir, 'docs/en/page.md')
    git(['commit', '-q', '-m', 'add tracked files'])
    // Modify all three without staging; -a picks them up at commit time.
    fs.appendFileSync(path.join(dir, 'tools/tool.js'), 'y\n')
    fs.appendFileSync(path.join(dir, '.github/config.json'), '{}\n')
    fs.appendFileSync(path.join(dir, 'docs/en/page.md'), 'z\n')
    const output = runHook(dir, 'git commit -am "x"')
    assert.ok(output.additionalContext.includes('3 domain(s)'))
  })

  test('stays silent outside a git work tree', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woc-plain-'))
    tempDirs.push(dir)
    const output = runHook(dir, 'git commit -m "x"')
    assert.deepEqual(output, {})
  })

  test('stays silent when nothing is staged (git reports it itself)', () => {
    const { dir } = makeRepo()
    const output = runHook(dir, 'git commit -m "x"')
    assert.deepEqual(output, {})
  })
})
