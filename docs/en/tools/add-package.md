# add-package

`add-package.js` is the secure wrapper for installing dependencies. It runs every relevant defense gate before allowing a package into the project.

## What it does

- Parses the package specifier and validates it is in `name@version` form.
- Enforces the minimum package-age check.
- Verifies npm provenance / SLSA attestation when configured (`defences.provenanceMode`).
- Runs typosquatting / dependency-confusion detection against existing names.
- Performs static lifecycle-script analysis on the package (pre-install dry-run).
- Pins the tarball integrity from the registry manifest (TOCTOU protection).
- Installs with `--save-exact --ignore-scripts` under the process monitor.
- Verifies npm signatures with `npm audit signatures`.
- Runs a vulnerability audit.
- Runs transitive package-age and license checks.
- Reports a summary; there is no confirmation prompt — use `--dry-run` to inspect the checks without installing.

Implemented in [tools/add-package.js](../../../tools/add-package.js).

## Usage

```bash
# Add a production dependency
npm run defence:add -- lodash@4.17.21

# Add a dev dependency
npm run defence:add -- @types/node@22.15.3 --dev

# Add a peer dependency
npm run defence:add -- react-native-svg@12.0.0 --peer

# Simulate without installing
npm run defence:add -- lodash@4.17.21 --dry-run
```

## Output example

```text
Checking package age for lodash@4.17.21 ... ok (published 30 days ago)
Verifying npm signatures ... ok
Running vulnerability audit ... ok
Analyzing lifecycle scripts ... ok
License MIT is allowed.
Summary: lodash@4.17.21 passed all defense gates.
```

## Related defense layers

- [Defense Layer 1 — Package age check](../security/defense-layer-1-package-age.md)
- [Defense Layer 2 — Signature verification](../security/defense-layer-2-signatures.md)
- [Defense Layer 3 — Vulnerability audit](../security/defense-layer-3-vulnerabilities.md)
- [Defense Layer 9 — License check](../security/defense-layer-9-license-check.md)
- [Defense Layer 10 — Typosquatting & dependency confusion](../security/defense-layer-10-typosquatting.md)
- [Defense Layer 11 — Provenance & SLSA attestation](../security/defense-layer-11-provenance.md)
