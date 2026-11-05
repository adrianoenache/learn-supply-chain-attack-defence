# check-external-urls

`check-external-urls.js` validates that external URLs referenced in Markdown, JSON, YAML, JavaScript, and shell files are reachable. It prevents documentation from promising broken links.

## What it does

- Discovers `http://` and `https://` URLs in tracked source files.
- Skips paths listed in the allow-list and URLs documented as known-dead.
- Checks reachability with retry, timeout, and caching.
- Reports unreachable URLs and cache statistics.

Implemented in [tools/check-external-urls.js](../../../tools/check-external-urls.js).

## Configuration

Settings live in `package.json` under `checkExternalUrls`:

```json
{
  "checkExternalUrls": {
    "ignoredDirs": ["node_modules", ".git", "coverage", ".cache", "tmp"],
    "ignoredFiles": [".external-urls-cache.json", ".defence-profile.json"],
    "cacheTtlHours": 24,
    "cacheFile": ".external-urls-cache.json",
    "timeoutMs": 15000,
    "retryMaxAttempts": 2,
    "concurrency": 10
  }
}
```

Known-dead URLs can be registered in `.github/known-dead-urls.md`.

## Usage

```bash
# Normal run (uses cache)
npm run defence:check-external-urls

# Force re-check all URLs
npm run defence:check-external-urls -- --force

# Quiet mode (exit code only; broken URLs still print)
npm run defence:check-external-urls -- --quiet
```

`--silent` is kept as a compatibility alias of `--quiet`.

## Output example

```text
  Known-dead URL(s) skipped (5):
    ○ SKIP https://example.com/old-doc (HTTP 404)

  ✓ OK   checked 101 external URL(s); all reachable (2 from cache)

── Summary ───────────────────────────────────────────
  ✓ OK   96 passed
  ○ SKIP 5 skipped
```

## Related defense layer

- Documentation quality gate.
- Enforced by `.husky/pre-commit` after documentation changes.
