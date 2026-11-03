# AI Observability

Every Copilot hook in this repository appends one JSON object per event to a local, gitignored log: `.github/hooks/scripts/observability.jsonl`. This page explains how to read it — and why it exists.

## Why it exists

The hooks fire invisibly: a blocked `npm install` here, a write-guard warning there. The log makes the invisible visible, answering questions like *"how many times did the defenses protect me this month?"* with data instead of impressions. It also feeds decisions about which advisory rules deserve to become blocking gates (repeated warnings that never get acted on are candidates; so are warnings that always get fixed on the spot).

## Entry format

One JSON object per line (JSONL). Fields:

| Field | Meaning |
| --- | --- |
| `at` | ISO-8601 timestamp (added by the logger when absent) |
| `hook` | Hook script name (e.g. `enforce-security`, `warn-oversized-commit`) |
| `event` | Lifecycle event (`sessionStart`, `preToolUse`, `postToolUse`) |
| `action` | `fired` (informational), `suggest` (advice emitted), `warn` (deliberate friction), `block` (denied call) |
| `reason` | Why the hook acted (blocks and warnings) |
| `snippet` | Short prefix of the blocked command (only `enforce-security` blocks) |

## Reading the log

The quick way — the summary script:

```bash
node .github/hooks/scripts/observability-summary.js
```

```text
Hook observability — 42 event(s)
  window: 2026-11-03T12:00:00.000Z → 2026-11-03T18:00:00.000Z

  By action:
    fired: 30
    suggest: 9
    block: 3

  By hook:
    inject-context: 30
    enforce-security: 3
    ...

  🛡️  The defenses blocked 3 dangerous call(s).
```

Machine-readable (for your own analysis):

```bash
node .github/hooks/scripts/observability-summary.js --format json
```

Or query the raw JSONL with `jq`:

```bash
# every block, newest last
jq -c 'select(.action == "block")' .github/hooks/scripts/observability.jsonl

# blocks by reason
jq -r 'select(.action == "block") | .reason' .github/hooks/scripts/observability.jsonl | sort | uniq -c | sort -rn
```

## Properties

- **Local only:** the file is gitignored and never leaves your machine.
- **Bounded:** the logger keeps at most 5,000 entries (oldest dropped first), so the log never grows without limit.
- **Never in the way:** logging errors are swallowed — a full disk cannot break a commit hook.
- **Signal, not noise:** hooks log when they act (suggest/warn/block/fire); silent passes are not recorded. Skill invocations by the model are not observable by hooks and are therefore not logged — the log covers the deterministic layer only.
- **Superseded:** the older `security-blocks.log` (blocks only) was migrated into this unified log in Fase AI-3.3.
