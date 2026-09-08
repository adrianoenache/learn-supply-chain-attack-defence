---
description: |
  Guidelines for invoking specialized agents and verifying that they have the
  tools they need before delegation. Use this skill whenever you call a subagent
  via `runSubagent` to create, edit, audit, or review files.
  Keywords: subagent, agent invocation, tools, delegation, runSubagent, agent check.
tools:
  - read_file
  - grep_search
  - list_dir
---

# Subagent Invocation

This skill prevents failed delegations by checking an agent's declared tool set
before asking it to perform work.

## When to invoke a subagent

Use `runSubagent` when the task:
- Requires expertise mapped to a domain agent in `.github/agents/` (docs, security,
  compliance, performance, etc.).
- Touches many files or needs deep exploration, so delegating keeps the main
  conversation focused.
- Can be expressed as a single, self-contained instruction with a clear deliverable.

## How to invoke a subagent

1. **Choose the right agent by domain**, not by file extension. Examples:
   - Documentation changes → `docs`
   - Security review → `security`
   - CLI/subprocess changes → `command-execution`
   - License/SBOM/release readiness → `compliance`
   - Performance/caching → `performance`
   - Project structure/orphans → `repository-organization`
   - Code quality/tests → `quality`
   - Educational review → `code-review`
   - Status report/release evaluation → `project-evaluation`

2. **Check the agent's tool list** in `.github/agents/<domain>.agent.md` before
   delegating. If the agent lacks a tool required for the task, either:
   - perform the work yourself in the main conversation, or
   - ask the user to authorize the tool addition to that agent.

3. **Pass the absolute repository path** and a precise, read-only or write-only
   mandate in the prompt. Never ask a subagent to run commands that modify the
   repository unless its tool list includes `run_in_terminal` and the task
   genuinely requires it.

4. **Require the subagent to report** the absolute paths of created or modified
   files in its final response, so you can validate the result.

## Default tool checklist by task type

| Task | Required tools the agent must declare |
| --- | --- |
| Create new files/directories | `create_file`, `create_directory` |
| Edit existing files | `replace_string_in_file` or `multi_replace_string_in_file` |
| Search for files by pattern | `file_search` |
| List directory contents | `list_dir` |
| Read specific files | `read_file` |
| Search file contents | `grep_search` |
| Run validation commands | `run_in_terminal` |
| Fetch external references | `fetch_webpage` |

## Common failure modes

- **"I don't have file tools"** — the agent's YAML frontmatter lacks `create_file`,
  `create_directory`, or `replace_string_in_file`.
- **"I can only read"** — the agent only declares `read_file` and `grep_search`;
  do not ask it to write files.
- **Agent not found** — the `agentName` passed to `runSubagent` must match the
  stem of a file in `.github/agents/` (e.g., `docs`, not `docs.agent.md`).

## Recovery

If a subagent reports missing tools:
1. Note the task and the agent that failed.
2. Update the agent's `tools:` list in `.github/agents/<domain>.agent.md`.
3. Record the incident in `.github/ai-lessons-learned.md`.
4. Re-run the delegation or complete the task in the main conversation.
