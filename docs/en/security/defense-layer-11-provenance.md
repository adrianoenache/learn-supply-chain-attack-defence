# Defense Layer 11 — Provenance & SLSA Attestation Check

npm packages can be published with a signed provenance attestation that links the tarball to a specific source repository, commit, and CI workflow. Verifying provenance makes it much harder for an attacker to substitute a tarball that was not built by the legitimate publisher.

## What This Layer Checks

- Whether the package version has a published provenance attestation.
- Whether the attestation bundle is structurally valid.

## Configuration

The behavior is controlled by `defences.provenanceMode` in `package.json`:

```json
{
  "defences": {
    "provenanceMode": "warn"
  }
}
```

Allowed values:

- `warn` (default) — missing or invalid provenance prints a warning but allows installation.
- `strict` — missing or invalid provenance aborts installation.
- `off` — provenance is not checked.

## Implementation

Implemented in:

- [tools/lib/provenance.js](../../../tools/lib/provenance.js)
- [tools/add-package.js](../../../tools/add-package.js)

`provenance.js` fetches the attestation bundle from the npm registry using the shared registry cache and retry layer. It parses the bundle and verifies that it contains a valid attestation for the requested package name and version.

## Usage

The check runs automatically during `add-package.js` after the package-age check and before installation:

```bash
npm run defence:add -- lodash@4.17.21
```

## Why Not Block by Default?

Not all packages publish provenance yet. Starting in `warn` mode lets the project collect signal without breaking legitimate workflows, while `strict` mode is available for teams that require SLSA compliance.
