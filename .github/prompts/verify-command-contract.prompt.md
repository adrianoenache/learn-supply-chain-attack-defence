# Verify Command Contract

Verify that a defense script honors its command contract.

## Context

Defense scripts are invoked by users, pre-commit hooks, and CI. Their CLI surface,
exit codes, output formats, and side effects must be predictable.

## Script to Verify

```
__SCRIPT_NAME_OR_PATH__
```

## Task

1. Read the script header and identify its documented purpose and usage.
2. List every supported CLI flag, positional argument, and default value.
3. Confirm exit code semantics: `0` for success/no-issues, `1` for failure/issues.
4. Verify each output format (`table`, `json`, `markdown`) works as documented.
5. Check `--silent` and `--dry-run` behavior if the script supports them.
6. Run a quick smoke test with `node ./tools/<script>.js --dry-run` or equivalent.
7. Compare actual behavior to documented behavior.

## Constraints

- Do not run commands that modify files or install packages unless explicitly dry-run.
- If a command can perform side effects, use `--dry-run` or equivalent.

## Output

Provide:
1. A 1-2 sentence contract summary.
2. Verified flags, exit codes, and output formats.
3. Any undocumented behavior or missing coverage.
4. Result: "Contract verification passed" or a list of required fixes.
