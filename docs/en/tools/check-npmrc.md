# check-npmrc

`check-npmrc.js` validates the npm configuration surface (`.npmrc` keys and npm's install-time extension files) so configuration drift cannot silently weaken — or pretend to strengthen — the supply-chain defenses.

## What it does

- Rejects **unknown keys**: npm ≥ 11.2 only warns about them ("Unknown project config") and npm v12 can hard-fail (`strict-npmrc`). A typo'd key today is a broken install — or a false sense of security — tomorrow.
- Recognizes an explicit **lookahead allow-list**: keys intentionally kept for future npm versions, each with a documented justification (currently `npm-audit-fix-level` and `send-metrics`).
- Rejects **weakened defensive values**: `ignore-scripts=false`, `strict-ssl=false`, `engine-strict=false`, `dangerously-allow-all-scripts=true`.
- Rejects the **npm v12 extension mechanism**: the `extension-file` key and auto-discovered `.npm-extension.mjs`/`.npm-extension.cjs` files execute root-owned code during install, invisible to lifecycle-script detectors. `ignore-scripts=true` implies `ignore-extension`; this check makes the protection explicit instead of implied.

Implemented in [tools/check-npmrc.js](../../../tools/check-npmrc.js). Runs in the pre-commit hook and in the CI `defence-gates` job.

## Usage

```bash
npm run defence:check-npmrc                    # human-readable report
node ./tools/check-npmrc.js --silent           # only exit code + problems
node ./tools/check-npmrc.js --format json      # machine-readable report
```

## Output example

```text
npm configuration surface: 17 key(s) checked, 2 lookahead (documented), 0 problem(s).
  LOOKAHEAD  npm-audit-fix-level — Restricts npm audit fix to high/critical fixes once npm supports it...
  LOOKAHEAD  send-metrics — Explicit telemetry opt-out kept for future npm releases...
npm configuration surface is valid.
```

## Exit codes

- `0` — configuration surface is valid.
- `1` — unknown/unsafe key, forbidden extension file, or missing `.npmrc`.

## Adding a new key

When adopting a new documented npm key, add it to `KNOWN_KEYS` in [tools/check-npmrc.js](../../../tools/check-npmrc.js). When intentionally keeping a not-yet-recognized key, register it in `LOOKAHEAD_KEYS` with a justification and document it in the [`.npmrc` hardening guide](../npmrc-hardening.md).

## Related defense layer

- [Defense Layer 6 — .npmrc configuration](../security/defense-layer-6-npmrc-config.md)
