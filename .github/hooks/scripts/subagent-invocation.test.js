// subagent-invocation.test.js — Tests for the subagent-invocation hook script.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const SCRIPT = path.resolve(__dirname, 'subagent-invocation.sh');
const PARSE_SCRIPT = path.resolve(__dirname, 'parse-hook-input.js');

function runHook(payload) {
  const result = spawnSync('bash', [SCRIPT], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 10000,
  });
  return {
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    status: result.status,
  };
}

describe('subagent-invocation hook', () => {
  it('ignores non-runSubagent tool use', () => {
    const result = runHook({ toolName: 'read_file', filePath: 'foo.md' });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '{}');
  });

  it('emits educational context when prompt mentions tool check', () => {
    const result = runHook({
      toolName: 'runSubagent',
      agentName: 'docs',
      prompt: 'Check tools: verify the docs agent has create_file and create_directory, then create files.',
    });
    assert.equal(result.status, 0);
    assert.ok(
      result.stdout.includes('✅'),
      'expected educational marker in stdout: ' + result.stdout,
    );
    assert.ok(
      result.stdout.includes('docs'),
      'expected agent name in stdout: ' + result.stdout,
    );
  });

  it('emits warning when prompt does not mention tool check', () => {
    const result = runHook({
      toolName: 'runSubagent',
      agentName: 'docs',
      prompt: 'Create files in docs/en/tools/.',
    });
    assert.equal(result.status, 0);
    assert.ok(
      result.stdout.includes('⚠️'),
      'expected warning marker in stdout: ' + result.stdout,
    );
    assert.ok(
      result.stdout.includes('subagent-invocation/SKILL.md'),
      'expected skill reference in stdout: ' + result.stdout,
    );
  });

  it('blocks high-risk prompt when agent lacks run_in_terminal', () => {
    const result = runHook({
      toolName: 'runSubagent',
      agentName: 'nonexistent-test-agent',
      prompt: 'Run rm -rf node_modules and npm install lodash.',
    });
    assert.equal(result.status, 0);
    assert.ok(
      result.stdout.includes('⛔'),
      'expected block marker in stdout: ' + result.stdout,
    );
    assert.ok(
      result.stdout.includes('not found') || result.stdout.includes('run_in_terminal'),
      'expected block reason in stdout: ' + result.stdout,
    );
  });

  it('allows high-risk prompt when command-execution agent has run_in_terminal', () => {
    const result = runHook({
      toolName: 'runSubagent',
      agentName: 'command-execution',
      prompt: 'Run npm install lodash and modify .npmrc.',
    });
    assert.equal(result.status, 0);
    assert.ok(
      !result.stdout.includes('⛔'),
      'did not expect block marker for command-execution: ' + result.stdout,
    );
  });

  it('blocks when agent file does not exist', () => {
    const result = runHook({
      toolName: 'runSubagent',
      agentName: 'nonexistent',
      prompt: 'Please review files.',
    });
    assert.equal(result.status, 0);
    assert.ok(
      result.stdout.includes('⛔'),
      'expected block marker for missing agent: ' + result.stdout,
    );
  });
});
