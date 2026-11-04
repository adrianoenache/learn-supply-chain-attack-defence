#!/usr/bin/env node
'use strict'

// Tests for lib/concurrency.js — the shared bounded-concurrency runner.
// These cover the contract every registry-parallel tool relies on: order is
// preserved, the limit is never exceeded, and individual failures settle as
// rejected results instead of aborting the batch.

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const { runWithConcurrencyLimit } = require('./concurrency.js')

describe('lib/concurrency', () => {
  it('resolves an empty task list', async () => {
    assert.deepEqual(await runWithConcurrencyLimit([], 5), [])
  })

  it('preserves input order even when tasks finish out of order', async () => {
    // The 20/0 ms delays are the smallest values that reliably invert the
    // completion order on any machine; they exist only to force the inversion.
    const tasks = [
      async () => {
        await new Promise((r) => setTimeout(r, 20))
        return 'slow-first'
      },
      async () => 'fast-second',
    ]
    const results = await runWithConcurrencyLimit(tasks, 2)
    assert.deepEqual(
      results.map((r) => r.value),
      ['slow-first', 'fast-second'],
    )
  })

  it('never exceeds the concurrency limit', async () => {
    let running = 0
    let peak = 0
    const tasks = Array.from({ length: 10 }, () => async () => {
      running++
      peak = Math.max(peak, running)
      await new Promise((r) => setTimeout(r, 5))
      running--
    })
    await runWithConcurrencyLimit(tasks, 3)
    assert.ok(peak <= 3, `peak concurrency ${peak} exceeded the limit of 3`)
  })

  it('captures rejections per task without aborting the batch', async () => {
    const tasks = [
      async () => 'ok-1',
      async () => {
        throw new Error('boom')
      },
      async () => 'ok-3',
    ]
    const results = await runWithConcurrencyLimit(tasks, 2)
    assert.equal(results[0].status, 'fulfilled')
    assert.equal(results[1].status, 'rejected')
    assert.equal(results[1].reason.message, 'boom')
    assert.equal(results[2].status, 'fulfilled')
  })

  it('handles a limit larger than the task count', async () => {
    const tasks = [async () => 1, async () => 2]
    const results = await runWithConcurrencyLimit(tasks, 100)
    assert.deepEqual(
      results.map((r) => r.value),
      [1, 2],
    )
  })
})
