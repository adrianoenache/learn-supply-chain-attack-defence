# Repository Organization

How this repository is organized and why. This page documents the layout
conventions, the CODEOWNERS layer, and the rules that keep the project
predictable as it grows.

> **Note (Fase H):** this page is being expanded during Phase H; the
> CODEOWNERS section below is complete, and the full structural audit lands
> with item H.5.

## Layout conventions

- `tools/` — defense scripts (`<action>.js`), each with a sibling
  `<action>.test.js` and a page under `docs/{en,pt-BR}/tools/`.
- `tools/lib/` — shared helpers with a single responsibility per module
  (`config.js`, `concurrency.js`, `retry-fetch.js`, `registry-cache.js`, …).
- `docs/en/` and `docs/pt-BR/` — bilingual documentation with identical
  structure; every page exists in both languages.
- `.github/` — AI customizations (`instructions/`, `agents/`, `skills/`,
  `hooks/`), CI workflows, and repository templates.

New files must be discoverable from an index, manifest, or documentation page
(no orphaned files).

## CODEOWNERS

The twelve technical defense layers verify code automatically;
[`.github/CODEOWNERS`](../../.github/CODEOWNERS) is the **organizational
layer**: it requires human review for any change that could weaken a security
gate or steer the project's AI assistants.

### What it protects

| Path | Why it needs review |
| --- | --- |
| `tools/` | The defense tools themselves — a subtle change can disable a gate. |
| `.npmrc`, `package.json`, `package-lock.json`, `.defence-manifest.json` | Supply-chain policy: registry, lifecycle scripts, pinned versions, and the adoption manifest. |
| `.husky/`, `.github/hooks/`, `.github/workflows/` | Commit-time and CI-time enforcement; AI execution guards. |
| `.github/copilot-instructions.md`, `.github/instructions/`, `.github/agents/`, `.github/skills/` | The AI customization surface — a malicious edit here steers every future AI session in this repository. |

### Enabling the requirement

CODEOWNERS only takes effect when branch protection references it:

1. Open **Settings → Branches** in the GitHub repository.
2. Edit the rule for `main` (and `dev`).
3. Enable **Require a pull request before merging**.
4. Enable **Require review from Code Owners**.
5. Save.

From then on, any PR touching a protected path requests review from
`@adrianoenache` automatically.

### Required status checks (recommended next step)

CODEOWNERS guarantees *human* review; it does not prevent merging a PR whose
CI is red. Enabling **Require status checks to pass before merging** closes
that gap — human approval only happens after the automated gates are green:

1. In the same branch rule, enable **Require status checks to pass before
   merging**.
2. Enable **Require branches to be up to date before merging** (strict mode;
   relax it first if the rebase friction becomes disproportionate for a
   low-traffic repository).
3. Add the CI job names from `.github/workflows/ci.yml` as required checks:
   `Build`, `Test`, `Coverage`, `Lint`, `Format`, `Documentation Links`,
   `License Check`, `Lockfile Integrity`, `Secret Scan`, `Installer Dry-Run`,
   `Defence Gates`.

The resulting merge chain is the project teaching its own model:

```text
commit → git hooks → GitHub Actions → required status checks → CODEOWNERS → merge
```

### Adjusting ownership

Edit `.github/CODEOWNERS` as the project gains maintainers. Prefer the most
specific path at the bottom of the file (the last matching rule wins).
