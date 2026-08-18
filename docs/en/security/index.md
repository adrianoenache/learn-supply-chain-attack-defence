# Security Overview

This project protects the dependency tree using six complementary layers. Each layer addresses a different attack vector, and together they make it much harder for a malicious or compromised package to enter the project.

## Defense Layers Diagram

```mermaid
flowchart TD
    subgraph Developer["Developer workflow"]
        A[Add dependency] --> B[tools/add-package.js]
        C[Commit changes] --> D[.husky/pre-commit]
        E[Fresh clone] --> F[npm run setup]
    end

    subgraph Layer1["Layer 1: package age"]
        B --> G{>= 7 days old?}
        G -->|yes| H[allow install]
        G -->|no| I[reject]
    end

    H --> J[npm install]

    subgraph Layer2["Layer 2: signature verification"]
        J --> K[npm audit signatures]
    end

    subgraph Layer3["Layer 3: vulnerability audit"]
        K --> L[npm audit --audit-level=high]
    end

    subgraph Layer4["Layer 4: deterministic install"]
        F --> M[npm ci from lock file]
        L --> M
    end

    subgraph Layer5["Layer 5: pre-commit hook"]
        D --> K
        D --> N[transitive age check]
    end

    subgraph Layer6["Layer 6: hardened npm config"]
        M --> O[.npmrc policies]
        K --> O
        L --> O
    end

    O --> P[Safe dependency tree]
```

## Layer Reference

1. [Package age check](defense-layer-1-package-age.md)
2. [Signature verification](defense-layer-2-signatures.md)
3. [Vulnerability audit](defense-layer-3-vulnerabilities.md)
4. [Deterministic install](defense-layer-4-deterministic-install.md)
5. [Pre-commit hook](defense-layer-5-precommit-hook.md)
6. [Hardened `.npmrc`](defense-layer-6-npmrc-config.md)

## Threat Model in a Nutshell

- **Newly published malicious package** → blocked by package-age check.
- **Compromised package without valid registry signature** → blocked by signature verification.
- **Known vulnerable package** → blocked by `npm audit`.
- **Unexpected lock-file drift** → blocked by `npm ci` and pre-commit checks.
- **Accidental insecure npm behavior** → blocked by hardened `.npmrc`.

_Last sync: 2025-06-25_
