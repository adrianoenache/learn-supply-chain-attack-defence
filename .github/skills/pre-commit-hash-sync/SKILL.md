---
name: Sync Pre-Commit Hash
applyTo:
  - ".husky/pre-commit"
  - "package.json"
  - ".defence-manifest.json"
tools:
  - read_file
  - run_in_terminal
  - replace_string_in_file
---

# Sync Pre-Commit Hash

Use this skill whenever `.husky/pre-commit` is edited, renamed, or its content
is otherwise changed. The repository protects the hook with two integrity
checks:

- `defences.huskyPreCommitHash` in `package.json`.
- The hash stored in `.defence-manifest.json` under `files[].path === ".husky/pre-commit"`.

If these hashes drift from the actual file, `git commit` will fail with:

```
❌ Pre-commit hook integrity check failed: expected <old>, found <new>.
```

## Goal

Keep the pre-commit hook and its recorded hashes in sync so commits do not fail
after legitimate hook changes.

## Procedure

1. **Identify the change.** Confirm that `.husky/pre-commit` is one of the files
   being edited.

2. **Edit the hook legitimately.** Only add or remove commands that are part of
   the project's defence gates. Do not bypass `npm audit signatures`,
   `defence:audit`, `defence:pkg-age-check`, `defence:license-check:fail`,
   lint, tests, URL checks, or the manifest verification.

3. **Recompute the SHA-256 hash.** After saving `.husky/pre-commit`, compute its
   hash:

   ```bash
   node -e "const fs=require('fs'),c=require('crypto'); console.log(c.createHash('sha256').update(fs.readFileSync('.husky/pre-commit')).digest('hex'));"
   ```

4. **Update `package.json`.** Replace the value of
   `defences.huskyPreCommitHash` with the new hash.

5. **Update `.defence-manifest.json`.** Run:

   ```bash
   npm run defence:verify-defences:fix
   ```

   This regenerates all hashes in the manifest, including `.husky/pre-commit`.

6. **Stage all three files together.** Ensure `.husky/pre-commit`, `package.json`,
   and `.defence-manifest.json` are included in the same commit so the integrity
   check can never see a partial update.

7. **Run the integrity check manually.** Before committing, run:

   ```bash
   node ./tools/check-hooks.js
   ```

   It must print:

   ```
   ✅ Pre-commit hook integrity verified.
   ```

## Completion Criteria

- `defences.huskyPreCommitHash` in `package.json` matches the SHA-256 of
  `.husky/pre-commit`.
- `.defence-manifest.json` contains the same hash for `.husky/pre-commit`.
- `node ./tools/check-hooks.js` exits 0.
- All three files are staged in the same commit.

## Output

State explicitly:

1. That `.husky/pre-commit` was modified.
2. The new SHA-256 hash.
3. That `package.json` and `.defence-manifest.json` were updated.
4. The result of `node ./tools/check-hooks.js`.
