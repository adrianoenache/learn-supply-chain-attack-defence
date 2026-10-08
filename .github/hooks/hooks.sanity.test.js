// hooks.sanity.test.js — Sanity tests for .github/hooks/*.json hook configs.
//
// Why this file exists: the GitHub Copilot hooks loader drops malformed hook
// items silently (only logging them), so a broken hook can fail open at
// runtime without anyone noticing. These tests fail loudly in `npm test`
// instead. Reference: https://docs.github.com/en/copilot/reference/hooks-reference
//
// Rules enforced:
//   - Every .github/hooks/*.json parses and declares { version: 1, hooks }.
//   - Event names belong to the documented set (preToolUse, postToolUse,
//     sessionStart, etc.).
//   - Command hooks define type "command", one of bash/powershell/command/exec,
//     and a positive timeoutSec when present.
//   - Every bash/powershell/command string that invokes a script under
//     .github/hooks/scripts/ points to a file that exists.
//   - Every .github/skills/<name>/ path mentioned in a script message points
//     to a skill that exists (stale references teach agents wrong paths).

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const HOOKS_DIR = path.resolve(__dirname)
const SCRIPTS_DIR = path.join(HOOKS_DIR, 'scripts')
const SKILLS_DIR = path.resolve(HOOKS_DIR, '../skills')

// Events documented in the Copilot hooks reference as of VS Code 1.141 /
// Copilot CLI 2026-10. The set is intentionally explicit: a typo like
// "postTooluse" must fail here instead of silently never firing.
const KNOWN_EVENTS = new Set([
  'sessionStart',
  'sessionEnd',
  'userPromptSubmitted',
  'preToolUse',
  'postToolUse',
  'postToolUseFailure',
  'permissionRequest',
  'notification',
  'preCompact',
  'stop',
  'subagentStop',
])

// Fields allowed on a command hook item per the hooks reference.
const COMMAND_FIELDS = new Set([
  'type',
  'matcher',
  'bash',
  'powershell',
  'command',
  'exec',
  'args',
  'cwd',
  'env',
  'timeout',
  'timeoutSec',
])

function listHookFiles() {
  return fs
    .readdirSync(HOOKS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
}

function commandStrings(item) {
  return ['bash', 'powershell', 'command']
    .filter((k) => item[k])
    .map((k) => item[k])
}

describe('hooks sanity', () => {
  const hookFiles = listHookFiles()

  it('should find at least one hook file', () => {
    assert.ok(hookFiles.length > 0, `no hook files found in ${HOOKS_DIR}`)
  })

  for (const file of hookFiles) {
    describe(file, () => {
      let config
      const fullPath = path.join(HOOKS_DIR, file)

      it('should be parseable JSON with version 1 and a hooks object', () => {
        config = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
        assert.equal(config.version, 1, `${file}: version must be 1`)
        assert.ok(
          config.hooks &&
            typeof config.hooks === 'object' &&
            !Array.isArray(config.hooks),
          `${file}: missing hooks object`,
        )
      })

      it('should use only documented event names with array values', () => {
        for (const [event, items] of Object.entries(config.hooks)) {
          assert.ok(
            KNOWN_EVENTS.has(event),
            `${file}: unknown event "${event}"`,
          )
          assert.ok(
            Array.isArray(items),
            `${file}: "${event}" must be an array`,
          )
          assert.ok(items.length > 0, `${file}: "${event}" must not be empty`)
        }
      })

      it('should define valid command hook items', () => {
        for (const [event, items] of Object.entries(config.hooks)) {
          for (const [index, item] of items.entries()) {
            const label = `${file}: ${event}[${index}]`
            assert.equal(
              item.type ?? 'command',
              'command',
              `${label}: unsupported type`,
            )

            const commands = commandStrings(item)
            if (item.exec) {
              assert.equal(
                commands.length,
                0,
                `${label}: exec cannot be combined with shell fields`,
              )
            } else {
              assert.ok(
                commands.length > 0,
                `${label}: needs one of bash/powershell/command`,
              )
            }

            for (const field of Object.keys(item)) {
              assert.ok(
                COMMAND_FIELDS.has(field),
                `${label}: unsupported field "${field}"`,
              )
            }

            if ('timeoutSec' in item) {
              assert.ok(
                Number.isFinite(item.timeoutSec) && item.timeoutSec > 0,
                `${label}: timeoutSec must be a positive number`,
              )
            }
          }
        }
      })

      it('should reference only existing hook scripts', () => {
        for (const items of Object.values(config.hooks)) {
          for (const item of items) {
            for (const command of commandStrings(item)) {
              // Extract paths that point into .github/hooks/scripts/.
              const matches =
                command.match(/\.github\/hooks\/scripts\/[^\s"']+/g) ?? []
              for (const scriptPath of matches) {
                const resolved = path.resolve(HOOKS_DIR, '../..', scriptPath)
                assert.ok(
                  fs.existsSync(resolved),
                  `${file}: referenced script does not exist: ${scriptPath}`,
                )
              }
            }
          }
        }
      })
    })
  }

  describe('hook scripts', () => {
    it('should mention only existing skills', () => {
      const scriptFiles = fs
        .readdirSync(SCRIPTS_DIR)
        .filter((f) => f.endsWith('.sh'))
      for (const script of scriptFiles) {
        const content = fs.readFileSync(path.join(SCRIPTS_DIR, script), 'utf8')
        const mentioned =
          content.match(/\.github\/skills\/([a-z0-9-]+)\//g) ?? []
        for (const ref of mentioned) {
          const name = ref.split('/')[2]
          assert.ok(
            fs.existsSync(path.join(SKILLS_DIR, name, 'SKILL.md')),
            `${script}: references missing skill "${name}"`,
          )
        }
      }
    })
  })
})
