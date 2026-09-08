# check-md-links

`check-md-links.js` validates internal relative links in Markdown documentation. It ensures that cross-references between docs point to real files.

## What it does

- Discovers all `.md` files in the repository outside ignored directories.
- Extracts relative links and image references.
- Verifies that the target file or anchor exists.
- Uses a content-hash cache so repeated runs only re-check changed files.

Implemented in [tools/check-md-links.js](../../../tools/check-md-links.js).

## Configuration

Cache settings in `package.json` under `checkMdLinks`:

```json
{
  "checkMdLinks": {
    "ignoredDirs": ["node_modules", ".git"],
    "cacheTtlHours": 24,
    "cacheFile": ".md-links-cache.json"
  }
}
```

## Usage

```bash
# Normal run
npm run defence:check-md-links

# Force re-check all links
npm run defence:check-md-links -- --force
```

## Output example

```text
128 markdown files checked, 0 broken links.
```

## Related defense layer

- Documentation quality gate.
- Enforced by `.husky/pre-commit` after markdown changes.
