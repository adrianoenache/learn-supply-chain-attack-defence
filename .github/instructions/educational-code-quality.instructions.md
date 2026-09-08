# Educational Code Quality Instructions

These instructions apply when writing or modifying code intended to teach or
explain supply-chain defense concepts.

Applies to: `tools/**/*.js`, `tools/**/*.test.js`

## Headers

- Every tool and shared library must start with a header comment that explains:
  - What the file does.
  - Why it exists in the project.
  - Its primary CLI usage or entry point.
  - Any security caveats a learner should know.

## Error Messages

- Error messages must be actionable. State what failed, which resource is involved,
  and what the user should do next.
- Avoid generic messages like "Error occurred." Prefer "Package age check FAILED
  for foo@1.0.0 — run `npm run defence:pkg-age-check -- --pkg foo@1.0.0` for details."

## Hardcoded Values

- Every intentional hardcoded value must have an inline comment explaining why it
  is not configurable.
- If a value could reasonably vary between projects, move it to `package.json` or
  `tools/lib/config.js`.

## Naming and Comments

- Use descriptive names for variables, functions, and test cases.
- Add comments for non-obvious or security-sensitive steps; avoid comments that
  merely repeat the code.
- Reference defense layers in comments when a check maps to a documented layer.

## Tests as Documentation

- Write tests as executable documentation. Use descriptive test names and clear
  arrange/act/assert structure.
- Document intentionally hardcoded fixture values with inline comments.
