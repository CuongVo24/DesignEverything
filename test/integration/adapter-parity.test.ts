import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, cpSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { CliResultEnvelope } from '../../src/adapters/shared/cliResult.js';
import { issueTurnCapability } from '../../src/core/turnCapability.js';

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
    expect(claudeRes.runtime_version).toBe('6.0.0');
    expect(codexRes.runtime_version).toBe('6.0.0');
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
