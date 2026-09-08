---
name: Script Contract Verification
applyTo:
  - "tools/*.js"
  - "tools/lib/*.js"
tools:
  - read_file
  - grep_search
  - run_in_terminal
---

# Script Contract Verification Skill

Use this skill to verify that a defense script honors its command contract:
CLI arguments, exit codes, output formats, side effects, and error behavior.

## Goal

Ensure the script behaves predictably for users, CI, and other tools that invoke it.

## Procedure

1. **Read the script header and any existing documentation.** Confirm the documented
   purpose, usage, and flags.

2. **Identify the CLI surface.** Look for argument parsing code and list every
   supported flag, positional argument, and default value.

3. **Map exit codes.** Confirm that `0` means success/no-issues and `1` means
   failure/issues/invalid-input. Any other exit code must be documented.

4. **Check output formats.** If the script supports `--format=json|markdown|table`,
   verify each formatter is implemented and tested.

5. **Check silent mode.** If the script supports `--silent`, verify it produces no
   output on success and still returns the correct exit code.

6. **Check dry-run behavior.** If the script supports `--dry-run`, verify it performs
   no side effects (no file writes, no network changes, no installs).

7. **Run the script with the documented flags.** Use `run_in_terminal` for a quick
   smoke test:

   ```bash
   node ./tools/<script>.js --help
   node ./tools/<script>.js --dry-run
   node ./tools/<script>.js --format=json
   ```

8. **Compare behavior to the header comment and docs.** Flag undocumented flags,
   missing output formats, or unexpected side effects.

## Completion Criteria

- Every supported flag is documented in the header or in `docs/en/tools.md`.
- Exit codes are predictable and documented.
- Output formats work as advertised.
- `--silent` and `--dry-run` behave correctly when present.
- No undocumented side effects exist.

## Output

Produce a short contract verification report:

1. Script name and scope.
2. List of verified flags, exit codes, and output formats.
3. Any discrepancies or missing coverage.
4. Result: "Contract verification passed" or a list of required fixes.
