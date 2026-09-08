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

---

## Review Cadence

Review this log at the end of each phase or before tagging a release. If the same mistake appears more than once, update the top-level `.github/copilot-instructions.md` or the relevant domain-specific instruction/agent file.
