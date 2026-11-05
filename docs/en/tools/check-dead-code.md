# check-dead-code

`check-dead-code.js` finds dead-code *candidates* in the defence toolset: exports no consumer references and files nobody requires. It is deliberately **advisory** — it always exits 0 — because static CommonJS analysis cannot prove unreachability in this codebase.

## What it does

- Collects production files under `tools/` (excluding tests and the repo-local `tools/e2e/` harness).
- Extracts each file's exports (`module.exports` object keys, get/set accessors, and `module.exports.<name>` assignments).
- Resolves consumers through the codebase's real require patterns: destructured (literal or `path.resolve` form), namespace bindings with member access, **inline `require(...).member()` access**, alias-indirected test harnesses (`SCRIPT_PATH` constants — first declaration wins so embedded fixture strings cannot steal the alias), and a word-presence fallback when the binding flows through a helper function.
- Treats npm-script targets as CLI entry points and bare side-effect requires as opaque (all exports conservatively kept).

Implemented in [tools/check-dead-code.js](../../../tools/check-dead-code.js).

## Usage

```bash
npm run defence:check-dead-code                  # human-readable candidate list
node ./tools/check-dead-code.js --format json    # machine-readable
node ./tools/check-dead-code.js --quiet          # exit code only (--silent is a kept alias)
```

## Output example

```text
  ✓ OK   dead-code scan: no candidates found

── Summary ───────────────────────────────────────────
  ✓ OK   1 passed
```

With candidates present, each one prints as a `⚠ WARN` item and the summary closes with `N warned` plus a `Next:` review hint.

## Triage rules (important)

The output is a **candidate list, never a delete list**:

- **Unexport, don't delete** when the symbol is still used inside its own file.
- **Keep and add a test** for documented extension points and pure helpers worth direct coverage.
- **The full `npm test` suite is the arbiter** after acting on any candidate — it must stay green. (Acting on an immature candidate list broke 35 tests on 2026-11-03; see `DECISIONS.md`.)

## Why advisory?

The DI contract (`setImpls`/`resetImpls`) and dynamic consumption patterns make false positives inevitable. A hard CI gate would either block legitimate exports or force annotation noise into a learning resource. See the ADR in `DECISIONS.md` (2026-11-03).

## Related

- Axis 3 of the `code-review-pass` skill (dead code removal), alongside quality, security, and documentation review.
