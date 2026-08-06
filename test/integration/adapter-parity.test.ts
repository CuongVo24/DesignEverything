import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, cpSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync, execFileSync } from 'child_process';
import { CliResultEnvelope } from '../../src/adapters/shared/cliResult.js';
import { issueTurnCapability } from '../../src/core/turnCapability.js';
import { RUNTIME_VERSION } from '../../src/version.js';

const REPO_ROOT = join(__dirname, '../..');
const CLAUDE_CLI = join(REPO_ROOT, 'adapter/claude-code/cli.mjs');
const CODEX_CLI = join(REPO_ROOT, 'adapter/codex-plugin/cli.mjs');

describe('Claude & Codex CLI Adapter Parity', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `de-parity-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });

    // Copy required content files
    const designDir = join(tmpDir, 'Design/Content/interview-script');
    mkdirSync(designDir, { recursive: true });
    cpSync(join(REPO_ROOT, 'Design/Content/interview-script'), designDir, { recursive: true });

    const templatesSrc = join(REPO_ROOT, 'Design/Content/doc-templates');
    if (existsSync(templatesSrc)) {
      cpSync(templatesSrc, join(tmpDir, 'Design/Content/doc-templates'), { recursive: true });
    }

    // Initialize progress.json
    const progress = {
      version: '4.0.0',
      phase: 'interview',
      branch: 'web',
      calibrate_mode: 'fast',
      current_step: 'S1',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
    };
    writeFileSync(join(tmpDir, 'progress.json'), JSON.stringify(progress, null, 2), 'utf8');
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should return identical status envelope shapes from both launchers', () => {
    const claudeOutRaw = execSync(`node "${CLAUDE_CLI}" status --json`, {
      cwd: tmpDir,
      env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir },
    }).toString('utf8');

    const codexOutRaw = execSync(`node "${CODEX_CLI}" status --json`, {
      cwd: tmpDir,
      env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir },
    }).toString('utf8');

    const claudeRes = JSON.parse(claudeOutRaw) as CliResultEnvelope;
    const codexRes = JSON.parse(codexOutRaw) as CliResultEnvelope;

    expect(claudeRes.ok).toBe(true);
    expect(codexRes.ok).toBe(true);
    expect(claudeRes.operation).toBe('status');
    expect(codexRes.operation).toBe('status');
    expect(claudeRes.reason_code).toBe('STATUS_HEALTHY');
    expect(codexRes.reason_code).toBe('STATUS_HEALTHY');
    expect(claudeRes.runtime_version).toBe(RUNTIME_VERSION);
    expect(codexRes.runtime_version).toBe(RUNTIME_VERSION);
  });

  it('should return identical error envelope on missing subcommand from both launchers', () => {
    let claudeRes: CliResultEnvelope | undefined;
    let codexRes: CliResultEnvelope | undefined;

    try {
      execSync(`node "${CLAUDE_CLI}" invalidcmd --json`, {
        cwd: tmpDir,
        env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir },
      });
    } catch (err: unknown) {
      const errorObj = err as { stdout: Buffer };
      claudeRes = JSON.parse(errorObj.stdout.toString('utf8')) as CliResultEnvelope;
    }

    try {
      execSync(`node "${CODEX_CLI}" invalidcmd --json`, {
        cwd: tmpDir,
        env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir },
      });
    } catch (err: unknown) {
      const errorObj = err as { stdout: Buffer };
      codexRes = JSON.parse(errorObj.stdout.toString('utf8')) as CliResultEnvelope;
    }

    expect(claudeRes?.ok).toBe(false);
    expect(codexRes?.ok).toBe(false);
    expect(claudeRes?.reason_code).toBe('UNKNOWN_SUBCOMMAND');
    expect(codexRes?.reason_code).toBe('UNKNOWN_SUBCOMMAND');
  });

  it('should produce identical state transitions and envelopes when committing a step', () => {
    // Issue a real capability for S1 (mirrors what UserPromptSubmit would
    // do) instead of a self-declared --turn id (B1a).
    const issued = issueTurnCapability(0, {
      sessionId: 'default-session',
      operationKind: 'interview',
      questionId: 'S1',
    });
    const progressPath = join(tmpDir, 'progress.json');
    const progress = JSON.parse(readFileSync(progressPath, 'utf8'));
    progress.session_id = 'default-session';
    progress.state_revision = 0;
    progress.pending_turn_capability = issued.capability;
    writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');

    const claudeOutRaw = execSync(
      `node "${CLAUDE_CLI}" commit --capability-token ${issued.token} --branch web --answer "Dự án web app" --json`,
      {
        cwd: tmpDir,
        env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir },
      }
    ).toString('utf8');

    const claudeRes = JSON.parse(claudeOutRaw) as CliResultEnvelope;
    expect(claudeRes.ok).toBe(true);
    expect(claudeRes.reason_code).toBe('COMMIT_SUCCESS');

    // Replaying the same (now-consumed) token via Codex CLI must be
    // rejected identically — same reason code from both runtimes since they
    // share cliOperations.ts (B4e parity).
    let codexRes: CliResultEnvelope | undefined;
    try {
      execSync(
        `node "${CODEX_CLI}" commit --capability-token ${issued.token} --branch web --answer "Dự án web app" --json`,
        {
          cwd: tmpDir,
          env: { ...process.env, CLAUDE_PROJECT_DIR: tmpDir },
        }
      );
    } catch (err: unknown) {
      const errorObj = err as { stdout: Buffer };
      codexRes = JSON.parse(errorObj.stdout.toString('utf8')) as CliResultEnvelope;
    }

    expect(codexRes?.ok).toBe(false);
    expect(codexRes?.reason_code).toBe('TURN_CAPABILITY_REPLAY');
  });
});

// X24 — deepen-script.yaml (the tier-2 module script both adapters' `deepen`
// subcommand loads at runtime) is staged by each install.mjs individually;
// nothing before this asserted the two installers actually produce identical
// bytes on a real target, only that the source tree has one copy they both
// read from in dev mode.
describe('X24 — deepen asset parity between installed Claude and Codex targets', () => {
  let claudeRoot: string;
  let codexRoot: string;

  beforeAll(() => {
    claudeRoot = join(tmpdir(), `de-x24-claude-${Date.now()}`);
    codexRoot = join(tmpdir(), `de-x24-codex-${Date.now()}`);
    mkdirSync(claudeRoot, { recursive: true });
    mkdirSync(codexRoot, { recursive: true });
    execFileSync('node', [join(REPO_ROOT, 'adapter/claude-code/install.mjs'), claudeRoot], { encoding: 'utf8' });
    execFileSync('node', [join(REPO_ROOT, 'adapter/codex-plugin/install.mjs'), codexRoot], { encoding: 'utf8' });
  });

  afterAll(() => {
    if (existsSync(claudeRoot)) rmSync(claudeRoot, { recursive: true, force: true });
    if (existsSync(codexRoot)) rmSync(codexRoot, { recursive: true, force: true });
  });

  it('stages an identical deepen-script.yaml for both adapters', () => {
    const claudeAsset = join(claudeRoot, 'Design/Content/interview-script/deepen-script.yaml');
    const codexAsset = join(codexRoot, 'Design/Content/interview-script/deepen-script.yaml');
    expect(existsSync(claudeAsset)).toBe(true);
    expect(existsSync(codexAsset)).toBe(true);
    expect(readFileSync(claudeAsset, 'utf8')).toBe(readFileSync(codexAsset, 'utf8'));
    expect(readFileSync(claudeAsset, 'utf8')).toBe(
      readFileSync(join(REPO_ROOT, 'Design/Content/interview-script/deepen-script.yaml'), 'utf8')
    );
  });
});

// B4e checklist #5 — "Build/release fail nếu launcher nhúng digest/version khác shared
// manifest". Both launchers read RUNTIME_VERSION from the bundle at import time rather than
// hardcoding it, so there is structurally nothing to drift — this pins that invariant so a
// future edit that bakes a literal version into either launcher fails loudly here instead of
// silently reintroducing the fork B4e closed.
describe('B4e #5 — launchers carry no hardcoded runtime version literal', () => {
  const SEMVER_LITERAL = /['"`]\d+\.\d+\.\d+['"`]/;

  it('adapter/claude-code/cli.mjs has no literal semver string', () => {
    const source = readFileSync(CLAUDE_CLI, 'utf8');
    expect(source).not.toMatch(SEMVER_LITERAL);
  });

  it('adapter/codex-plugin/cli.mjs has no literal semver string', () => {
    const source = readFileSync(CODEX_CLI, 'utf8');
    expect(source).not.toMatch(SEMVER_LITERAL);
  });
});
