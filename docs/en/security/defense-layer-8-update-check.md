# Defense Layer 8 — Update Availability Check

After dependencies are installed, they slowly drift out of date. The update-availability check warns developers when newer versions exist, classifies those versions by safety, and points to release notes — but it **never installs anything automatically**.

This layer is intentionally read-only. It turns the pre-commit hook into a gentle reminder that helps the project stay current without the risk of unattended upgrades.

## What it does

When you run `npm run defence:update-check` (or commit changes, which triggers it through the pre-commit hook):

1. **Local sync check**: verifies that `node_modules` matches `package-lock.json`.
2. **Outdated scan**: runs `npm outdated --json` to discover available updates.
3. **Registry age check**: queries the npm registry for the publication date of each `latest` version.
4. **Classification**:
   - **Eligible** — the new version is at least `minAgeDays` old, so it has had time to be reviewed by the community.
   - **Quarantine** — the new version is too recent, or the registry lookup failed. These updates are shown for awareness but are not recommended yet.
5. **Reminder**: prints a warning only if updates exist and the configured reminder interval has passed.

If your local dependencies are out of sync (for example, after pulling a colleague's changes), the script recommends `npm ci` first. This prevents you from evaluating updates against a stale installed tree.

## Configuration

The behavior is controlled by the `updateCheck` block in `package.json`:

```json
"updateCheck": {
  "minAgeDays": 7,
  "remindEveryDays": 1,
  "alwaysRemind": false,
  "includeTransitive": false,
  "registryTimeoutMs": 10000,
  "cacheTtlHours": 24
}
```

| Field | Default | Meaning |
| --- | --- | --- |
| `minAgeDays` | `7` | Minimum age of `latest` version to be considered eligible. Falls back to `pkgAgeCheck.minAgeDays` or `.npmrc` `min-release-age`. |
| `remindEveryDays` | `1` | When `alwaysRemind` is `false`, how often the alert is shown. |
| `alwaysRemind` | `false` | If `true`, the alert appears every time updates exist. |
| `includeTransitive` | `false` | If `true`, also checks transitive dependencies. |
| `registryTimeoutMs` | `10000` | Network timeout for registry calls. |
| `cacheTtlHours` | `24` | How long scan results are cached locally. |

## Usage

```bash
# Normal check (respects cache and reminder settings)
npm run defence:update-check

# Ignore cache and rescan
npm run defence:update-check:force

# Suppress output (useful in CI)
npm run defence:update-check -- --silent

# JSON output for CI / automation
npm run defence:update-check -- --format=json
npm run defence:update-check:json

# Markdown output for pull requests / issues
npm run defence:update-check -- --format=markdown

# Standalone sync check
npm run defence:sync-check
npm run defence:sync-check -- --fix

# Offline mode (uses cached scan, no network calls)
npm run defence:update-check -- --offline
npm run defence:update-check:offline
```

## Offline mode

When you are without network access, use `--offline` to avoid registry calls and `npm outdated`:

- If a cached scan exists, it is used even if the TTL has expired.
- If no cache exists, the script prints a warning and exits 0 so the pre-commit hook does not fail.
- The local `node_modules` sync check still runs because it requires no network.

```bash
npm run defence:update-check:offline
```

## Output example

```text
⚠️  Dependency updates available:
   (This script never modifies dependencies automatically.)

   Eligible for update (age >= 7 days):
     @biomejs/biome  2.5.8 → 2.7.1 [minor] (released 18 days ago)
       npm:     https://www.npmjs.com/package/@biomejs/biome/v/2.7.1
       release: https://github.com/biomejs/biome/releases/tag/cli%40v2.7.1

   In quarantine (too recent or unsafe to update):
     husky  9.1.7 → 9.2.0 [minor] (released 2 days ago)
       npm:     https://www.npmjs.com/package/husky/v/9.2.0
       release: https://github.com/typicode/husky/releases/tag/v9.2.0

   Run the command below to review and apply updates safely:
     npm run defence:update
```

Release links are best-effort: they are inferred from the `repository.url` field in the registry document and the most common GitHub tag patterns. The exact tag may differ for monorepos or projects that do not use the `vX.Y.Z` convention.

## Why read-only?

- **Fail-safe**: a bug in the check cannot silently downgrade or upgrade dependencies.
- **Developer control**: updates still require explicit review and commit.
- **Fast hook**: the pre-commit step only reads data; it never compiles or installs packages.

## Dependency sync check

Before scanning for new updates, the script always verifies that `node_modules` matches `package-lock.json`. You can also run this check standalone:

```bash
npm run defence:sync-check
```

If the installed tree is stale, it exits with code 1 and recommends `npm ci`. The `--fix` flag prints the exact command to run.

A `post-merge` hook is also installed so that `git pull` warns when dependencies need to be reinstalled.

## Output formatters

The default output is a human-readable table, but two machine-readable formats are available:

- `--format=json` — deterministic JSON containing `lastScan`, `eligible`, and `quarantine`.
- `--format=markdown` — Markdown summary with tables, suitable for pasting into pull requests or issues.

## Implementation

Implemented in:

- [tools/check-updates.js](../../../tools/check-updates.js)
- [tools/check-updates.test.js](../../../tools/check-updates.test.js)
- [tools/check-sync.js](../../../tools/check-sync.js)
- [tools/check-sync.test.js](../../../tools/check-sync.test.js)
- [tools/lib/sync-check.js](../../../tools/lib/sync-check.js)

The local state is stored in `.defence-update-check.json`, which is ignored by git so each developer has their own reminder state.

## Integration with other layers

- Runs inside the pre-commit hook (Layer 5) via `npm run defence:pre-commit`.
- Respects the same `minAgeDays` / `min-release-age` value used by the package-age check (Layer 1) and `.npmrc` (Layer 6).
- Does not replace `defence:update`; it only recommends running it when appropriate.
