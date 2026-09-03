---
name: Dependency Review
applyTo:
  - "package.json"
  - "package-lock.json"
  - "tools/add-package.js"
  - "tools/check-package-age.js"
  - "tools/check-licenses.js"
  - "tools/lib/provenance.js"
  - "tools/lib/package-utils.js"
tools:
  - read_file
  - grep_search
  - run_in_terminal
---

# Dependency Review Skill

Use this skill when a new dependency is proposed or when dependency-related code changes.

## Goal

Validate that any new dependency meets the project's supply-chain security requirements before it is committed.

## Procedure

1. **Verify the dependency was added through the secure wrapper.** The correct command is:

   ```bash
   npm run defence:add -- <name>@<version>
   ```

   Direct `npm install <name>` is not allowed.

2. **Check the package age.** The package must pass:

   ```bash
   npm run defence:pkg-age-check -- --pkg <name>@<version>
   ```

3. **Verify registry signatures and attestations:**

   ```bash
   npm audit signatures
   npm audit --audit-level=high
   ```

4. **Run the license check:**

   ```bash
   npm run defence:license-check:fail
   ```

   If the license is flagged as unknown or prohibited, resolve it before proceeding.

5. **Check for typosquatting and dependency confusion.** Review `tools/add-package.js` output for warnings about similar package names or unexpected public registry presence.

6. **Check for provenance / SLSA attestation.** If the package supports `--provenance`, confirm the attestation bundle was validated.

7. **Review the lockfile entry.** Ensure `package-lock.json` contains a strong `integrity` field (SHA-512) for the new dependency.

## Completion Criteria

- The dependency passed age, signature, vulnerability, and license checks.
- The lockfile has a valid SHA-512 integrity entry.
- No typosquatting or dependency-confusion warnings remain unresolved.
- Provenance was validated when available.

## Output

Produce a short dependency review:

1. Dependency name and version.
2. Results of each gate.
3. Result: "Dependency review passed" or a list of blockers.
