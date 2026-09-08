# Known-Dead URLs

This file tracks external URLs that are intentionally referenced by the project
but are known to return 404 or be otherwise unreachable. Keeping them here lets
the automated external-URL checker distinguish intentional historical
references from accidental broken links.

Each entry must include:

- The dead URL.
- Where it is used.
- Why it is kept.

## Entries

### `https://code.visualstudio.com/schemas/hooks`

- **Used in:** `.github/ai-lessons-learned.md`
- **Why kept:** It is recorded as the invented schema URL that was mistakenly
  used in an earlier version of the GitHub Copilot hooks configuration. The
  real schema is defined by the
  [GitHub Copilot hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference).
  The dead URL remains only as a lessons-learned reference.

### `https://registry.mycompany.com/`

- **Used in:** `docs/en/npmrc-hardening.md`, `docs/pt-BR/npmrc-hardening.md`
- **Why kept:** Placeholder for a private or air-gapped npm registry. The
  example is meant to be replaced by the reader's real internal registry URL.

### `https://evil.example.com`

- **Used in:** `tools/add-package.test.js`, `tools/analyze-lifecycle-scripts.test.js`,
  `tools/lib/script-analyzer.test.js`
- **Why kept:** Fictitious attacker-controlled URL used as a fixture when
  testing detection of malicious lifecycle scripts and network calls.
