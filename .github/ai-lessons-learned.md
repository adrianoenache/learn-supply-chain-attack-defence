# AI Lessons Learned

This file tracks recurring mistakes made by AI assistants in this project and the corresponding corrections or instruction updates. It feeds the continuous improvement of `.github/copilot-instructions.md`, `.github/instructions/*.md`, and `.github/agents/*.agent.md`.

## Format

Each entry must be concise and actionable:

- **Date:** YYYY-MM-DD
- **Rule violated:** Reference to the rule in `.github/copilot-instructions.md` or agent/instruction file.
- **Affected files:** Files where the mistake appeared.
- **What happened:** Short description of the incorrect output.
- **Correction applied:** How the output or code was fixed.
- **Instruction/agent updated:** File(s) changed to prevent recurrence.

---

## Entries

### 2026-11-03 — Never act on analyzer output before validating pattern coverage

- **Date:** 2026-11-03
- **Rule violated:** Verify changes actually work before declaring done —
  and a linter/analyzer you just wrote is itself unproven code.
- **Affected files:** `tools/check-dead-code.js`, 11 files touched by a
  scripted unexport pass
- **What happened:** The first version of the dead-code scanner missed two
  real consumption patterns (`require(...).member()` inline access and
  alias-indirected test harnesses). Acting on its candidate list with a
  scripted unexport pass broke **35 tests**; recovery required reverting the
  pass and teaching the analyzer both patterns.
- **Correction applied:** The scanner learned inline member access (any
  layout), alias constants with first-declaration-wins, and textual fallback
  for harness indirection. A triage rule was added to the
  `code-review-pass` skill: after acting on any dead-code candidate, the
  full `npm test` suite is the arbiter and must stay green.
- **Instruction/agent updated:** `.github/skills/code-review-pass/SKILL.md`
  (axis 3 triage rules). Rule of thumb: analyzer output is a *candidate
  list*, never a delete list — the test suite arbitrates.

### 2026-09-03 — Session memory loss

- **Date:** 2026-09-03
- **Rule violated:** Context Before Action / continuity
- **Affected files:** `/memories/session/plan.md`, `.github/PLAN.md`
- **What happened:** A VS Code chat section failure cleared session memory,
  making the current plan inaccessible and forcing reconstruction from scratch.
- **Correction applied:** Created `.github/PLAN.md` as authoritative,
  versioned plan; added `/memories/` to `.gitignore`; updated
  `.github/copilot-instructions.md`; and created the
  `.github/skills/context-recovery/SKILL.md` skill.
- **Instruction/agent updated:** `.github/copilot-instructions.md`,
  `.github/skills/context-recovery/SKILL.md`

### 2026-09-04 — Plan persisted only to session memory

- **Date:** 2026-09-04
- **Rule violated:** Session Continuity and Plan Recovery
- **Affected files:** `/memories/session/plan.md`, `.github/PLAN.md`,
  `.github/copilot-instructions.md`
- **What happened:** After planning the trust score dashboard, the detailed
  plan was saved only to `/memories/session/plan.md`. The authoritative
  `.github/PLAN.md` still contained the older, high-level plan, creating a
  divergence risk if session memory were lost before implementation.
- **Correction applied:** Synced the trust score dashboard plan into
  `.github/PLAN.md`; updated `.github/copilot-instructions.md` to require
  dual persistence (authoritative + session copy) and to state that
  `.github/PLAN.md` always takes precedence when the two diverge.
- **Instruction/agent updated:** `.github/PLAN.md`,
  `.github/copilot-instructions.md`

### 2026-09-09 — Invented VS Code hooks schema

- **Date:** 2026-09-09
- **Rule violated:** Context Before Action / do not invent APIs
- **Affected files:** `.github/hooks/*.json`, `docs/en/ai-guidelines.md`, `docs/pt-BR/ai-guidelines.md`
- **What happened:** Hooks were created using a non-existent `$schema` URL
  (`https://code.visualstudio.com/schemas/hooks`) and an invented structure
  with `id`, `enabled`, `rules`, `trigger`, `afterEdit`, `userRequest`, and
  `action` fields. The real schema is defined by the GitHub Copilot hooks
  reference. The invented URL is a known-dead reference and remains in this
  log only as a record of the mistake.
- **Correction applied:** Rewrote all hooks to use `{ "version": 1, "hooks": { ... } }`,
  valid events (`preToolUse`, `postToolUse`, `sessionStart`), `command` entries
  with `bash` scripts, and `matcher` filters. Moved implementation logic to
  `.github/hooks/scripts/*.sh`. Consolidated `detect-docs-drift` and
  `validate-command-contract` into `auto-lint-test.json`. Replaced fragile
  `sed` JSON parsing with a shared Node.js helper (`parse-hook-input.js`) to
  avoid malformed payloads bypassing security checks. Updated docs and plans.
- **Instruction/agent updated:** `.github/hooks/*.json`,
  `.github/hooks/scripts/*.sh`, `.github/hooks/scripts/parse-hook-input.js`,
  `docs/en/ai-guidelines.md`, `docs/pt-BR/ai-guidelines.md`, `.github/PLAN.md`,
  `TODO.md`

---

### 2026-09-08 — Subagent lacked file-creation tools

- **Date:** 2026-09-08
- **Rule violated:** Agent customization / tool declarations
- **Affected files:** `.github/agents/*.agent.md`, `.github/skills/subagent-invocation/SKILL.md`, `.github/ai-lessons-learned.md`
- **What happened:** During Phase E, the `docs` agent was invoked via `runSubagent`
  to create 23 new documentation files. The agent declined because its YAML
  frontmatter only declared `read_file`, `replace_string_in_file`,
  `multi_replace_string_in_file`, `grep_search`, and `run_in_terminal`, but not
  `create_file`, `create_directory`, `file_search`, or `list_dir`.
- **Correction applied:** Added `create_file`, `create_directory`, `file_search`,
  and `list_dir` to all agents in `.github/agents/`. Added `fetch_webpage` to
  `security` and `compliance` agents for external reference verification.
  Created `.github/skills/subagent-invocation/SKILL.md` to enforce a pre-flight
  tool check before delegation.
- **Instruction/agent updated:** `.github/agents/*.agent.md`,
  `.github/skills/subagent-invocation/SKILL.md`,
  `.github/ai-lessons-learned.md`

### 2026-09-08 — Subagent governance expanded

- **Date:** 2026-09-08
- **Rule violated:** Subagent Invocation / continuous improvement
- **Affected files:** `.github/skills/subagent-invocation/SKILL.md`,
  `.github/agents/README.md`, `.github/agents/scripts/generate-capability-matrix.js`,
  `.github/agents/agents.sanity.test.js`, `.github/ISSUE_TEMPLATE/ai-tool-gap.yml`,
  `.github/hooks/subagent-invocation.json`,
  `.github/hooks/scripts/subagent-invocation.sh`,
  `.github/hooks/scripts/subagent-invocation.test.js`,
  `docs/en/ai-guidelines.md`, `docs/pt-BR/ai-guidelines.md`
- **What happened:** After fixing the immediate tool-access problem, the same
  class of failure could recur because there was no automated way to detect
  when an agent lacked the tools required for a delegated task.
- **Correction applied:** Expanded `subagent-invocation` into a governance layer:
  added a decision tree, pre/post-delegation checklists, prompt templates,
  anti-patterns, and recovery steps in the skill; created an auto-generated
  agent capability matrix in `.github/agents/README.md` with a generator script;
  added `agents.sanity.test.js` to enforce minimum tool rules per agent domain;
  created an issue template for AI tool gaps; added a lifecycle hook that
  validates `runSubagent` calls and emits educational, warning, or blocking
  context; updated bilingual docs.
- **Instruction/agent updated:** All files listed above plus
  `.github/ai-lessons-learned.md`.

### 2026-10-08 — Date-stamped generated files break drift checks

- **Date:** 2026-10-08
- **Rule violated:** Deterministic, auditable behavior (tests must not depend
  on wall-clock).
- **Affected files:** `.github/skills/scripts/generate-skills-index.js`,
  `.github/skills/README.md`
- **What happened:** The generated skills index embedded `Last generated:
  <date>`, so the drift check (`--check` in `npm test`) failed on the next
  day without any content change — a false positive that would train
  contributors to ignore the check.
- **Correction applied:** the generator no longer embeds the generation date;
  the README points to git history for chronology.
- **Instruction/agent updated:** none — the fix is self-documenting in the
  generator comment and README note.

### 2026-11-03 — Manual file lists drift; guard them with completeness tests

- **Date:** 2026-11-03
- **Rule violated:** Deterministic, auditable behavior / defence-in-depth (a
  gate that cannot see drift is not a gate).
- **Affected files:** `tools/install-defences.js`,
  `tools/install-defences.test.js`
- **What happened:** `FILES_TO_COPY` — the authoritative list of files the
  installer copies to adopters — is manual. Phases H.1, L.1, and L.2 added
  `concurrency.js`, `semver.js`, `update-engines.js`, and `check-npmrc.js`
  without registering them. The adopted toolset would break at `require`
  time, and the `install-defences-dry-run` CI job could not see it because
  it only hashes files already on the list.
- **Correction applied:** missing files registered; new completeness test
  walks the real `tools/` tree and fails unless every file is either in
  `FILES_TO_COPY` or under an explicitly justified `EXCLUDED_FROM_ADOPTION`
  prefix (`tools/e2e/**`).
- **Instruction/agent updated:** none — the test is self-enforcing. Rule of
  thumb: any hand-maintained list that must mirror the filesystem needs a
  test that walks the filesystem.

### 2026-11-03 — Version-coupled test fixtures break on engine bumps

- **Date:** 2026-11-03
- **Rule violated:** Fixtures must be deterministic *and* stable across
  intentional version bumps (educational-code-quality: document hardcoded
  fixture values — these were documented but still coupled to the live pin).
- **Affected files:** `tools/check-engines.test.js`
- **What happened:** The `satisfies` test derived the target version from the
  live `engines` field but hardcoded the neighbor versions (`24.20.0`,
  `11.17.5`, …). Updating engines `24.19.0 → 24.22.2` (Fase L.0) turned a
  `true` expectation into `false` — the first engine bump broke the suite.
- **Correction applied:** Neighbor versions are now computed from the live
  pin (minor/patch ±1), with a comment explaining why; the test survives any
  future engine update/upgrade.
- **Instruction/agent updated:** none — but Fase L.1 (`update-engines.js`)
  must treat "tests with version-coupled fixtures" as a known failure class
  and run the full suite as the final gate after any engine change.

### 2026-10-07 — `context: fork` has no observable effect in VS Code 1.141

- **Date:** 2026-10-07
- **Rule violated:** Validate behavioral claims, not just file correctness.
- **Affected files:** `.github/skills/*/SKILL.md` (6 forked skills),
  `docs/{en,pt-BR}/ai-guidelines.md`
- **What happened:** AI-2.1 added `context: fork` to six skills. The
  frontmatter is spec-valid and the sanity suite is green, but invoking
  `/project-status-evaluation` in both the Copilot SDK harness and the Agents
  Window (VS Code 1.141.0, `skillTool.enabled` on) executed the skill
  inline/background with all intermediate steps visible — no subagent
  indication in either environment.
- **Correction applied:** kept the field (harmless when unsupported, may
  activate in future releases) and documented the observed behavior plus the
  re-validation trigger (VS Code updates) in the bilingual ai-guidelines.
- **Update (2026-11-03, VS Code 1.144.1):** re-tested as scheduled — a forked
  skill (`context-recovery`) loaded inline at session start with no fork
  indication; the 1.144 release notes don't mention `context: fork` at all.
  Same conclusion: field kept, re-validate on the next VS Code update.
- **Instruction/agent updated:** `docs/en/ai-guidelines.md`,
  `docs/pt-BR/ai-guidelines.md`.

### 2026-10-05 — Diagnostics on stdout corrupt the node:test runner

- **Date:** 2026-10-05
- **Rule violated:** Command contracts — stdout must stay machine-parseable.
- **Affected files:** `tools/check-updates.js`, `tools/check-updates.test.js`
- **What happened:** Making the offline/sync warnings unconditional (Fase F.0)
  printed ℹ️/⚠️ messages to stdout mid-TAP-stream; the parent `node --test`
  runner failed with "Unable to deserialize cloned data due to invalid or
  unsupported version" and the whole `tools/integration.test.js` file died.
- **Correction applied:** Routed all safety diagnostics to stderr
  (`console.error`) — semantically correct, keeps stdout clean for
  `--format=json`, and keeps warnings visible under `--silent`.
- **Instruction/agent updated:** None; the rule is now encoded in the
  `check-updates.js` header comment and covered by tests asserting the
  stderr channel.

### 2026-10-05 — Prompt files removed in VS Code 1.140

- **Date:** 2026-10-05
- **Rule violated:** AI customizations must stay compatible with the supported
  VS Code customization surface.
- **Affected files:** `.github/prompts/*.prompt.md` (deleted),
  `.github/skills/*/SKILL.md`, `docs/en/ai-guidelines.md`,
  `docs/pt-BR/ai-guidelines.md`
- **What happened:** VS Code 1.140 removed support for
  `.github/prompts/*.prompt.md`. An uncommitted conversion moved the nine
  prompts into `.github/skills/` but kept redundant `description` fields equal
  to the skill name and prompt-style placeholders, and left 18 broken links in
  the bilingual AI guidelines, which made `npm test` fail. The fourteen
  pre-existing skills also used the legacy experimental format (`name` in Title
  Case, `applyTo`, `tools`), which VS Code silently fails to load because the
  `name` did not match the folder name.
- **Correction applied:** Rewrote all skill frontmatters to the Agent Skills
  specification (kebab-case `name` equal to the folder, descriptive
  `description` with what/when, `argument-hint` where input is expected),
  merged five overlapping prompt/skill pairs into single skills, updated all
  references, and added `.github/skills/skills.sanity.test.js` to `npm test` so
  spec violations fail loudly in CI instead of silently in the IDE.
- **Instruction/agent updated:**
  `.github/instructions/file-organization.instructions.md`,
  `.github/agents/repository-organization.agent.md`,
  `.github/skills/self-review/SKILL.md`,
  `docs/en/ai-guidelines.md`, `docs/pt-BR/ai-guidelines.md`.

---

## Review Cadence

Review this log at the end of each phase or before tagging a release. If the same mistake appears more than once, update the top-level `.github/copilot-instructions.md` or the relevant domain-specific instruction/agent file.
