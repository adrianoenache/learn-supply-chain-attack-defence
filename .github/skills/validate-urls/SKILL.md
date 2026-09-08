---
name: Validate URLs
applyTo:
  - "docs/**"
  - "README.md"
  - "SECURITY.md"
  - "CONTRIBUTING.md"
  - "CHANGELOG.md"
  - ".github/**/*.md"
  - ".github/**/*.json"
  - ".github/**/*.yml"
  - "tools/**/*.js"
  - "package.json"
tools:
  - read_file
  - grep_search
  - fetch_webpage
  - run_in_terminal
---

# Validate URLs

Use this skill before adding or modifying any external URL in the project. It prevents fictional, 404, or unreachable URLs from being committed to documentation, AI customizations, issue templates, or configuration files.

## Goal

Ensure every external URL referenced by the project is reachable and points to the intended resource.

## Procedure

1. **Identify candidate URLs** in the files being edited. Look for `https://` or `http://` links inside:
   - Markdown links, images, and inline references.
   - JSON `$schema`, `url`, `repository`, `homepage`, and `bugs` fields.
   - YAML `url` fields in issue templates and workflows.
   - Header comments and inline documentation.

2. **Distinguish illustrative examples.** If the URL appears inside a code block or output sample that is intentionally fictional, mark it with a blockquote above the block:

   ```markdown
   > The URLs below are illustrative examples and may not point to real releases.
   ```

   Do not validate fictional URLs as if they were real documentation links.

3. **Verify reachability.** For every real URL:
   - Use `fetch_webpage` or `curl -I --max-time 10` to request the URL.
   - Accept HTTP 200–399 and redirects to a valid destination.
   - Treat 404, 410, DNS failures, and connection timeouts as broken.
   - Retry once on transient errors (429, 502, 503, 504).

4. **Prefer official sources.** When a URL is broken:
   - Search the project's official documentation or repository for the current canonical URL.
   - Do not invent a replacement URL or guess a path segment.
   - If no official replacement exists, remove the reference or convert it to a clearly marked illustrative example.

5. **Check known-dead URLs.** Before concluding that a URL is newly broken, consult [`.github/known-dead-urls.md`](../../known-dead-urls.md). Dead URLs that are kept intentionally (for example, as historical records in `ai-lessons-learned.md`) must be listed there with a reason.

6. **Run the automated gate.** After editing, run:

   ```bash
   npm run defence:check-external-urls
   ```

   Use `--force` to bypass the cache and re-check all URLs.

## Completion Criteria

- Every non-illustrative external URL in the edited files returns HTTP 200–399 or is listed in `.github/known-dead-urls.md`.
- No invented schema URLs (such as `https://code.visualstudio.com/schemas/hooks`) are introduced without verification.
- `npm run defence:check-external-urls` passes.

## Output

Produce a short validation summary:

1. Files checked.
2. URLs verified.
3. Any broken URLs found and how they were fixed or marked as illustrative.
4. Result: "URL validation passed" or a list of required fixes.
