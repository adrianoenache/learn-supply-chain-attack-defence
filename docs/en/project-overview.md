# Project Overview

This repository is a practical, hands-on learning environment for understanding and applying layered defenses against software supply-chain attacks in Node.js/npm projects.

## Purpose

Modern JavaScript projects depend on hundreds or thousands of open-source packages. Each dependency is a potential entry point for attackers. This project demonstrates how to build a **defense-in-depth** strategy that makes it significantly harder for a malicious or compromised package to enter your codebase.

Rather than relying on a single tool or check, the project combines multiple independent safeguards:

- Age limits for newly published packages.
- Registry signature verification.
- Vulnerability audits.
- Deterministic installs from a lock file.
- Pre-commit security gates.
- Hardened npm configuration.
- Lint and format enforcement.
- License compatibility checks.
- Typosquatting and provenance verification.
- Hook integrity enforcement.

## Who Is This For?

The project is useful for:

- **Learners and students** who want to understand how supply-chain attacks work and how to defend against them.
- **Security-conscious developers** who want a proven baseline for new Node.js projects.
- **Teams and organizations** looking for a reproducible, auditable set of defenses that can be copied into existing repositories.
- **AI-assisted developers** who want clear conventions for collaborating safely with coding assistants.

## What Is a Supply-Chain Attack?

A software supply-chain attack happens when an attacker introduces malicious code into a project through one of its dependencies or build tools. Common techniques include:

- **Typosquatting** — publishing a malicious package with a name similar to a popular one.
- **Dependency confusion** — uploading a public package with the same name as an internal private package.
- **Compromised maintainer account** — taking over a legitimate package and publishing a malicious version.
- **Malicious lifecycle scripts** — running harmful code during `npm install` via `postinstall` hooks.

This project teaches how each layer of defense mitigates one or more of these techniques.

## How to Use This Repository

1. **Read the [security overview](security/index.md)** to understand the twelve defense layers.
2. **Follow [getting started](getting-started.md)** to set up the project locally.
3. **Explore the [tools](tools.md)** to see how each defense is implemented.
4. **Check the [quick reference](quick-reference.md)** for the daily commands.
5. **Review the [architecture](architecture.md)** to understand how the pieces fit together.
6. **Adopt the defenses** in your own project using the [`install-defences.js`](../../tools/install-defences.js); see [adopting in other projects](adopting-in-other-projects.md).

## Learning vs. Adoption

This repository serves two goals at once:

- **Learning:** Every defense is documented, tested, and explained so readers can understand *why* it matters and *when* it triggers.
- **Adoption:** The defenses are packaged as standalone scripts that can be copied into other Node.js projects without publishing a new npm package.

You can use this repository as a reference, a teaching aid, or a starting point for hardening your own projects.

## AI-Assisted Development

This project was built with the assistance of GitHub Copilot and Kimi 2.7 Code. The collaboration is governed by explicit instructions in `.github/copilot-instructions.md` and documented for human contributors in [AI guidelines](ai-guidelines.md).
