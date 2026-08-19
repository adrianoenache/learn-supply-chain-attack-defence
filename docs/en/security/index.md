# Security Overview

This project protects the dependency tree using seven complementary layers. Each layer addresses a different attack vector, and together they make it much harder for a malicious or compromised package to enter the project.

## Defense Layers Diagram

```mermaid
flowchart TD
    subgraph Developer["Developer workflow"]
        A[Add dependency] --> B[tools/add-package.js]
        C[Commit changes] --> D[.husky/pre-commit]
        E[Fresh clone] --> F[npm run setup]
        Z[No lock file] --> Y[npm run defence:bootstrap]
    end

    subgraph Layer1["Layer 1: package age"]
        B --> G{>= 7 days old?}
        G -->|yes| H[allow install]
        G -->|no| I[reject]
    end

    H --> J[npm install]

    subgraph Layer2["Layer 2: signature verification"]
        J --> K[npm audit signatures]
        Y --> K
    end

    subgraph Layer3["Layer 3: vulnerability audit"]
        K --> L[npm audit --audit-level=high]
    end

    subgraph Layer4["Layer 4: deterministic install"]
        F --> M[npm ci from lock file]
        L --> M
        Y --> M
    end

    subgraph Layer5["Layer 5: pre-commit hook"]
        D --> Q[npm run lint]
        D --> K
        D --> N[transitive age check]
        D --> U[update availability check]
    end

    subgraph Layer6["Layer 6: hardened npm config"]
        M --> O[.npmrc policies]
        K --> O
        L --> O
    end

    subgraph Layer7["Layer 7: lint / format gate"]
        Q --> R[Biome check]
    end

    subgraph Layer8["Layer 8: update availability check"]
        U --> V[eligible / quarantine]
    end

    O --> P[Safe dependency tree]
    R --> P
    V --> P
```

## Layer Reference

1. [Package age check](defense-layer-1-package-age.md)
2. [Signature verification](defense-layer-2-signatures.md)
3. [Vulnerability audit](defense-layer-3-vulnerabilities.md)
4. [Deterministic install](defense-layer-4-deterministic-install.md)
5. [Pre-commit hook](defense-layer-5-precommit-hook.md)
6. [Hardened `.npmrc`](defense-layer-6-npmrc-config.md)
7. [Lint / format gate](defense-layer-7-lint-format.md)
8. [Update availability check](defense-layer-8-update-check.md)

## Threat Model in a Nutshell

- **Newly published malicious package** → blocked by package-age check.
- **Compromised package without valid registry signature** → blocked by signature verification.
- **Known vulnerable package** → blocked by `npm audit`.
- **Unexpected lock-file drift** → blocked by `npm ci` and pre-commit checks.
- **Accidental insecure npm behavior** → blocked by hardened `.npmrc`.
- **Low-quality or inconsistent code reaching the repository** → blocked by the Biome lint / format gate in the pre-commit hook.
- **Dependencies drifting out of date unnoticed** → surfaced by the update availability check in the pre-commit hook.
