# measure-ai-context

`measure-ai-context.js` measures the token footprint of each AI customization layer from disk — always-on instructions, scoped instructions, agents, skills, and hooks — so evaluations report measured numbers instead of estimates.

## What it does

- Walks `.github/` and sums bytes per layer (skills count only `SKILL.md` files; the generated index and bundled resources are excluded).
- Converts bytes to approximate tokens with the standard ~4 bytes/token heuristic (for comparison across layers and over time, not billing precision).
- Prints a per-layer table or a machine-readable report.

Implemented in [tools/measure-ai-context.js](../../../tools/measure-ai-context.js).

## Usage

```bash
npm run defence:measure-ai-context                       # table
node ./tools/measure-ai-context.js --format json         # machine-readable
```

## Output example

```text
AI context footprint (measured from disk):

  alwaysOn         1 file(s)     2996 bytes  ~749 tokens
  instructions     7 file(s)    12378 bytes  ~3095 tokens
  agents           9 file(s)    23942 bytes  ~5986 tokens
  skills          19 file(s)    51291 bytes  ~12823 tokens
  hooks            9 file(s)     2082 bytes  ~521 tokens
```

Only the always-on instructions ship with **every** request; the other layers load on demand by scope/relevance.

## Related

- Feeds the AI-assisted development section of `PROJECT_STATUS_REPORT.md` (Fase J).
- Inputs the AI-3.1 decision (whether the inject-context hook needs optimization).
- Not adopted into other projects: it measures `.github/`, which adopters only receive via the AI scaffolding feature (v1.1.0).
