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

### 2026-10-08 — Document, don't extract, the formatters and CLI patterns

- **Decision:** Do not create `tools/lib/formatters.js` or
  `tools/lib/cli.js`; document the conventions instead.
- **Context:** Phase H originally planned to extract both. Real data showed the
  report formatters are domain-specific per tool (a license table is not an
  SBOM table) and `parseCliArgs` is a 3-line convention
  (`argv.includes('--flag')`) repeated with heterogeneous flags. A shared
  module would be a false abstraction.
- **Rejected alternative:** Extract anyway for uniformity — adds indirection
  without removing duplication, and every tool would still need its own
  rendering logic.
- **Consequences:** The rule is "extract only byte-identical implementations
  used by more than one file" (as done for `tools/lib/concurrency.js`); the
  conventions are documented in `docs/{en,pt-BR}/repository-organization.md`.

### 2026-10-08 — Zero required approvers while the project has a single maintainer

- **Decision:** Branch protection on `main` and `dev` requires PRs, code-owner
  review, and the 11 CI status checks, but the minimum *approving review count*
  is 0 — a solo maintainer cannot approve their own PR.
- **Context:** With count = 1 the CODEOWNERS flow deadlocked: the only code
  owner is also the PR author, so no merge could ever complete.
- **Rejected alternative:** Keep count = 1 — makes the repository unmergeable
  in practice and teaches a rule that cannot be followed.
- **Consequences:** The CODEOWNERS requirement (which paths need owner review)
  and the status checks remain fully active; the flexibility is documented as
  **temporary** and must be revisited when the project gains additional
  maintainers or reviewers. This is a conscious governance trade-off, not a
  removal of the layer.

### 2026-10-08 — Generated files never embed a generation date

- **Decision:** `generate-skills-index.js` omits `Last generated:`; chronology
  comes from git history.
- **Context:** The drift check failed the next day with zero content change —
  a false positive that would train contributors to ignore the guard.
- **Rejected alternative:** Normalize the date in the drift comparison — keeps
  a value with no informational purpose.
- **Consequences:** Drift checks are deterministic; the rule applies to any
  future generated file.

### 2026-11-03 — npm version always tracks the Node.js bundled release

- **Decision:** `engines.npm` is always the npm version bundled with the
  adopted Node.js release (e.g., Node 24.22.2 → npm 11.19.1; Node 26.13.0 →
  npm 11.20.0) — never a standalone `npm@latest` install.
- **Context:** The project uses nvm and treats the Node release as the unit of
  trust; the bundled npm is the combination the Node.js project itself tested
  and shipped. `npm@latest` (12.2.1) is ahead of what any LTS bundles.
- **Rejected alternative:** Track `npm@latest` independently — introduces an
  untested Node/npm combination and breaks reproducibility between local (nvm)
  and CI (`setup-node`), which both install the bundled pair.
- **Consequences:** Engine tooling (Fase L, `update-engines.js`) reads the
  bundled npm from `nodejs.org/dist/index.json`; a single source of truth
  drives both engines entries.

### 2026-11-03 — Engine management (Fase L) runs before the docs phase (Fase I)

- **Decision:** The new Fase L executes first in the remaining sequence: an
  immediate manual update `24.19.0 → 24.22.2` (L.0), then the
  `update-engines.js` tooling (L.1). The v26 major upgrade waits for the tool.
- **Context:** The Node.js security release of 2026-10-21 fixed 8 CVEs (4
  High, including a Brotli OOB write with RCE potential); the pinned 24.19.0
  predates every fix. A supply-chain defense project cannot teach currency
  while running an unpatched runtime.
- **Rejected alternative:** Fold engine bumps into routine phase work — a
  security release would wait for unrelated documentation phases.
- **Consequences:** Node security releases become a forcing function for an
  immediate patch-bump PR; CI compatibility is proxied by presence in
  `nodejs.org/dist/index.json` (the same source `actions/setup-node` uses).

### 2026-11-03 — Scaffolding features target v1.1.0; dogfooding stays pre-release

- **Decision:** M.2 (full project scaffolding) and M.3 (AI-infrastructure-only
  scaffolding) are post-v1.0.0 (v1.1.0 scope); M.1 (dogfooding
  `install-defences.js` on `../setup-webpack-stylus-liquid/`) stays
  pre-release, between AI-3.1 and K.
- **Context:** Scaffolding is a large new feature surface; adding it before
  v1.0.0 would delay the release indefinitely. Dogfooding the existing
  installer, by contrast, is *validation* of a feature that ships in v1.0.0.
- **Rejected alternative:** Everything before v1.0.0 (scope creep) or
  everything after (shipping an installer never exercised on a real external
  project).
- **Consequences:** v1.0.0 keeps a bounded scope; the VS Code 1.144
  marketplace/Browse channel is evaluated later as a distribution option for
  the scaffolding features.

### 2026-11-03 — Commit granularity is advisory-only, with fixed thresholds

- **Decision:** The one-commit-one-intent rule is normative (always-on
  instructions + CONTRIBUTING) and is reinforced by the
  `warn-oversized-commit` hook, which **warns but never blocks**. Thresholds:
  8 staged files, 400 changed lines (added + deleted), 2 path domains
  (`docs/en` + `docs/pt-BR` count as one domain, since a bilingual pair is a
  single intent).
- **Context:** The maintainer observed AI commits accumulating multiple
  features/fixes, hurting reviewability and revertability. Thresholds need
  concrete numbers to be enforceable; the chosen values tolerate typical
  single-intent changes (a tool + its tests + its two doc pages ≈ 4–6 files)
  while catching accumulation. Mechanical bumps that legitimately span files
  (engine updates) stay possible because nothing is blocked.
- **Rejected alternative:** Hard blocking above the thresholds — a version
  bump touching `package.json` + lockfile + 20 doc files is one legitimate
  intent, and a blocking gate would force artificial splits or bypasses.
- **Consequences:** The hook output always includes the split procedure
  (repair-oriented); thresholds are env-overridable mainly so tests stay
  small; the rule applies equally to humans (CONTRIBUTING) and AI
  (copilot-instructions).

### 2026-11-03 — min-release-age=7: native npm age gate, formalized retroactively

- **Decision:** Keep `min-release-age=7` in `.npmrc` as a native npm layer
  alongside the custom `check-package-age.js`, and document the tradeoff
  explicitly: when the age window blocks a security patch, npm fails
  **closed** — it keeps the old (vulnerable) version, warns, and exits
  non-zero. Emergency escape: temporary `min-release-age-exclude[]=<pkg>`.
- **Context:** The setting was already adopted before this ADR existed
  (retroactive formalization, Fase L.3). The 7-day value matches the custom
  age gate so both layers agree; the custom tool still adds what npm cannot:
  reporting, intermediate-version discovery, and quarantine classification.
- **Rejected alternative:** Rely only on the custom tool (single point of
  failure) or only on npm's setting (no reporting, no intermediates, and the
  fail-closed behavior is invisible without docs).
- **Consequences:** Two independent age gates enforced at different layers
  (config and tooling); the tradeoff "wait out the compromise window × patch
  fast" is a documented teaching point in `npmrc-hardening.md` with the
  exclusion escape hatch.

### 2026-11-03 — Node --permission is not an install-time sandbox

- **Decision:** Do not adopt Node's Permission Model (`--permission`, stable
  since v22.13/v23.5) as a sandbox for untrusted `npm install` lifecycle
  scripts. If ever used, position it as runtime hardening for already-vetted
  code, paired with OS-level isolation.
- **Context:** Node's own documentation states the feature "does not protect
  against malicious code"; it has symlink-escape and file-descriptor
  limitations, worker threads do not inherit it reliably, and the October
  2026 security release patched two permission-model bypass CVEs
  (CVE-2026-106071 wildcard over-grant, CVE-2026-106073 realpathSync gap).
- **Rejected alternative:** Wrap `npm install`/`npm update` in `--permission`
  as the sandbox called for by the P3 "optional sandbox mode" idea — that
  would teach a control its own vendor disclaims, right after it was
  exploited twice.
- **Consequences:** The P3 sandbox idea, if pursued, must use OS-level
  isolation (containers, namespaces, bubblewrap); the permission model may
  only ever be a complementary layer for running vetted code, and this ADR is
  the reference when the topic resurfaces.

### 2026-11-03 — Unified hook observability log is local-only and bounded

- **Decision:** All Copilot hooks append JSONL events to a single gitignored
  file (`.github/hooks/scripts/observability.jsonl`) via a shared logger;
  the legacy `security-blocks.log` was migrated into it. The log is capped at
  5,000 entries (oldest dropped), and logging errors are always swallowed.
- **Context:** Hook enforcement was invisible — there was no way to answer
  "how often did the defenses fire?" The summary script turns the log into
  the teaching payoff. Unbounded logs become a disk problem; failing log
  writes would break commit hooks; committing the log would leak local
  command history.
- **Rejected alternative:** Per-hook log files (the status quo) — fragmented
  and only covered blocks; and logging every silent pass — noise that would
  drown the signal and grow the file with zero informational value.
- **Consequences:** `observability-summary.js` reports counts by hook and
  action; skill invocations by the model are not hook-observable and stay
  unlogged (documented limitation); hook tests redirect the log via
  `OBS_LOG_FILE` so suites never pollute the real file.

### 2026-11-03 — Non-registry dependencies are classified, never failed by registry gates

- **Decision:** Git/file/URL dependencies are reported in their own
  advisory sections by `check-package-age` (SKIP) and
  `check-lockfile-integrity` (informational), instead of failing as
  registry lookup errors or missing integrity.
- **Context:** Fase M.1 dogfooding on a real project with a git-URL
  dependency failed both gates with confusing messages. Git deps pin by
  commit in the resolved URL — that IS their integrity mechanism; publish
  dates do not exist for them.
- **Rejected alternative:** Fail hard (previous behavior) — punishes
  legitimate setups and teaches users to disable the gate.
- **Consequences:** The gates remain strict for registry packages and honest
  about what they cannot verify; the advisory text tells the user to verify
  non-registry deps manually. npm v12's `allow-git=none` default is noted in
  the npmrc-hardening guide as the stricter posture available.

### 2026-11-03 — AI-3.1: inject-context optimization is a documented don't-do

- **Decision:** Do NOT add mtime-based caching to the `inject-context` hook.
  The optimization stays unimplemented; this ADR is the deliverable.
- **Context:** The hook was flagged as a possible per-request cost. Measured
  (now reproducible via `defence:measure-ai-context`): the sessionStart
  payload is 143 bytes (~36 tokens) once per session, and five runs take
  ~480 ms total (~96 ms each, once per session start).
- **Rejected alternative:** Cache engines/TODO/manifest counts by source-file
  mtime — saves ~90 ms once per session and ~0 tokens, at the price of
  invalidation complexity and a new stale-data failure mode (a cached TODO
  count lying after a pull is worse than 90 ms).
- **Consequences:** The hook stays simple and always-fresh; the measurement
  channel in `measure-ai-context.js` lets any future re-evaluation compare
  against today's numbers instead of re-arguing from estimates.

### 2026-11-03 — The model is not the security boundary; payloads are validated before trust

- **Decision:** Two-layer defense against prompt injection and malicious
  external content: (1) deterministic hooks are the enforcement boundary —
  proven by a smoke suite that simulates a fully compromised model;
  (2) external payloads (npm packuments, Node.js dist index) are
  shape-validated by `tools/lib/validate-external-content.js` before driving
  any security decision, with poisoned-cache self-healing (one forced
  re-fetch).
- **Context:** APPA's reference monitor (arXiv:2607.24625) separates
  pre-dispatch evaluation from output validation. Our hooks already covered
  pre-dispatch; tools trusted registry data blindly — a manipulated publish
  date could bypass the age gate, and a malformed dist entry could be written
  into `engines`.
- **Rejected alternative:** Model-level "don't follow injections"
  instructions as the primary defense — they are guidance, not enforcement.
- **Consequences:** The age/update/engine decisions no longer trust
  unvalidated payloads; the injection smoke suite is regression evidence in
  `npm test`; the model document lives in ai-guidelines (EN/PT).

### 2026-11-03 — Dead-code detection is an advisory tool, never a hard gate

- **Decision:** `check-dead-code.js` always exits 0 and reports *candidates*
  with triage rules (unexport-if-internal, keep-with-test for extension
  points, full suite as arbiter). It is not wired as a blocking gate.
- **Context:** Static analysis of this codebase's CommonJS idioms (DI
  contracts, alias-indirected test harnesses, inline `require().member()`
  access) cannot prove unreachability; the first scanner version produced
  false positives that broke 35 tests when acted on mechanically.
- **Rejected alternative:** A `--fail` gate in CI — would either block
  legitimate DI-contract exports or force annotations everywhere, adding
  noise to a learning resource.
- **Consequences:** The baseline is zero candidates (2026-11-03 cleanup:
  41 unexports of internal-only symbols, 2 full deletions, 4 exports kept
  with new direct tests); the scanner runs on demand via the
  `code-review-pass` skill, and its parser is hardened against the
  codebase's real consumption patterns.

### 2026-11-04 — "Restrict updates" belongs to frozen refs, never to merge targets

- **Decision:** The `main`/`dev` branch rulesets must NOT enable
  "Restrict updates"; the full, intentionally identical ruleset inventory
  for both branches is documented in
  `docs/{en,pt-BR}/repository-organization.md`.
- **Context:** During the v1.0.0 release, `main` had "Restrict updates"
  enabled with an empty bypass list. Merging the release PR counts as a ref
  update, so the merge was blocked with "Cannot update this protected ref"
  even with all 24 checks green and approvals at 0.
- **Rejected alternative:** Keeping the rule and adding the maintainer to
  the bypass list — a bypass that always applies to the only person who
  merges is indistinguishable from not having the rule, and it makes
  `main`/`dev` diverge from the documented model.
- **Consequences:** The release merged after the rule was removed; the
  documented inventory now doubles as a checklist when reproducing the
  protection in another repository (Fase M adopters).

### 2026-11-05 — Post-release: archive completed phases out of PLAN/TODO

- **Decision:** After each release, completed phases leave the body of
  `.github/PLAN.md` and `TODO.md`; PLAN keeps them as a "Histórico" archive
  section and TODO keeps only open work. The permanent rule lives in PLAN
  § Regras permanentes.
- **Context:** By v1.0.0 the two files totalled 1,618 lines; the maintainer
  reported them unreadable as operational dashboards. Detail was already
  triple-redundant (CHANGELOG, DECISIONS, merged PRs).
- **Rejected alternative:** Deleting the history outright — the narrative of
  *why* phases existed aids future audits and the project's teaching goal.
- **Consequences:** TODO drops from 852 to ~490 lines (open work only, plus
  the dated Node.js security-release reminder and the explicit execution
  queue); PLAN keeps the archive below the fold. Repeat the cleanup at every
  release boundary.

### 2026-11-05 — Extract shared output primitives (Phase N), keep domain rendering per tool

- **Decision:** Create `tools/lib/formatters.js` with the byte-identical
  output elements of every defence tool: status symbols (✓/✗/⚠/○), aligned
  labels (OK/FAIL/WARN/SKIP), the structured end-of-run summary
  (passed/failed/warned/skipped + next suggested command), the
  `--quiet` flag convention (`--silent` kept as a compatibility alias), and
  native ANSI colors gated on TTY/NO_COLOR/FORCE_COLOR. Domain-specific
  report rendering (license tables, SBOM documents) stays in each tool.
- **Context:** Fase N (output UX) found an inconsistent vocabulary across
  tools — emoji in check-sync/check-licenses, bare words
  (OK/SKIP/BLOCKED) in check-package-age, no summary anywhere, and 12 tools
  with `--silent` while the rest had nothing. The 2026-10-08 ADR rejected
  extracting formatters because *report* formatters are domain-specific;
  the elements above are instead byte-identical in intent, which is exactly
  what that ADR's own rule allows ("extract only byte-identical
  implementations used by more than one file").
- **Rejected alternative:** Standardizing by convention alone (reaffirming
  2026-10-08) — the summary block and TTY color detection are non-trivial
  logic that would drift across 25 tools if copied by hand.
- **Consequences:** New tools get a consistent, greppable output contract
  for free; the 2026-10-08 ADR is amended, not reversed (domain rendering
  is still per-tool). Emoji were dropped from status output because they
  are double-width and break column alignment. Applied to the three pilot
  tools (check-sync, check-licenses, check-package-age) first; the
  remaining tools follow in batches.

### 2026-11-05 — update-engines: skip malformed dist entries; fail-closed only on decision-relevant ones

- **Decision:** `sanitizeDistIndex` splits the official Node.js dist index
  into valid entries and per-entry skip records. Every `update-engines`
  mode skips invalid entries with a WARN on stderr (JSON report exposes a
  `skipped` field). Apply modes (`--update`/`--upgrade`/`--to`) abort only
  when a skipped entry could affect the target decision — a well-formed
  `vX.Y.Z` version with major ≥ the current one. Candidate selection also
  ignores anything that is not strict stable semver (`X.Y.Z`), so
  pre-releases never reach `package.json`.
- **Context:** The entry `v27.0.0-alpha.0.0.0` (published 2026-10-29)
  aborted the whole report run via `validateDistIndex`, blocking the
  2026-11-11 security-release procedure. Live inspection showed 13 more
  permanently malformed historical entries (v0.6.x–v11.6.0, 2011–2018,
  bundled npm with alpha/beta/next suffixes) that upstream will never fix,
  so whole-index fail-closed would break apply modes forever.
- **Rejected alternative:** Whole-index fail-closed in apply modes (first
  proposal) — permanently unusable given the historical entries. Fail-open
  everywhere — a malformed `v24.x` entry with a well-formed version could
  hide the real security-release target we meant to apply.
- **Consequences:** Report and dry-run validate live against the real
  index again; the L.0 procedure for 2026-11-11 is unblocked. The
  relevance rule keeps the security property: engines are never written
  from a decision that untrusted data may have influenced.

### 2026-11-05 — Releases run in an isolated git worktree

- **Decision:** All release work (version bump, release PR dev→main,
  tagging, post-release verification) executes in an isolated git
  worktree, never in the main checkout. `git fetch --all --prune` is the
  non-negotiable first step before cutting the release branch from
  `origin/dev`.
- **Context:** Multiple parallel AI sessions share the main checkout (five
  active sessions observed on 2026-11-05, two with feature branches
  checked out). A branch switch by another session mid-release would
  corrupt the validation gates and their recorded evidence. The
  maintainer mandated the rule at the v1.1.0 release start.
- **Rejected alternative:** Reusing the main checkout, as done for
  v1.0.0 — safe only when no other session is active, which is no longer
  the norm.
- **Consequences:** The release-checklist skill (step 1), the bilingual
  release checklist pages and the project-wide AI instructions make the
  worktree mandatory. Cost: a fresh `npm ci` per release and worktree
  cleanup at the end; benefit: full isolation from concurrent sessions.

### 2026-11-05 — Merge-back main→dev after every release, via an intermediate branch

- **Decision:** After each release merge into `main`, bring `main`'s tip
  back into `dev` immediately: cut an intermediate branch from `dev`'s
  tip, `git merge --no-ff origin/main`, and merge it back through a PR.
  Never a direct `main` → `dev` PR; never the GitHub "Update branch"
  button on a protected head branch.
- **Context:** The v1.1.0 release PR (`dev` → `main`) was blocked as out
  of date because the v1.0.0 merge commit (`f99969e`) never returned to
  `dev`. Both rulesets require "branches up to date before merging" and
  PR-only changes, which makes the direct PR circular (the head can never
  be up to date with the base it updates) and the button's server-side
  merge a ruleset violation.
- **Rejected alternatives:** Direct `main` → `dev` PR (circular); the
  "Update branch" button (rejected by the ruleset, correctly); disabling
  the up-to-date requirement on `main` (weakens the protection that
  forces green evidence).
- **Consequences:** Release-checklist skill step 12 and the bilingual
  release checklist pages document the exact commands; `dev` always
  contains `main`'s tip, so the next release PR opens mergeable. First
  applied as PR #42.

### 2026-11-06 — Full Gitflow with plain git commands (no plugin)

- **Decision:** Adopt the complete Gitflow model — `main`, `dev`,
  `feat|fix|docs|chore|ci/*`, `release/X.Y.Z`, `hotfix/*` — documented with
  copy-pasteable commands and mermaid diagrams in
  `docs/{en,pt-BR}/git-workflow.md`. No `git-flow` plugin or extension: the
  model is a convention, and the plain commands are the teaching material.
- **Context:** The 2026-11-05 incidents (stale-dev PR, delivery left
  uncommitted) showed the workflow lived in habit, not in writing. The
  maintainer also wants the model ready to scale beyond a solo project and
  to ship as scaffolding (M.2/M.3) to other projects — where a documented,
  tool-free convention is adoptable verbatim.
- **Rejected alternative:** Gitflow-lite (only naming + hotfix). It covered
  today's pain but not the educational and scaffolding goals; and the
  `git-flow` plugin was rejected because it wraps the same commands while
  adding an install-time dependency our own gates would have to vet.
- **Consequences:** The six-step delivery choreography is graduated to the
  always-on instructions (it had failed twice while living only in
  ai-lessons-learned); `release/*` branches formalize what the v1.0.0/v1.1.0
  releases already did ad hoc (isolated worktree + merge-back ADR
  2026-11-05); `hotfix/*` from `main` is now the defined emergency path.

### 2026-11-12 — Microsoft Copilot Cowork case study: convergences and adopted improvements

- **Decision:** After comparing the six Copilot Cowork practices
  (commandline.microsoft.com case study, 2026-11-02) against this
  repository's AI infrastructure, adopt three improvements: (P1) the
  "gates must prove they checked something" convention — every new or
  changed gate ships with a test that makes it fail, and existing gates get
  an audit; (P2) a three-field spec template (what it does / how we know it
  works / what it must not break) for P0/P1 queue items; (P2) the case
  study linked in `references.md`. Items noted for later: merge-conflict
  shaping (P3) and the Lesson-6 loop-design checklist attached to the
  existing automations backlog item.
- **Context:** The case study independently validates our architecture —
  "the host decides, the model never holds credentials" mirrors the APPA
  boundary (AI-3.2) and our hooks-as-boundary ADR; their rule files mirror
  ai-lessons-learned + instructions graduation. Their Lesson 3 (a size
  check that stayed green while exceeded, via `| tail`) is the same failure
  class as our transitive age-gate no-op found by the release checklist —
  we found ours first, but their two-part rule generalizes the fix.
- **Rejected alternative:** Adopting the parallel-work codebase shaping
  (Lesson 5, crate-role rules + ratchets) — over-engineering for a solo
  maintainer with sequential sessions; revisit if contributors or parallel
  agents arrive.
- **Consequences:** testing instructions gain the prove-it-fails
  convention; the TODO gains a spec-template item; future autonomous
  automations inherit the targets-and-limits checklist by reference.

### 2026-11-12 — Gates prove they check: audit results and the written convention

- **Decision:** The Cowork Lesson-3 convention is now written into
  `.github/instructions/testing.instructions.md` (failing-path test in the
  same commit as any gate change; revert-and-retest as evidence). The audit
  of the 12 blocking gates (pre-commit + CI) found **all of them already
  covered** by explicit failing-path tests — e.g. `main returns 1 when
  broken links exist` (check-md-links), `detects AWS access key`
  (check-secrets), `returns out of sync when packageLockHash differs`
  (check-sync), 20 failure-path tests in check-package-age including the
  v1.0.0 no-op regression.
- **Context:** The P1 queue item from the Copilot Cowork case study asked
  for the convention plus an audit. The audit's job was to confirm, not to
  fix — the v1.0.0 age-gate incident had already forced the habit.
- **Rejected alternative:** Building a meta-gate that mechanically verifies
  every gate has a failing test (a "check that checks the checks") — the
  naming convention is inconsistent enough that a static rule would produce
  false positives; the written convention + code review is proportionate
  for a solo maintainer.
- **Consequences:** New gates inherit the obligation by instruction; the
  audit result is dated here so future audits can diff against it.

### 2026-11-12 — A dated section dies when its last item closes (TODO/PLAN hygiene)

- **Decision:** TODO.md lists only open work; PLAN.md carries a lean TL;DR
  (state + next milestone) and moves the accumulated dated diary into the
  § Histórico archive. New permanent hygiene rule: a dated section
  ("Próximos passos de <data>", "Fila de <data>") is dissolved into the
  permanent structure the moment its last item closes — it never
  accumulates.
- **Context:** The maintainer reported (2026-11-12) that TODO.md (568
  lines) and PLAN.md (840 lines, 77-line TL;DR) were hard to read and hid
  what is done vs. open. Root cause: my 2026-11-05 post-release cleanup
  archived *phases* but I then kept appending new dated sections instead of
  dissolving them on completion — recreating the accumulation the cleanup
  meant to remove. My process error, recurring.
- **Rejected alternative:** A scheduled "cleanup every N weeks" — reactive;
  the rule that a section dies with its last item prevents accumulation at
  the source instead of sweeping it later.
- **Consequences:** TODO.md 568 → 58 lines (8 open items: M.2, M.3, 6 live
  P3s with deferral justifications); PLAN.md TL;DR 77 → 15 lines. The
  maintainer's disclosure question is answered in the TL;DR (ready since
  v1.0.0; disclosure after v1.2.0). Lesson recorded in
  ai-lessons-learned.md.
