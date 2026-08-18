# What Is a Supply Chain Attack?

A supply-chain attack targets the software you rely on instead of your own code. If an attacker compromises a dependency, every project that installs it becomes a potential victim.

## Common Vectors in npm

- **Typosquatting** — publishing a package with a name similar to a popular one.
- **Account takeover** — stealing credentials of a legitimate package maintainer.
- **Dependency confusion** — uploading a private-named package to the public registry.
- **Malicious update** — pushing a compromised version of a trusted package.
- **Compromised build / publishing pipeline** — injecting malware during the package build process.

## Why Layers Matter

No single control catches every threat. A short waiting period catches rushed malicious releases; signature verification catches packages that were not published by the registry; audit catches known CVEs; deterministic install prevents drift; pre-commit hooks catch manual mistakes; and `.npmrc` hardening disables risky npm defaults.

_Last sync: 2025-06-25_
