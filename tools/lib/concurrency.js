// lib/concurrency.js — Shared bounded-concurrency runner for defence tools.
//
// Why this file exists: check-updates.js and check-package-age.js carried
// byte-identical copies of this helper, and trust-engine.js referenced the
// same shape. Duplicated logic drifts; a single shared implementation keeps
// the behavior (and any future fix) consistent across every tool that talks
// to the npm registry in parallel.
//
// Contract:
//   - Input: an array of zero-arg async task functions and a positive limit.
//   - Output: Promise resolving to an array of settled results in input order,
//     each `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }`.
//   - Never rejects the aggregate promise: individual failures are captured
//     per task so one slow/failing registry call does not abort the others.
//   - No timeout here by design: each task is responsible for its own timeout
//     (the retry-fetch layer already enforces one per network call).

function runWithConcurrencyLimit(tasks, limit) {
  return new Promise((resolve) => {
    if (tasks.length === 0) return resolve([])
    const results = new Array(tasks.length)
    let started = 0
    let completed = 0

    function runNext() {
      if (started >= tasks.length) return
      const index = started++
      Promise.resolve()
        .then(() => tasks[index]())
        .then(
          (value) => {
            results[index] = { status: 'fulfilled', value }
            onDone()
          },
          (reason) => {
            results[index] = { status: 'rejected', reason }
            onDone()
          },
        )
    }

    function onDone() {
      completed++
      if (completed === tasks.length) {
        resolve(results)
        return
      }
      runNext()
    }

    const initial = Math.min(limit, tasks.length)
    for (let i = 0; i < initial; i++) runNext()
  })
}

module.exports = { runWithConcurrencyLimit }
