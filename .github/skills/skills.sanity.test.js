// skills.sanity.test.js — Sanity tests for .github/skills/<name>/SKILL.md frontmatters.
//
// Why this file exists: VS Code 1.140 follows the Agent Skills specification,
// which silently fails to load skills whose frontmatter is invalid (for
// example, a `name` that does not match the folder name). These tests fail
// loudly in `npm test` instead of letting a skill break silently in the IDE.
//
// Rules enforced (see https://code.visualstudio.com/docs/agent-customization/agent-skills):
//   - Every folder under .github/skills/ must contain a SKILL.md.
//   - `name` is required, kebab-case, max 64 chars, and must equal the folder name.
//   - `description` is required (what the skill does and when to use it), max 1024 chars.
//   - Legacy fields from the pre-1.140 format (`applyTo`, `tools`) are rejected.
//   - Optional boolean fields must be booleans; `context` must be `fork` when present.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SKILLS_DIR = path.resolve(__dirname);

// Fields allowed by the Agent Skills specification as supported by VS Code 1.140.
const ALLOWED_FIELDS = new Set([
  'name',
  'description',
  'argument-hint',
  'user-invocable',
  'disable-model-invocation',
  'context',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools',
]);

// Fields used by the pre-1.140 experimental format that must not come back.
const LEGACY_FIELDS = ['applyTo', 'tools'];

const NAME_MAX_LENGTH = 64; // spec limit for the skill name
const DESCRIPTION_MAX_LENGTH = 1024; // spec limit for the description

function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const lines = match[1].split('\n');
  const frontmatter = {};
  let key = null;
  let keyIndent = 0;
  let blockScalar = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    const indent = line.length - line.trimStart().length;

    // Continuation of a block scalar (`key: |`): collect more-indented lines.
    if (blockScalar && (indent > keyIndent || line.trim() === '')) {
      blockScalar.lines.push(line.trim());
      continue;
    }
    if (blockScalar) {
      frontmatter[blockScalar.key] = blockScalar.lines.join('\n').trim();
      blockScalar = null;
    }

    const keyMatch = line.match(/^([A-Za-z-]+):(.*)$/);
    if (!keyMatch) continue;

    key = keyMatch[1];
    keyIndent = indent;
    const value = keyMatch[2].trim();

    if (value === '|' || value === '|-' || value === '|+') {
      blockScalar = { key, lines: [] };
      continue;
    }

    frontmatter[key] = value.replace(/^["']|["']$/g, '');
  }

  if (blockScalar) {
    frontmatter[blockScalar.key] = blockScalar.lines.join('\n').trim();
  }

  return frontmatter;
}

function listSkillDirs() {
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    // `scripts/` holds the index generator itself, not a skill.
    .filter((name) => name !== 'scripts')
    .sort();
}

describe('skills sanity', () => {
  const skillDirs = listSkillDirs();

  it('should find at least one skill directory', () => {
    assert.ok(skillDirs.length > 0, `no skill directories found in ${SKILLS_DIR}`);
  });

  for (const dir of skillDirs) {
    describe(`skills/${dir}/SKILL.md`, () => {
      const fullPath = path.join(SKILLS_DIR, dir, 'SKILL.md');
      let frontmatter;

      it('should exist', () => {
        assert.ok(
          fs.existsSync(fullPath),
          `missing SKILL.md in .github/skills/${dir}/`,
        );
      });

      it('should have a valid YAML frontmatter', () => {
        frontmatter = parseFrontmatter(fullPath);
        assert.ok(frontmatter, `missing or invalid frontmatter in ${dir}/SKILL.md`);
      });

      it('should declare a name equal to the folder name', () => {
        assert.equal(
          frontmatter.name,
          dir,
          `skill name "${frontmatter.name}" must match folder "${dir}" (kebab-case)`,
        );
      });

      it('should use a kebab-case name within the spec limit', () => {
        assert.match(
          String(frontmatter.name),
          /^[a-z0-9-]+$/,
          `skill name "${frontmatter.name}" must use only lowercase letters, numbers, and hyphens`,
        );
        assert.ok(
          String(frontmatter.name).length <= NAME_MAX_LENGTH,
          `skill name exceeds ${NAME_MAX_LENGTH} characters`,
        );
      });

      it('should declare a non-empty description within the spec limit', () => {
        const description = String(frontmatter.description || '');
        assert.ok(description.length > 0, `missing description in ${dir}/SKILL.md`);
        assert.notEqual(
          description,
          dir,
          `description in ${dir}/SKILL.md must explain what the skill does and when to use it, not repeat the name`,
        );
        assert.ok(
          description.length <= DESCRIPTION_MAX_LENGTH,
          `description in ${dir}/SKILL.md exceeds ${DESCRIPTION_MAX_LENGTH} characters`,
        );
      });

      it('should not use legacy pre-1.140 fields', () => {
        for (const field of LEGACY_FIELDS) {
          assert.ok(
            !(field in frontmatter),
            `legacy field "${field}" found in ${dir}/SKILL.md; ` +
              'the Agent Skills spec activates skills by description, not applyTo/tools',
          );
        }
      });

      it('should only use fields supported by the spec', () => {
        for (const field of Object.keys(frontmatter)) {
          assert.ok(
            ALLOWED_FIELDS.has(field),
            `unsupported field "${field}" in ${dir}/SKILL.md`,
          );
        }
      });

      it('should use booleans for invocation flags when present', () => {
        for (const field of ['user-invocable', 'disable-model-invocation']) {
          if (field in frontmatter) {
            assert.ok(
              ['true', 'false'].includes(String(frontmatter[field])),
              `field "${field}" in ${dir}/SKILL.md must be true or false`,
            );
          }
        }
      });

      it('should use context: fork when context is present', () => {
        if ('context' in frontmatter) {
          assert.equal(
            frontmatter.context,
            'fork',
            `field "context" in ${dir}/SKILL.md must be "fork"`,
          );
        }
      });

      it('should reference only existing local resources', () => {
        // The Agent Skills spec only loads bundled resources that are
        // referenced from SKILL.md, so a broken relative link means the agent
        // never receives the resource. Anchors, absolute paths (~/…), and
        // external URLs are out of scope here — external URLs are covered by
        // tools/check-external-urls.js.
        const content = fs.readFileSync(fullPath, 'utf8')
        const linkPattern = /\]\(([^)#\s]+)(#[^)]*)?\)/g
        let match
        while ((match = linkPattern.exec(content)) !== null) {
          const target = match[1]
          if (/^[a-z]+:/i.test(target)) continue // external URL
          if (target.startsWith('~') || path.isAbsolute(target)) continue
          const resolved = path.resolve(SKILLS_DIR, dir, target)
          assert.ok(
            fs.existsSync(resolved),
            `broken resource link "${target}" in ${dir}/SKILL.md ` +
              '(the Agent Skills spec only loads referenced files)',
          )
        }
      })
    });
  }

  describe('skills index drift', () => {
    it('README.md should be in sync with the skill frontmatters', () => {
      // The generated index is the human-facing map of the skills; drift
      // means it lies about what exists. --check regenerates in memory and
      // compares against the committed file without writing anything.
      const result = spawnSync(
        process.execPath,
        [path.join(SKILLS_DIR, 'scripts', 'generate-skills-index.js'), '--check'],
        { encoding: 'utf8', timeout: 10000 },
      );
      assert.equal(
        result.status,
        0,
        `skills index drifted — regenerate with: node .github/skills/scripts/generate-skills-index.js\n${result.stderr}`,
      );
    });
  });
});
