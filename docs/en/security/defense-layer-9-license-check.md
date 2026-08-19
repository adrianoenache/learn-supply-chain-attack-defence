# Defense Layer 9 — Dependency License Check

A dependency can be technically safe — signed, aged, and vulnerability-free — yet still be legally incompatible with the project. The license checker scans every package recorded in `package-lock.json`, classifies each license against an explicit allow-list and deny-list, and reports anything that needs legal review.

This layer is intentionally read-only. It never installs, modifies, or skips a dependency; it only surfaces license information so humans can make informed decisions.

## What it does

When you run `npm run defence:license-check`:

1. **Reads the lock file**: parses `package-lock.json` v3, including every direct and transitive dependency.
2. **Classifies each license**:
   - **Allowed** — the license is in the explicit allow-list (e.g., `MIT`, `Apache-2.0`, `ISC`).
   - **Prohibited** — the license is in the explicit deny-list (e.g., `GPL-3.0`, `AGPL-3.0`, `UNLICENSED`).
   - **Flagged for review** — the license is missing or not recognized.
3. **Handles SPDX expressions**: supports `OR` and `AND` compound expressions such as `MIT OR Apache-2.0` or `MIT AND ISC`.
4. **Prints a report**: table, JSON, or Markdown output for humans and CI pipelines.

If `--fail` is provided, the command exits with code 1 when any package is prohibited or flagged. This makes it easy to add a license gate to CI without breaking local exploration.

## Configuration

The behavior is controlled by the `licensesCheck` block in `package.json`:

```json
"licensesCheck": {
  "allowed": [
    "MIT",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "ISC",
    "0BSD"
  ],
  "prohibited": [
    "GPL-1.0",
    "GPL-2.0",
    "GPL-3.0",
    "AGPL-1.0",
    "AGPL-3.0",
    "LGPL-2.0",
    "LGPL-2.1",
    "LGPL-3.0",
    "MPL-1.0",
    "MPL-1.1",
    "MPL-2.0",
    "UNLICENSED"
  ],
  "failOnUnknown": false
}
```

| Field | Default | Meaning |
| --- | --- | --- |
| `allowed` | permissive OSI licenses | Licenses treated as compatible with the project. |
| `prohibited` | copyleft / proprietary markers | Licenses that always trigger a failure when `--fail` is used. |
| `failOnUnknown` | `false` | If `true`, unknown licenses are treated as prohibited instead of flagged. |

If `licensesCheck` is absent, the script falls back to the built-in defaults shown above.

## Usage

```bash
# Human-readable table (default)
npm run defence:license-check

# Exit 1 on prohibited or unknown licenses
npm run defence:license-check:fail

# JSON output for CI / automation
npm run defence:license-check:json

# Markdown output for pull requests / issues
npm run defence:license-check -- --format=markdown

# Suppress output (useful in CI)
npm run defence:license-check -- --silent

# Check a single package
npm run defence:license-check -- --pkg=lodash@4.17.21
```

## Output example

```text

📋 Dependency license check — 3 package(s) scanned:

   Prohibited (1):
     ❌ gpl-pkg@1.0.0 — GPL-3.0 (gpl-3.0)

   Flagged for review (1):
     ⚠️  unknown-pkg@3.0.0 — Custom (unknown license)

   Allowed (1):
     ✅ mit-pkg@1.0.0 — MIT

```

## Why read-only?

- **Fail-safe**: a bug in the check cannot remove or downgrade a dependency.
- **Developer control**: license decisions remain with the team; the tool only informs.
- **Fast**: the check reads `package-lock.json` and exits, with no network calls or package installation.

## SPDX expression handling

Modern packages often declare compound licenses. The checker evaluates them as follows:

- **`MIT OR Apache-2.0`**: allowed if at least one branch is allowed.
- **`MIT AND ISC`**: allowed only if every branch is allowed.
- **`MIT OR GPL-3.0`**: prohibited if any branch is prohibited.
- **`MIT AND GPL-3.0`**: prohibited if any branch is prohibited.

Unknown branches are treated as flagged unless the whole expression resolves through an allowed or prohibited branch.

## Single-package mode

For quick triage, you can check one package by exact name and version:

```bash
npm run defence:license-check -- --pkg=react@18.3.1
```

Scoped packages are supported:

```bash
npm run defence:license-check -- --pkg=@biomejs/biome@2.5.8
```

If the package is not found in the lock file, the command exits with code 1.

## Implementation

Implemented in:

- [tools/check-licenses.js](../../../tools/check-licenses.js)
