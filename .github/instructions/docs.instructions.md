# Documentation Instructions

These instructions apply when writing or modifying project documentation.

Applies to: `docs/**/*.md`, `README.md`

## Bilingual Documentation

- Every user-facing document in `docs/en/` must have a corresponding translation in `docs/pt-BR/`.
- Keep structure, headings, and code examples aligned between languages.
- Use the [glossary](../../docs/en/glossary.md) for consistent terminology.

## Link Validation

- Prefer relative links over absolute URLs for internal references.
- After editing markdown files, run `npm run defence:check-md-links`.
- Do not introduce links to files that do not exist yet.

## Style

- Use clear, concise language suitable for learners and practitioners.
- Include concrete examples and command snippets where helpful.
- Keep threat-model terminology consistent with the security layer pages.

## Sample Output Accuracy

- Sample tool outputs must be **real output, in English**, captured or derived
  from the actual tool — never translated, never invented. Tools print in
  English regardless of the page language.
- In `pt-BR` pages, keep the English sample and add the note "(A saída da
  ferramenta é em inglês.)".
- When a tool's output changes, update the sample in the same commit (the
  Phase N migrations are the reference pattern).
- Fictional samples found so far (fixed in Fase N, 2026-11-05): check-sync,
  check-secrets, check-lockfile-integrity, add-package, generate-trust-report,
  setup-bootstrap, monitor-install, analyze-lifecycle-scripts, update-badge
  (mostly pt-BR pages). See `.github/ai-lessons-learned.md`.

## AI Guidelines

- Do not create or reference a separate `docs/ai/` directory.
- AI-related guidance for humans belongs in `docs/en/ai-guidelines.md` and `docs/pt-BR/ai-guidelines.md`.
