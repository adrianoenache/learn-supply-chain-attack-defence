---
name: Security Audit
applyTo:
  - "tools/**"
  - ".npmrc"
  - ".husky/**"
  - "package.json"
  - ".github/workflows/**"
  - "SECURITY.md"
tools:
  - read_file
  - grep_search
  - run_in_terminal
---

# Security Audit Skill

Use this skill to review a change against the project's twelve defense layers.

## Goal

Ensure the change preserves or strengthens the defense-in-depth posture of the project.

## Procedure

1. **Identify the files in scope.** Confirm the change touches code, configuration, or documentation related to dependencies, install behavior, registry trust, secrets, hooks, or CI.

2. **Read the relevant defense-layer pages** in `docs/en/security/` and `docs/pt-BR/security/` if the change affects a specific layer.

3. **Check the change against each Core defense layer:**
   - Layer 1 — Package age: does the change preserve the minimum-age check?
   - Layer 2 — Signatures: does the change preserve `npm audit signatures`?
   - Layer 3 — Vulnerabilities: does the change preserve `npm audit --audit-level=high`?
   - Layer 4 — Deterministic install: is `npm ci` still used in CI/setup?
   - Layer 5 — Pre-commit hook: are hook gates still enforced?
   - Layer 6 — `.npmrc` hardening: are `ignore-scripts`, `save-exact`, `engine-strict`, and fixed registry still in place?

4. **Check the change against Recommended and Advanced layers if applicable:**
   - Layer 7 — Lint/format gate.
   - Layer 8 — Update availability check.
   - Layer 9 — License check.
   - Layer 10 — Typosquatting and dependency confusion.
   - Layer 11 — Provenance and SLSA attestation.
   - Layer 12 — Hook integrity.

5. **Look for secrets and credentials.** Run:

   ```bash
   git ls-files -z | xargs -0 -r npm run defence:check-secrets --
   ```

6. **Run the security gates locally:**

   ```bash
   npm run defence:pkg-age-check -- --transitive
   npm run defence:check-hooks
   npm run defence:license-check:fail
   npm audit signatures
   npm audit --audit-level=high
   ```

7. **Document any exception or weakening.** If a gate must be bypassed, explain why and obtain maintainer approval.

## Completion Criteria

- No existing gate was weakened without documented justification.
- `npm audit signatures` and `npm audit --audit-level=high` pass.
- No secrets were introduced.
- The change respects `ignore-scripts=true` and the safe rebuild procedure.

## Output

Produce a short audit summary:

1. Scope of the review.
2. Layers checked and any findings.
3. Result: "Security audit passed" or a list of required fixes.
