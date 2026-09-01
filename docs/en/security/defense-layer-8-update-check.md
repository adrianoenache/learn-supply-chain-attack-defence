# Defense Layer 8 — Update Availability Check

After dependencies are installed, they slowly drift out of date. The update-availability check warns developers when newer versions exist, classifies those versions by safety, and points to release notes — but it **never installs anything automatically**.

This layer is intentionally read-only. It turns the pre-commit hook into a gentle reminder that helps the project stay current without the risk of unattended upgrades.

## What it does

When you run `npm run defence:update-check` (or commit changes, which triggers it through the pre-commit hook):

1. **Local sync check**: verifies that `node_modules` matches `package-lock.json`.
2. **Outdated scan**: runs `npm outdated --json` to discover available updates.
3. **Registry age check**: queries the npm registry for the publication date of each `latest` version through the shared [`registry-cache.js`](../../../tools/lib/registry-cache.js) and [`retry-fetch.js`](../../../tools/lib/retry-fetch.js) layers.
4. **Classification**:
   - **Eligible** — the new version is at least `minAgeDays` old, so it has had time to be reviewed by the community.
   - **Quarantine** — the new version is too recent, or the registry lookup failed. These updates are shown for awareness but are not recommended yet.
5. **Reminder**: prints a warning only if updates exist and the configured reminder interval has passed.

If your local dependencies are out of sync (for example, after pulling a colleague's changes), the script recommends `npm ci` first. This prevents you from evaluating updates against a stale installed tree.

The registry calls reuse the same caching, gzip, and retry layer as the package-age check. To bypass the registry cache while debugging, set:

```bash
DEFENCE_NO_CACHE=1 npm run defence:update-check
```

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
| `cacheTtlHours` | `24` | How long the per-package registry cache is considered fresh. This is independent of the `.defence-update-check.json` scan state. |
| `historyMaxEntries` | `30` | Maximum number of past scans kept in the local history. |
| `stuckInQuarantineThreshold` | `3` | How many consecutive scans a package must spend in quarantine to be flagged as stuck. |
| `highReleaseCadenceDays` | `7` | Average days between releases below which a package is considered high-cadence. |

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

- `--format=json` — deterministic JSON containing `lastScan`, `eligible`, `quarantine`, and `history`.
- `--format=markdown` — Markdown summary with tables, suitable for pasting into pull requests or issues.

## Historical scan tracking

Every scan appends a lightweight snapshot to a rolling history stored in `.defence-update-check.json`. The history keeps at most `historyMaxEntries` scans (default `30`) and contains only package names, versions, severity, and status — no sensitive data.

This history enables two extra warnings:

- **Stuck in quarantine**: a package that has been in quarantine for at least `stuckInQuarantineThreshold` consecutive scans is flagged as stuck. These packages may have a chronic issue (broken registry metadata, disappearing release tags, etc.) and deserve manual review.
- **High release cadence**: packages that appear very frequently in the history get a lower confidence score, signaling that the maintainer ships releases rapidly.

Both checks are local and deterministic; no extra network calls are needed.

## Confidence score

Each eligible update gets a confidence score that helps you prioritize reviews. The score is derived from:

1. **Age** — older releases score higher (up to 40 points).
2. **Semver severity** — patch scores highest, minor less, major lowest (up to 30 points).
3. **Release cadence** — packages releasing faster than `highReleaseCadenceDays` on average lose points (up to 30 points).

The final label is:

- `recommended` — score >= 70.
- `review required` — score between 40 and 69.
- `high risk` — score below 40.

The label appears in the table and Markdown output, and the raw `confidence` value and `confidenceLabel` are included in JSON output.

## Interactive update approval

Instead of updating every eligible package at once, you can review and approve each update individually:

```bash
npm run defence:update:interactive
```

The script reads the eligible list from `.defence-update-check.json` and asks `y/n/q` for each package. Approved packages are updated with `npm update <pkg1> <pkg2> ...`, and the same post-update verification layers run automatically. Rejected packages and quit decisions leave the workspace unchanged.

Your choices are saved to `.defence-update-decisions.json` (git-ignored) so you can review what was approved or skipped. To preview the checklist without making changes:

```bash
npm run defence:update:interactive:dry-run
```

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
