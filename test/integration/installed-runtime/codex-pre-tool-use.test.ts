import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';
import { seedCanonicalProgress } from '../../helpers/canonicalProgress.js';

const REPO_ROOT = join(__dirname, '../../..');
const INSTALLER = join(REPO_ROOT, 'adapter/codex-plugin/install.mjs');

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: string;
    permissionDecision: string;
    permissionDecisionReason?: string;
  };
}

// X18 fix — every test below spawns the real installed target-local Codex
// hook (adapter/codex-plugin/install.mjs's output), not the repo-root
// dev-mode hook. Installed once here and shared by both describe blocks
// below (an install takes real wall-clock time); each test still gets its
// own fresh workspace directory for state.
let installedRoot: string;
let preToolHook: string;

beforeAll(() => {
  installedRoot = join(tmpdir(), `de-codex-adversarial-install-${Date.now()}`);
  mkdirSync(installedRoot, { recursive: true });
  execFileSync('node', [INSTALLER, installedRoot], { encoding: 'utf8' });

  const manifest = JSON.parse(
    readFileSync(join(installedRoot, '.design-everything/install-manifest.json'), 'utf8')
  );
  const version = manifest.runtime_version as string;
  preToolHook = join(installedRoot, '.design-everything/runtime', version, 'hooks/pre-tool-use.mjs');
});

afterAll(() => {
  if (existsSync(installedRoot)) rmSync(installedRoot, { recursive: true, force: true });
});

function runHook(tmpDir: string, payload: Record<string, unknown>): HookOutput {
  const raw = execFileSync('node', [preToolHook], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    cwd: tmpDir,
  });
  return JSON.parse(raw) as HookOutput;
}

describe('Codex pre-tool-use.mjs — install-manifest must not be treated as "uninvolved" (P8 item 6)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `de-codex-pre-tool-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('bypasses (allow) a truly uninvolved workspace with no marker file at all', () => {
    const result = runHook(tmpDir, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /' },
    });
    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('does NOT bypass when only an install-manifest.json exists, even with no interview-state/progress/execution-state yet', () => {
    mkdirSync(join(tmpDir, '.design-everything'), { recursive: true });
    writeFileSync(
      join(tmpDir, '.design-everything/install-manifest.json'),
      JSON.stringify({ version: '1.0.0' }, null, 2)
    );

    const result = runHook(tmpDir, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /' },
    });
    // A workspace with a real install marker but no state yet must fail closed
    // (deny) rather than silently allow every action like an uninvolved project.
    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
  });
});

describe('Codex pre-tool-use.mjs — quote-aware shell tokenization (P4.3)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `de-codex-pre-tool-quote-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    mkdirSync(join(tmpDir, 'Design/Content/interview-script'), { recursive: true });
    mkdirSync(join(tmpDir, 'docs'), { recursive: true });
    for (const name of ['script.yaml', 'gate-policy.yaml']) {
      writeFileSync(
        join(tmpDir, 'Design/Content/interview-script', name),
        readFileSync(join(REPO_ROOT, 'Design/Content/interview-script', name))
      );
    }
    seedCanonicalProgress(tmpDir, { phase: 'interview', branch: null, current_step: 'S0' });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('does not misclassify a quoted argument containing "&&" as literal content as a real chaining operator', () => {
    // Before P4.3, this hook's naive command.trim().split(/\s+/) tore the
    // quoted argument apart, so the "&&" inside this echoed text was
    // indistinguishable from a real chaining operator once re-scanned —
    // an otherwise safe read-only command was denied purely because of its
    // quoted text content.
    const result = runHook(tmpDir, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: { command: 'echo "fix: a && b"' },
    });
    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('still denies a real, unquoted chaining operator', () => {
    const result = runHook(tmpDir, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: { command: 'echo hello && rm -rf /' },
    });
    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
  });
});
