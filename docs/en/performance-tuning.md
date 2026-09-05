# Performance Tuning

This repository uses registry cache settings, explicit timeouts, and retries to keep installs fast and resilient. Performance is measured with built-in benchmarks.

## Registry cache, timeout, and retries

Network behavior is configured in two places:

- `.npmrc` — npm client settings such as registry URL, cache path, fetch timeout, and retry limits.
- `tools/lib/registry-cache.js` — the local registry cache helper used by tooling.

Together they reduce repeated network requests and prevent installs from hanging when a registry is slow.

## Running benchmarks

Baseline benchmark:

```bash
npm run defence:perf:baseline
```

Current benchmark:

```bash
npm run defence:perf
```

## Interpreting results

Compare the current run against the baseline. Watch for:

- Increased install time
- Higher retry counts
- Larger cache misses

A significant regression usually points to a network change, a new heavy dependency, or a cache misconfiguration.

## Tips for large dependency trees

- Keep `node_modules` pinned with a lockfile and install with `npm ci`.
- Use the local registry cache when running repeated installs.
- Run benchmarks before and after adding large dependencies.
- Review [npmrc-hardening.md](npmrc-hardening.md) for hardening settings that also improve reliability.
