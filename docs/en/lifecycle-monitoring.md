# Lifecycle Process Monitoring

The `defence:install-monitored` command watches every subprocess that `npm install` (or `npm ci`) spawns while it runs. It records each `spawn`, `spawnSync`, `exec`, and `execSync` call, classifies it by risk, and writes a Markdown or JSON report.

## Why it matters

`ignore-scripts=true` in `.npmrc` prevents npm from running `preinstall`, `install`, `postinstall`, and `prepare` scripts in most situations. However, some packages bypass npm's script mechanism by spawning their own shell or Node.js processes during install, and the `ignore-scripts` flag does not cover every edge case. Process monitoring gives you a complete audit trail of what actually ran.

This is a **runtime observation** layer, not a static scan. It complements the pre-install [lifecycle script analysis](security/lifecycle-script-analysis.md) by showing what happened during the real install.

## What is recorded

For each subprocess the monitor captures:

- command and arguments (truncated to `maxArgsLength`)
- working directory
- parent PID
- child PID (when available)
- exit code or signal
- duration
- `npm_lifecycle_event` and `npm_package_name` from the environment
- risk labels

## Risk labels

| Label | Trigger |
| --- | --- |
| `lifecycle` | The child inherited an npm lifecycle event such as `preinstall`, `install`, `postinstall`, or `prepare`. |
| `shell` | The command is a shell interpreter (`sh`, `bash`, `zsh`, `cmd`, `powershell`, `pwsh`, etc.). |
| `network` | The command can make outbound requests and the arguments contain `http`, `https`, `require(`, `import(`, or `fetch(`. |
| `permission` | The command changes ownership or permissions (`chmod`, `chown`, `sudo`, `su`, etc.). |
| `filesystem-write` | The command writes or deletes files (`cp`, `mv`, `rm`, `mkdir`, `touch`, etc.). |
| `native-build` | The command compiles native code (`node-gyp`, `make`, `cmake`, `gcc`, `clang`, `python`, etc.). |
| `unknown` | No other label matched. |

A single event can have multiple labels.

## Usage

```bash
# Default Markdown report written to lifecycle-monitor-report.md
npm run defence:install-monitored -- npm install

# Custom output file
npm run defence:install-monitored -- --output=reports/install.md npm install

# JSON output
npm run defence:install-monitored -- --format=json --output=report.json npm install

# Suppress stdout from the monitored command
npm run defence:install-monitored -- --silent npm install

# Fail if any lifecycle script is spawned
npm run defence:install-monitored -- --fail-on-lifecycle npm install
```

You can also run the underlying module directly:

```bash
node ./tools/monitor-install.js --output=report.md npm install
```

## Integration with `defence:add`

`tools/add-package.js` automatically monitors the `npm install` step it runs. After installation finishes, it writes the report to the path configured in `lifecycleMonitoring.reportFile` and prints a summary such as:

```text
Install monitor: 12 event(s), 2 lifecycle script(s). Report: lifecycle-monitor-report.md
```

If `lifecycleMonitoring.failOnLifecycle` is `true` and a lifecycle event is recorded, the installation aborts.

## Integration with `defence:bootstrap`

`tools/setup-bootstrap.js` also monitors its first `npm install` step, because a fresh clone with no lock file is one of the riskiest moments in the dependency lifecycle. The same `lifecycleMonitoring` settings apply.

## Configuration

Add a `lifecycleMonitoring` block to `package.json`:

```json
"lifecycleMonitoring": {
  "enabled": true,
  "reportFile": "lifecycle-monitor-report.md",
  "failOnLifecycle": false,
  "maxArgsLength": 200
}
```

- `enabled` — set to `false` to skip monitoring and report generation.
- `reportFile` — path to the Markdown report. JSON output is unaffected.
- `failOnLifecycle` — when `true`, aborts the install if any `lifecycle` event is recorded.
- `maxArgsLength` — maximum number of characters to record for each command's arguments.

## Report format

The Markdown report contains:

1. A summary header with the monitored command, timestamp, exit code, and duration.
2. A risk table counting events per label.
3. A full event table with time, command, arguments, lifecycle event, labels, PID, exit, and duration.
4. Conditional recommendations based on the labels observed.

The JSON format contains the same summary plus the raw event array for programmatic analysis.

## Relationship to other defenses

- **Layer 6 — Hardened `.npmrc`**: `ignore-scripts=true` is the primary protection. Monitoring proves it is working (or catches the exceptions).
- **Lifecycle script analysis**: static analysis predicts risk before install; monitoring records what actually happened.
- **Trust score dashboard**: lifecycle script risk is one input to the trust score.

## Limitations

- The monitor hooks the Node.js `child_process` module inside the process that starts the monitor. It cannot see processes created by already-running background services or by native addons that bypass Node.js APIs.
- It observes but does not block execution. Use it for audit and fail-fast decisions, not as a sandbox.
- Argument truncation and label classification are heuristics. A labelled event is not automatically malicious.
