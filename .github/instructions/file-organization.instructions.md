# File Organization Instructions

These instructions apply when creating, moving, or renaming files in the repository.

Applies to: `tools/**`, `tools/lib/**`, `docs/**`, `.github/**`

## Tools

- Place new defense scripts in `tools/` with the naming pattern `<action>.js`.
- Add the corresponding test file next to the tool: `<action>.test.js`.
- Register new scripts in `package.json` under the `defence:*` prefix.

## Shared Libraries

- Place reusable helpers in `tools/lib/`.
- Use domain-specific filenames: `concurrency.js`, `formatters.js`, `cli.js`, etc.
- Keep shared modules focused on a single responsibility.

## Documentation

- Maintain identical structure between `docs/en/` and `docs/pt-BR/`.
- Add new pages to both `index.md` files and to the quick-reference if the page
  describes a commonly used command or concept.
- Do not create a separate `docs/ai/` directory; AI guidance for humans belongs in
  `docs/en/ai-guidelines.md` and `docs/pt-BR/ai-guidelines.md`.

## AI Customizations

- Agents: `.github/agents/<domain>.agent.md`
- Skills: `.github/skills/<name>/SKILL.md`
- Instructions: `.github/instructions/<domain>.instructions.md`
- Prompts: `.github/prompts/<action>-<target>.prompt.md`
- Hooks: `.github/hooks/<enforcement-type>.json`

## Manifest and Indexes

- New files must be discoverable from an index, manifest, or documentation page.
- When copied defense files change, regenerate `.defence-manifest.json` with
  `npm run defence:verify-defences:fix`.
