// agents.sanity.test.js — Sanity tests for .github/agents/*.agent.md frontmatters.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const AGENTS_DIR = path.resolve(__dirname);
const REQUIRED_FIELDS = ['description', 'tools'];
const ALL_TOOLS = [
  'read_file',
  'create_file',
  'create_directory',
  'replace_string_in_file',
  'multi_replace_string_in_file',
  'grep_search',
  'file_search',
  'list_dir',
  'fetch_webpage',
  'run_in_terminal',
];

function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const lines = match[1].split('\n');
  const frontmatter = {};
  let key = null;
  let baseIndent = 0;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    const leadingSpaces = line.length - line.trimStart().length;

    if (leadingSpaces <= baseIndent && line.includes(':')) {
      const [k, ...rest] = line.split(':');
      key = k.trim();
      const value = rest.join(':').trim();
      if (value === '') {
        frontmatter[key] = [];
        baseIndent = leadingSpaces;
      } else {
        frontmatter[key] = value.replace(/^["']|["']$/g, '');
      }
      continue;
    }

    if (key && line.trim().startsWith('- ')) {
      const item = line.trim().slice(2).trim();
      if (!Array.isArray(frontmatter[key])) {
        frontmatter[key] = [];
      }
      frontmatter[key].push(item.replace(/^["']|["']$/g, ''));
    }
  }

  return frontmatter;
}

function listAgentFiles() {
  return fs
    .readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith('.agent.md'))
    .sort();
}

describe('agents sanity', () => {
  const agentFiles = listAgentFiles();

  it('should find at least one agent file', () => {
    assert.ok(agentFiles.length > 0, `no agent files found in ${AGENTS_DIR}`);
  });

  for (const file of agentFiles) {
    const name = file.replace('.agent.md', '');

    describe(`${name}.agent.md`, () => {
      let frontmatter;

      it('should have a valid YAML frontmatter', () => {
        const fullPath = path.join(AGENTS_DIR, file);
        frontmatter = parseFrontmatter(fullPath);
        assert.ok(frontmatter, `missing or invalid frontmatter in ${file}`);
      });

      for (const field of REQUIRED_FIELDS) {
        it(`should declare field "${field}"`, () => {
          assert.ok(frontmatter[field], `missing field "${field}" in ${file}`);
        });
      }

      it('should declare only known tools', () => {
        const tools = frontmatter.tools || [];
        for (const tool of tools) {
          assert.ok(
            ALL_TOOLS.includes(tool),
            `unknown tool "${tool}" in ${file}`,
          );
        }
      });

      it('should declare read_file', () => {
        const tools = frontmatter.tools || [];
        assert.ok(
          tools.includes('read_file'),
          `agent ${name} must declare read_file`,
        );
      });

      it('should declare grep_search', () => {
        const tools = frontmatter.tools || [];
        assert.ok(
          tools.includes('grep_search'),
          `agent ${name} must declare grep_search`,
        );
      });

      it('should have write tools when applyTo includes code paths', () => {
        const applyTo = frontmatter.applyTo || [];
        const tools = frontmatter.tools || [];
        const writesCode = applyTo.some((pattern) =>
          /\b(tools|\.github|\.husky|\.npmrc|package\.json)\b/.test(pattern),
        );
        const hasWriteTool =
          tools.includes('create_file') ||
          tools.includes('replace_string_in_file') ||
          tools.includes('multi_replace_string_in_file');
        if (writesCode) {
          assert.ok(
            hasWriteTool,
            `agent ${name} touches code paths but lacks a write tool`,
          );
        }
      });

      it('should have create_file and create_directory when applyTo includes docs', () => {
        const applyTo = frontmatter.applyTo || [];
        const tools = frontmatter.tools || [];
        const touchesDocs = applyTo.some((pattern) =>
          /\b(docs|README\.md|SECURITY\.md|CONTRIBUTING\.md|CHANGELOG\.md)\b/.test(
            pattern,
          ),
        );
        if (touchesDocs) {
          assert.ok(
            tools.includes('create_file'),
            `agent ${name} touches docs but lacks create_file`,
          );
          assert.ok(
            tools.includes('create_directory'),
            `agent ${name} touches docs but lacks create_directory`,
          );
        }
      });

      it('should have run_in_terminal when description mentions shell, CLI, command, or subprocess', () => {
        const description = String(frontmatter.description || '').toLowerCase();
        const tools = frontmatter.tools || [];
        const mentionsExecution =
          /\b(shell|cli|command|subprocess|spawn|npm ci|npm add|hook)\b/.test(
            description,
          );
        if (mentionsExecution) {
          assert.ok(
            tools.includes('run_in_terminal'),
            `agent ${name} mentions execution but lacks run_in_terminal`,
          );
        }
      });

      it('should have fetch_webpage when description mentions URL, web, external, or reference', () => {
        const description = String(frontmatter.description || '').toLowerCase();
        const tools = frontmatter.tools || [];
        const mentionsWeb = /\b(url|web|external|reference|registry trust)\b/.test(
          description,
        );
        if (mentionsWeb) {
          assert.ok(
            tools.includes('fetch_webpage'),
            `agent ${name} mentions web/URL but lacks fetch_webpage`,
          );
        }
      });
    });
  }
});
