# generate-sbom

`generate-sbom.js` creates a CycloneDX 1.4 JSON SBOM from `package-lock.json` for compliance and incident response.

## What it does

- Parses the lockfile to enumerate all dependencies.
- Extracts package metadata and SHA-512 integrity values.
- Writes a CycloneDX 1.4 JSON file.

Implemented in [tools/generate-sbom.js](../../../tools/generate-sbom.js).

## Usage

```bash
# Generate sbom.json
npm run defence:generate-sbom

# Custom output path
node ./tools/generate-sbom.js --output=dist/sbom.json
```

## Output example

```text
SBOM written to sbom.json
```

The generated `sbom.json` contains a `components` array with each dependency's name, version, purl, and hashes.

## Related defense layer

- [SBOM and compliance](../sbom-and-compliance.md)
- Part of the CI/CD `defence-gates` job.
