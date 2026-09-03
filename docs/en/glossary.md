# Glossary

This glossary defines terms used throughout the project documentation. It is intended for learners, contributors, and auditors who may not be familiar with supply-chain security terminology.

## Dependency confusion

An attack where a public package is published with the same name as a private, internal package. If the package manager resolves the public name first, the malicious code is installed instead of the internal one.

## Deterministic install

An install process that produces the exact same dependency tree every time it runs. In npm projects, this is achieved by installing from a verified `package-lock.json` using `npm ci` instead of `npm install`.

## Levenshtein distance

A measure of how many single-character edits are needed to change one string into another. This project uses it to detect package names that are visually similar to existing dependencies (typosquatting).

## Lifecycle scripts

npm scripts such as `postinstall`, `preinstall`, and `prepare` that run automatically during package installation. They are a common execution path for malicious code, so this project disables them by default via `ignore-scripts` in `.npmrc`.

## Lockfile integrity

The property of a `package-lock.json` entry that includes a cryptographic hash (usually SHA-512) of the package tarball. Verifying integrity ensures the installed package matches the one that was audited.

## Provenance

A signed attestation from a package registry that records how a package was built and published. Provenance helps users verify that a package came from an expected source and build pipeline.

## SBOM (Software Bill of Materials)

A machine-readable inventory of all components in a software project. This project can generate a CycloneDX 1.4 JSON SBOM from `package-lock.json` for compliance and incident response.

## SLSA

Supply-chain Levels for Software Artifacts. A security framework that provides guidelines and attestations for secure software supply chains. Provenance attestations are one SLSA primitive.

## Time-of-check/time-of-use (TOCTOU)

A vulnerability window where a resource is checked and then used later, but the resource may have changed in between. This project closes the TOCTOU window in `add-package.js` by re-verifying package metadata after installation.

## Typosquatting

An attack where a malicious package is published with a name very similar to a popular, legitimate package, hoping users will mistype the name during installation.
