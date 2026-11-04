# Glossary

This glossary defines terms used throughout the project documentation. It is intended for learners, contributors, and auditors who may not be familiar with supply-chain security terminology.

## Agent

A custom AI agent defined in `.github/agents/<name>.agent.md` (description, tools, and `applyTo` scope in the frontmatter). Agents act as domain-specialized reviewers invoked for delegated subagent tasks; the `agents.sanity.test.js` suite guards their configuration.

## CODEOWNERS

A GitHub file (`.github/CODEOWNERS`) assigning ownership of repository paths to maintainers. Combined with branch protection, it forms the *organizational* defense layer: changes to critical paths (defence tools, hooks, workflows, npm configuration, AI customizations) require review by the code owner before merge.

## Dependency confusion

An attack where a public package is published with the same name as a private, internal package. If the package manager resolves the public name first, the malicious code is installed instead of the internal one.

## Deterministic install

An install process that produces the exact same dependency tree every time it runs. In npm projects, this is achieved by installing from a verified `package-lock.json` using `npm ci` instead of `npm install`.

## Fork

An optional skill frontmatter field (`context: fork`, VS Code Agent Skills spec, experimental) intended to run a skill in a dedicated subagent context so only its final result returns to the parent conversation. As of VS Code 1.144.1 it has no observed effect, and the 1.145 release notes do not mention the field; the project keeps it as harmless and re-validates on editor updates.

## Hook

A Copilot lifecycle hook (`.github/hooks/*.json` + shell script) executed at events such as session start or pre/post tool use. Hooks are the deterministic layer of the AI surface: they enforce guarantees (block dangerous commands, guard write paths) that must not depend on model judgment.

## intermediateEligible

A field produced by `check-updates.js` listing versions between the installed one and `latest` that already satisfy the minimum-age gate, sorted ascending. `update-packages.js` prefers the highest intermediate eligible version instead of jumping straight to a too-recent `latest`.

## Levenshtein distance

A measure of how many single-character edits are needed to change one string into another. This project uses it to detect package names that are visually similar to existing dependencies (typosquatting).

## Lifecycle scripts

npm scripts such as `postinstall`, `preinstall`, and `prepare` that run automatically during package installation. They are a common execution path for malicious code, so this project disables them by default via `ignore-scripts` in `.npmrc`.

## Lockfile integrity

The property of a `package-lock.json` entry that includes a cryptographic hash (usually SHA-512) of the package tarball. Verifying integrity ensures the installed package matches the one that was audited.

## Provenance

A signed attestation from a package registry that records how a package was built and published. Provenance helps users verify that a package came from an expected source and build pipeline.

## Quarantine

The classification `check-updates.js` gives to a version published too recently to pass the minimum-age gate. Quarantined packages are not installed; those with eligible intermediate versions are "actionable quarantine" and can advance to the newest age-approved intermediate.

## SBOM (Software Bill of Materials)

A machine-readable inventory of all components in a software project. This project can generate a CycloneDX 1.4 JSON SBOM from `package-lock.json` for compliance and incident response.

## schemaVersion

A version field embedded in tool state files (e.g. `.defence-update-check.json`). Readers warn when a file carries a newer schema than they support, preventing silent misreads between tool versions.

## Skill

A packaged AI procedure following the Agent Skills specification: `.github/skills/<name>/SKILL.md` with a kebab-case `name` matching the folder and a `description` stating what it does and when to use it. Skills load by model relevance or explicit `/` invocation; the `skills.sanity.test.js` suite enforces spec compliance.

## SLSA

Supply-chain Levels for Software Artifacts. A security framework that provides guidelines and attestations for secure software supply chains. Provenance attestations are one SLSA primitive.

## Time-of-check/time-of-use (TOCTOU)

A vulnerability window where a resource is checked and then used later, but the resource may have changed in between. This project closes the TOCTOU window in `add-package.js` by re-verifying package metadata after installation.

## Typosquatting

An attack where a malicious package is published with a name very similar to a popular, legitimate package, hoping users will mistype the name during installation.
