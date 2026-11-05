// Tests for tools/lib/formatters.js — the shared output primitives of Phase N.
//
// These tests pin the exact output contract (symbols, column alignment,
// summary shape) because every defence tool will rely on it: a drift here
// breaks CI log greppability across the whole toolset at once.

const { describe, test } = require('node:test')
const assert = require('node:assert/strict')

const {
  SYMBOLS,
  LABELS,
  hasQuietFlag,
  supportsColor,
  paint,
  formatItem,
  formatSection,
  renderSummary,
} = require('./formatters.js')

// ESC prefix used by paint(); built explicitly so assertions read clearly.
const ESC = '\u001B'

describe('status vocabulary', () => {
  test('exposes the four canonical statuses', () => {
    assert.deepEqual(Object.keys(SYMBOLS), ['pass', 'fail', 'warn', 'skip'])
    assert.deepEqual(Object.keys(LABELS), ['pass', 'fail', 'warn', 'skip'])
  })

  test('labels are stable ASCII so CI logs stay greppable', () => {
    assert.deepEqual(LABELS, {
      pass: 'OK',
      fail: 'FAIL',
      warn: 'WARN',
      skip: 'SKIP',
    })
  })
})

describe('hasQuietFlag', () => {
  test('accepts --quiet as the documented flag', () => {
    assert.equal(hasQuietFlag(['--quiet']), true)
  })

  test('accepts --silent as a compatibility alias', () => {
    assert.equal(hasQuietFlag(['--silent']), true)
  })

  test('returns false when neither flag is present', () => {
    assert.equal(hasQuietFlag(['--fix', '--format', 'json']), false)
    assert.equal(hasQuietFlag([]), false)
  })
})

describe('supportsColor', () => {
  test('is enabled for an interactive terminal', () => {
    assert.equal(supportsColor({ isTTY: true }, {}), true)
  })

  test('is disabled when output is piped (not a TTY)', () => {
    assert.equal(supportsColor({ isTTY: false }, {}), false)
  })

  test('NO_COLOR wins over TTY and FORCE_COLOR (no-color.org)', () => {
    assert.equal(
      supportsColor({ isTTY: true }, { NO_COLOR: '1', FORCE_COLOR: '1' }),
      false,
    )
  })

  test('FORCE_COLOR (non-zero) enables color without a TTY', () => {
    assert.equal(supportsColor({ isTTY: false }, { FORCE_COLOR: '1' }), true)
  })

  test('FORCE_COLOR=0 does not force color', () => {
    assert.equal(supportsColor({ isTTY: false }, { FORCE_COLOR: '0' }), false)
  })
})

describe('paint', () => {
  test('returns text untouched when color is disabled', () => {
    assert.equal(paint('✓ OK', 'pass', false), '✓ OK')
  })

  test('wraps text in the status SGR color when enabled', () => {
    assert.equal(paint('✓ OK', 'pass', true), `${ESC}[32m✓ OK${ESC}[0m`)
    assert.equal(paint('✗ FAIL', 'fail', true), `${ESC}[31m✗ FAIL${ESC}[0m`)
    assert.equal(paint('⚠ WARN', 'warn', true), `${ESC}[33m⚠ WARN${ESC}[0m`)
    assert.equal(paint('○ SKIP', 'skip', true), `${ESC}[90m○ SKIP${ESC}[0m`)
  })
})

describe('formatItem', () => {
  test('aligns messages by padding labels to the longest label', () => {
    // 'OK' padded to 4 chars keeps the message column aligned with FAIL/WARN/SKIP.
    assert.equal(formatItem('pass', 'all good'), '  ✓ OK   all good')
    assert.equal(formatItem('fail', 'broke'), '  ✗ FAIL broke')
    assert.equal(formatItem('warn', 'careful'), '  ⚠ WARN careful')
    assert.equal(formatItem('skip', 'later'), '  ○ SKIP later')
  })

  test('supports deeper indentation for items nested under a section', () => {
    assert.equal(
      formatItem('fail', 'evil@1.0.0', { indent: 4 }),
      '    ✗ FAIL evil@1.0.0',
    )
  })

  test('colorizes only the status head, never the message', () => {
    const line = formatItem('pass', 'msg', { color: true })
    assert.equal(line, `  ${ESC}[32m✓ OK  ${ESC}[0m msg`)
  })
})

describe('formatSection', () => {
  test('renders a titled group header with a count', () => {
    assert.equal(formatSection('Prohibited', 2), '\n  Prohibited (2):')
  })

  test('omits the count when not provided', () => {
    assert.equal(formatSection('Details'), '\n  Details:')
  })
})

describe('renderSummary', () => {
  test('always shows passed, omits zero-count groups', () => {
    const out = renderSummary({ passed: 3 })
    assert.ok(out.includes('✓ OK   3 passed'))
    assert.ok(!out.includes('failed'))
    assert.ok(!out.includes('warned'))
    assert.ok(!out.includes('skipped'))
  })

  test('shows every non-zero group in canonical order', () => {
    const out = renderSummary({ passed: 1, failed: 2, warned: 3, skipped: 4 })
    const iPass = out.indexOf('1 passed')
    const iFail = out.indexOf('2 failed')
    const iWarn = out.indexOf('3 warned')
    const iSkip = out.indexOf('4 skipped')
    assert.ok(iPass !== -1 && iFail !== -1 && iWarn !== -1 && iSkip !== -1)
    assert.ok(iPass < iFail && iFail < iWarn && iWarn < iSkip)
  })

  test('shows passed even when zero, so a total failure reads complete', () => {
    const out = renderSummary({ failed: 1 })
    assert.ok(out.includes('✓ OK   0 passed'))
    assert.ok(out.includes('✗ FAIL 1 failed'))
  })

  test('appends the next suggested command when provided', () => {
    const out = renderSummary({ failed: 1, next: 'npm ci' })
    assert.ok(out.includes('  Next: npm ci'))
  })

  test('omits the Next line when there is nothing to suggest', () => {
    assert.ok(!renderSummary({ passed: 2 }).includes('Next:'))
  })

  test('starts with a fixed-width divider and ends with a newline', () => {
    const out = renderSummary({ passed: 1 })
    const firstLine = out.split('\n')[1]
    assert.ok(firstLine.startsWith('── Summary ─'))
    // 54 is the fixed cosmetic divider width documented in formatters.js.
    assert.equal(firstLine.length, 54)
    assert.ok(out.endsWith('\n'))
  })

  test('colorizes group heads without touching counts', () => {
    const out = renderSummary({ passed: 2, color: true })
    assert.ok(out.includes(`${ESC}[32m✓ OK  ${ESC}[0m 2 passed`))
  })
})
