---
name: validate-architecture
description: Validate that a proposed change fits the project architecture, including the native Node.js constraint, the defence:* namespace, the tools/lib/ shared layer, and bilingual docs. Use before implementing structural or organizational changes.
argument-hint: "[change description or diff]"
disable-model-invocation: true
---
# Validate Architecture

Validate that a proposed change fits the project's architecture and organization.

## Context

The project uses native Node.js modules only, a defense-tool namespace (`defence:*`),
a shared library layer in `tools/lib/`, and bilingual documentation in `docs/en/` and
`docs/pt-BR/`. AI customizations live under `.github/`.

## Change to Validate

Use the change description or diff provided with the invocation. If none was
provided, validate the current uncommitted diff (`git diff`) instead.

## Task

1. Confirm new files are in the correct directory (`tools/`, `tools/lib/`, `docs/en/`,
   `docs/pt-BR/`, `.github/agents/`, `.github/skills/`, etc.).
2. Check for duplicated logic that could move to a shared helper.
3. Verify bilingual documentation is updated when user-facing behavior changes.
4. Check that the change is referenced from an index, manifest, or guide.
5. Confirm applyTo patterns are specific if new AI customizations are added.
6. Verify `.defence-manifest.json` is updated if copied defense files changed.

## Constraints

- Do not introduce broad `applyTo: "**"` patterns unless absolutely necessary.
- Do not leave orphaned files without a reference.

## Output

Provide:
1. A 1-2 sentence architectural impact summary.
2. List of organization concerns, if any.
3. Result: "Architecture validation passed" or a prioritized fix list.
