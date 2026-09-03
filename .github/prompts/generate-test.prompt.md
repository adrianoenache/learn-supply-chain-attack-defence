# Generate Test

Generate unit or integration tests for a specific file or function in this project.

## Context

- Test framework: `node:test` + `node:assert/strict`.
- Coverage target: ≥ 95% line coverage using Node.js native `--experimental-test-coverage`.
- Prefer dependency-injection hooks (`set*Impl` / `reset*Impl`) for mocking.
- Use `spawnSync` for subprocess tests with explicit timeouts.
- Every test must have a timeout to prevent hangs.
- Every hardcoded value must be justified by an inline comment.

## Task

Generate tests for: `__FILE_OR_FUNCTION__`

## Requirements

1. Cover happy path, edge cases, and error paths.
2. Mock external dependencies (filesystem, network, child process) via DI hooks or `spawnSync`.
3. Do not add external test dependencies.
4. Name tests clearly and group related tests in `describe` blocks.
5. After generating, run `npm test` and `npm run test:coverage` to verify coverage did not drop.

## Output

Provide the test code inside a fenced `javascript` block and a short summary of what was covered.
