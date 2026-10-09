// test-template.js — Skeleton for a defense-script test file.
//
// Copy this file next to the tool under test as `<tool>.test.js` and fill in
// the TODOs. This template encodes the project's testing conventions; see
// .github/instructions/testing.instructions.md for the full rules.
//
// Conventions baked in:
//   - node:test + node:assert/strict only (no third-party test frameworks).
//   - Dependency injection via the module's set*Impl / reset*Impl hooks.
//   - Explicit timeout on every test (prevents hangs).
//   - Hardcoded fixture values carry an inline justification comment.

const { test, describe } = require('node:test')
// `assert` is intentionally imported even though the TODO body does not use it
// yet: this is a teaching template, and generated tests must start with the
// strict assertion library available. The lint rule is disabled for this file
// via a justified override in biome.json.
const assert = require('node:assert/strict')
const path = require('node:path')

const SCRIPT_PATH = path.resolve(__dirname, 'TOOL_NAME.js') // TODO: tool under test

function readScriptExports() {
  // Load the module fresh per test so DI state never leaks between tests.
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
}

describe('TOOL_NAME', () => {
  test('happy path: TODO describe the main behavior', {
    timeout: 5000,
  }, async () => {
    const mod = readScriptExports()
    // TODO: inject fakes via mod.set*Impl({ ... })
    try {
      // Arrange
      // Act
      // Assert
    } finally {
      mod.resetImpls?.() // reset whichever setters were used
    }
  })

  test('edge case: TODO describe the boundary condition', {
    timeout: 5000,
  }, async () => {
    const mod = readScriptExports()
    try {
      // Arrange / Act / Assert
    } finally {
      mod.resetImpls?.()
    }
  })

  test('error path: TODO describe the failure mode', {
    timeout: 5000,
  }, async () => {
    const mod = readScriptExports()
    try {
      // Assert the actionable error message or the expected exit code
    } finally {
      mod.resetImpls?.()
    }
  })
})
