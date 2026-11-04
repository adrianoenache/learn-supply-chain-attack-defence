# Defense Layer 10 — Typosquatting & Dependency Confusion Detection

Attackers register package names that are visually similar to popular ones (`loadsh` instead of `lodash`) or publish internal package names to the public registry. These attacks rely on human error and on build systems that pull from both private and public registries.

## What This Layer Detects

- **Typosquatting**: a requested name is within a configurable Levenshtein distance of an existing dependency.
- **Dependency confusion**: a requested name matches a configured internal/private package name that already exists on the public npm registry.

## Configuration

Set the threshold and internal names in `package.json`:

```json
{
  "defences": {
    "typosquattingThreshold": 2,
    "internalPackageNames": ["@mycompany/core", "@mycompany/shared"]
  }
}
```

- `typosquattingThreshold` — maximum edit distance that triggers a conflict (default: `2`).
- `internalPackageNames` — list of private package names that should never appear on the public registry.

## Implementation

Implemented in:

- [tools/lib/typosquatting.js](../../../tools/lib/typosquatting.js)
- [tools/add-package.js](../../../tools/add-package.js)

`add-package.js` runs the check before any network request or installation. It loads existing dependency names from `package.json` and `package-lock.json`, then compares the requested package name against them. For internal names, it queries the public npm registry; a 404 means the name is safe, while any other response is treated as a potential squat.

## Usage

The check runs automatically whenever a dependency is added:

```bash
npm run defence:add -- lodash@4.17.21
```

If a conflict is detected, the installation aborts with a clear explanation.

## Why Levenshtein Distance?

Levenshtein distance counts the minimum single-character edits (insertions, deletions, substitutions) needed to turn one name into another. A threshold of `2` catches common typos and visual spoofs without flagging legitimate unrelated names.
