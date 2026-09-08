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
    "cacheTtlHours": 24,
    "timeoutMs": 15000,
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
```

## Output example

```text
95 URLs checked, 0 unreachable, 2 known-dead skipped.
```

## Related defense layer

- Documentation quality gate.
- Enforced by `.husky/pre-commit` after documentation changes.
