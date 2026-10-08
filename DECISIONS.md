# Architecture & Process Decisions

Lightweight ADRs (Architecture Decision Records) for this project. Unlike
`CHANGELOG.md` (what changed) and `.github/ai-lessons-learned.md` (mistakes),
this file records **why** a path was chosen and which alternative was rejected.

## Format

```
### YYYY-MM-DD — Short decision title

- **Decision:** What was decided.
- **Context:** What forced the decision.
- **Rejected alternative:** What was not chosen, and why.
- **Consequences:** What becomes easier or harder because of it.
```

Keep entries concise; link to the phase/commit for detail.

---

## Entries

### 2026-10-05 — One-shot prompts become on-demand skills (VS Code 1.140)

- **Decision:** Convert the nine `.github/prompts/*.prompt.md` files into skills
  under `.github/skills/` with `disable-model-invocation: true`.
- **Context:** VS Code 1.140 removed prompt file support.
- **Rejected alternative:** Keep prompt files and pin VS Code to an older
  version — rejects the supported upgrade path and the open Agent Skills
  standard.
- **Consequences:** Skills follow the spec (kebab-case name = folder,
  descriptive description); the project gains portability to Copilot CLI and
  Codex via agentskills.io.

### 2026-10-05 — Merge overlapping skill pairs instead of keeping both

- **Decision:** Five prompt/skill pairs with near-total overlap were merged
  (`review-security`→`security-audit`, `update-docs`→`docs-update`,
  `review-ai-output`→`self-review`, `verify-command-contract`→
  `script-contract-verification`, `code-review-for-learning`→
  `educational-code-review`).
- **Context:** After the prompt migration, two skills described the same task,
  and the model could load the wrong one.
- **Rejected alternative:** Keep both (one automatic, one manual) — preserves
  an artificial distinction at the cost of ambiguous routing.
- **Consequences:** 18 skills total, one canonical name per task; the
  `skills.sanity.test.js` guards naming.

### 2026-10-05 — Safety warnings bypass `--silent` and go to stderr

- **Decision:** `check-updates.js` always prints the out-of-sync and offline
  fallback warnings, even with `--silent`, and emits them on stderr.
- **Context:** Silently skipping them looked like "no updates found" (a false
  negative); printing to stdout corrupted the `node --test` TAP stream.
- **Rejected alternative:** Keep warnings gated by `--silent` — hides real risk
  exactly when automation is least supervised.
- **Consequences:** `--silent` suppresses reports only; stdout stays
  machine-parseable for `--format=json`.

### 2026-10-05 — Apply age-gated intermediates for quarantined packages (F.4)

- **Decision:** `defence:update` treats age-quarantined packages
  (`reason: "too recent"`) with eligible intermediates as actionable; registry
  failures are never actionable.
- **Context:** Real data (`@biomejs/biome 2.5.8→2.5.15`) showed six
  intermediates already past the age gate while `latest` was blocked.
- **Rejected alternative:** Wait for `latest` to age — discards vetted value
  and leaves known fixes unapplied.
- **Consequences:** The age gate is never weakened (`latest` stays blocked
  until it passes); decisions file records `source: eligible|quarantine`.

### 2026-10-06 — Repair-oriented blocking messages (APPA lite)

- **Decision:** Every hook block/warning names the sanctioned alternative.
- **Context:** The `enforce-security` hook blocked a legitimate commit message
  for containing a forbidden string; APPA (arXiv:2607.24625) formalizes
  recovery-over-abort.
- **Rejected alternative:** Abort-only blocking — teaches users to route around
  the gate instead of through it.
- **Consequences:** `enforce-security.test.js` enforces the rule; the block
  audit log (`security-blocks.log`) enables false-positive review.

### 2026-10-06 — Phase AI-3 split by dependency instead of a monolithic phase

- **Decision:** AI-3 items run interleaved with H/I/J by real dependency
  (AI-3.5 first, AI-3.4 merged into I, AI-3.3 between I and J, AI-3.2 before
  K, AI-3.1 last and conditional on measurement).
- **Context:** Running AI-3 fully before H/I/J would either reconstruct
  decisions retroactively (3.5) or document a structure H might reorganize
  (3.4).
- **Rejected alternative:** Monolithic AI-3 phase before or after H–J.
- **Consequences:** Each phase feeds the next; the J evaluation reads
  DECISIONS.md and the observability log as evidence.

### 2026-10-08 — Generated files never embed the generation date

- **Decision:** `generate-skills-index.js` omits `Last generated:`; chronology
  comes from git history.
- **Context:** The drift check failed the next day with zero content change —
  a false positive that would train contributors to ignore the guard.
- **Rejected alternative:** Normalize the date in the drift comparison — keeps
  a value with no informational purpose.
- **Consequences:** Drift checks are deterministic; the rule applies to any
  future generated file.
