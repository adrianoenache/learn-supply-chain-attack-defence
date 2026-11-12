# update-engines

`update-engines.js` reports and applies Node.js/npm engine updates (patch/minor within the current major) and upgrades (new LTS major), keeping CI compatibility guaranteed by construction.

## What it does

- Reads the current floor from `package.json#engines`.
- Fetches the official `https://nodejs.org/dist/index.json` — the same index `actions/setup-node` downloads from, so a version present there is available in CI by definition.
- Reports the latest in-major update and the latest LTS upgrade, each with the **npm version bundled with that Node release** (project policy: npm always tracks the bundled version, never `npm@latest`).
- Applies a target surgically: edits only the engines lines of `package.json`, the **root** entry of `package-lock.json`, and `.nvmrc`, preserving all other formatting.
- Refuses targets absent from the dist index (CI would fail) and refuses downgrades.

### Malformed dist index entries

The official index permanently carries malformed historical entries (e.g. `v0.6.x` from 2011–2018 with bundled npm like `1.1.0-alpha-6`) and may publish new invalid entries (observed live: `v27.0.0-alpha.0.0.0` on 2026-11-05). The tool handles them like this:

- **Every mode** skips invalid entries with a `⚠ WARN` on stderr (suppressed by `--silent`); the `--format json` report lists them in the `skipped` field.
- **Apply modes** (`--update`/`--upgrade`/`--to`) fail closed only when a skipped entry **could affect the target decision** — a well-formed `vX.Y.Z` version with a major greater than or equal to the current one. Entries that could never be a target (malformed version or older major) only earn a warning.
- Only strict stable semver versions (`X.Y.Z`) can become engine candidates — pre-releases never reach `package.json`.

Implemented in [tools/update-engines.js](../../../tools/update-engines.js).

## Usage

```bash
npm run defence:update-engines           # report only
npm run defence:update-engines:update    # apply latest in-major update
npm run defence:update-engines:upgrade   # apply latest LTS major upgrade
node ./tools/update-engines.js --to 26.13.0 --dry-run
```

Flags: `--update`, `--upgrade`, `--to <version>`, `--dry-run`, `--silent`, `--format json`.

## Output example

```text
Node.js engine report
  current pin:           24.22.3 (npm 11.19.1)
  update (v24 line):      24.22.3 (npm 11.19.1) — up to date
  upgrade (latest LTS):  26.13.0 (npm 11.20.0, Lithium) — AVAILABLE

Apply with: --update (in-major), --upgrade (latest LTS), or --to <version>.

── Summary ───────────────────────────────────────────
  ✓ OK   1 passed
  ⚠ WARN 1 warned
  Next: npm run defence:update-engines:update (in-major) or :upgrade (latest LTS)
```

The single `passed` entry is the current pin verified against the official dist index; `warned` counts available update/upgrade targets plus skipped malformed entries.

## After applying

The running process still uses the old runtime. Switch and re-validate before committing:

```bash
nvm install <version> && nvm use
npm test && npm run lint && npm run defence:check-md-links
```

Commit `package.json`, `package-lock.json`, and `.nvmrc` together — CI derives its Node version from `package.json` at runtime.

## Configuration

Optional overrides in `package.json` under `updateEngines` (dist index URL, timeouts, retry policy). Defaults rarely need changing.

## Related defense layer

- Keeps the runtime patched against published CVEs — see the 2026-10-21 Node.js security release that motivated this tool.
- Complements [check-engines](check-engines.md), which validates the local runtime against the floor this tool maintains.
