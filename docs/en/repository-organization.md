# Repository Organization

How this repository is organized and why. This page documents the layout
conventions, the CODEOWNERS layer, the audit results, and the rules that keep
the project predictable as it grows.

## Layout conventions

- `tools/` — defense scripts (`<action>.js`), each with a sibling
  `<action>.test.js` and a page under `docs/{en,pt-BR}/tools/`.
- `tools/lib/` — shared helpers with a single responsibility per module
  (`config.js`, `concurrency.js`, `retry-fetch.js`, `registry-cache.js`, …).
- `tools/perf/` — benchmark harness for the defense tools.
- `tools/e2e/` — end-to-end fixtures and tests (require network access).
- `docs/en/` and `docs/pt-BR/` — bilingual documentation with identical
  structure; every page exists in both languages.
- `.github/` — AI customizations (`instructions/`, `agents/`, `skills/`,
  `hooks/`), CI workflows, issue/PR templates, and the governance files
  (`CODEOWNERS`, `PLAN.md`).

New files must be discoverable from an index, manifest, or documentation page
(no orphaned files).

## What is deliberately NOT extracted

Phase H evaluated extracting `tools/lib/formatters.js` and `tools/lib/cli.js`
and decided **against** it (recorded in `DECISIONS.md`): the report formatters
are domain-specific per tool (a license table is not an SBOM table), and
`parseCliArgs` is a 3-line convention (`argv.includes('--flag')`) that a shared
module would complicate, not simplify. The rule: extract only when the
implementation is byte-identical in more than one file — as was the case for
`tools/lib/concurrency.js`.

## Audit results (2026-10-08)

- **Orphaned files:** none. Every script is referenced by `package.json`, a
  docs page, a manifest entry, or a hook. Test files are discovered by the
  `test` script globs and need no index entry.
- **applyTo hygiene:** no broad `**` patterns; every instruction/agent declares
  a scoped pattern. Enforced continuously by `agents.sanity.test.js`.
- **Naming:** tools are `<action>.js`; tests are `<action>.test.js` siblings;
  docs pages mirror the tool name under `docs/{en,pt-BR}/tools/`.

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

> **Single-maintainer note (current state):** the minimum *approving review
> count* is set to **0**, because a solo maintainer cannot approve their own
> PR (count = 1 would deadlock every merge). The code-owner requirement and
> the status checks remain fully active. This is a **temporary, documented**
> trade-off — revisit it when the project gains additional maintainers or
> reviewers. Recorded in [DECISIONS.md](../../DECISIONS.md).

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
