import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, cpSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync, spawnSync } from 'child_process';
import { runCliOperation } from '../../../src/adapters/shared/cliOperations.js';
import { issueTurnCapability } from '../../../src/core/turnCapability.js';
import { loadInterviewStore } from '../../../src/core/interviewStore.js';

const REPO_ROOT = join(__dirname, '../../..');
const CLAUDE_INSTALLER = join(REPO_ROOT, 'adapter/claude-code/install.mjs');

describe('B5a — Installed Runtime CLI Health & Recovery Suite', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `de-cli-health-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });

    // Copy script content files
    const designDir = join(tmpDir, 'Design/Content/interview-script');
    mkdirSync(designDir, { recursive: true });
    cpSync(join(REPO_ROOT, 'Design/Content/interview-script'), designDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should return UNINVOLVED for empty un-initialized project workspace', async () => {
    const freshDir = join(tmpdir(), `de-fresh-${Date.now()}`);
    mkdirSync(freshDir, { recursive: true });
    const res = await runCliOperation(freshDir, ['status']);
    expect(res.ok).toBe(true);
    expect(res.reason_code).toBe('UNINVOLVED');
    rmSync(freshDir, { recursive: true, force: true });
  });

  it('should return CORRUPT_PROGRESS_STATE and safe recovery command when progress.json is corrupt', async () => {
    writeFileSync(join(tmpDir, 'progress.json'), '{ invalid json', 'utf8');

    const res = await runCliOperation(tmpDir, ['status']);
    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('CORRUPT_PROGRESS_STATE');
    expect(res.next_command).toContain('repair');
  });

  it('should reject commit without --capability-token even with a plausible-looking --turn flag', async () => {
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

    // --turn is not a recognized authorization mechanism (B1a) — commit must
    // reject before it even looks at --slots-file or any other business input.
    const res = await runCliOperation(tmpDir, [
      'commit',
      '--turn',
      'turn-1',
      '--answer',
      'Answer',
      '--slots-file',
      '../../secret-slots.json',
    ]);

    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('TURN_CAPABILITY_MISSING');
  });

  it('deepen --commit on a module that was never opted-in is rejected DEEPEN_NOT_OPTED_IN (X01 closed: deepen is now wired, see test/integration/deepen-cli.test.ts for the full flow)', async () => {
    // H0/X01 used to pin this exact documented shape (`deepen --commit
    // --capability-token <TOKEN> ...`) as UNKNOWN_SUBCOMMAND because
    // cliOperations.ts had no `case 'deepen'` at all. Phase 3.5 wired it —
    // commitDeepenAnswer's own validation order (opted-in check before
    // token verification) now surfaces DEEPEN_NOT_OPTED_IN for a fresh
    // workspace that never ran --opt-in, a real typed rejection rather than
    // a generic dispatcher fallthrough.
    const res = await runCliOperation(tmpDir, [
      'deepen',
      '--module',
      'glossary',
      '--commit',
      '--capability-token',
      'not-a-real-token',
      '--question',
      'q1',
      '--answer',
      'Answer',
    ]);

    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('DEEPEN_NOT_OPTED_IN');
  });

  it('the stale deepen --turn shape is rejected TURN_CAPABILITY_MISSING before touching module state (--turn grants no authority via this surface either)', async () => {
    // No --capability-token at all -> handleDeepen's CLI-layer check fires
    // before commitDeepenAnswer's own opt-in check ever runs, mirroring
    // handleCommit's identical "fail before doing anything else" discipline.
    const res = await runCliOperation(tmpDir, [
      'deepen',
      '--module',
      'glossary',
      '--commit',
      '--turn',
      'turn-1',
      '--question',
      'q1',
      '--answer',
      'Answer',
    ]);

    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('TURN_CAPABILITY_MISSING');
  });

  it('should reject commit with INVALID_SLOTS_FILE when slots file path points outside workspace, given a valid capability token', async () => {
    const issued = issueTurnCapability(0, {
      sessionId: 'default-session',
      operationKind: 'interview',
      questionId: 'S1',
    });
    const progress = {
      version: '4.0.0',
      phase: 'interview',
      branch: 'web',
      session_id: 'default-session',
      state_revision: 0,
      calibrate_mode: 'fast',
      current_step: 'S1',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      pending_turn_capability: issued.capability,
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
    };
    writeFileSync(join(tmpDir, 'progress.json'), JSON.stringify(progress, null, 2), 'utf8');

    // Attempting slots file outside workspace (traversal attempt)
    const res = await runCliOperation(tmpDir, [
      'commit',
      '--capability-token',
      issued.token,
      '--answer',
      'Answer',
      '--slots-file',
      '../../secret-slots.json',
    ]);

    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('INVALID_SLOTS_FILE');
    expect(res.message).toContain('nằm ngoài workspace');
  });

  it('P6 10.1 — a valid --slots-file commits its content atomically alongside the answer', async () => {
    const issued = issueTurnCapability(0, {
      sessionId: 'default-session',
      operationKind: 'interview',
      questionId: 'S1',
    });
    const progress = {
      version: '4.0.0',
      phase: 'interview',
      branch: 'web',
      session_id: 'default-session',
      state_revision: 0,
      calibrate_mode: 'fast',
      current_step: 'S1',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      pending_turn_capability: issued.capability,
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
    };
    writeFileSync(join(tmpDir, 'progress.json'), JSON.stringify(progress, null, 2), 'utf8');

    const interviewDir = join(tmpDir, 'Design/.interview');
    mkdirSync(interviewDir, { recursive: true });
    writeFileSync(
      join(interviewDir, 'slots-S1.json'),
      JSON.stringify({
        problem_summary: 'Người dùng mất nhiều thời gian nhập liệu thủ công.',
        current_workaround: 'Hiện đang dùng bảng tính Excel chia sẻ qua email.',
      }),
      'utf8'
    );

    const res = await runCliOperation(tmpDir, [
      'commit',
      '--capability-token',
      issued.token,
      '--answer',
      'Người dùng mất nhiều thời gian và hay nhập sai.',
      '--slots-file',
      'Design/.interview/slots-S1.json',
    ]);

    expect(res.ok).toBe(true);
    expect(res.reason_code).toBe('COMMIT_SUCCESS');

    const envelope = loadInterviewStore(tmpDir);
    expect(envelope.payload.answers.S1).toBe('Người dùng mất nhiều thời gian và hay nhập sai.');
    expect(envelope.payload.slots.problem_summary).toMatchObject({
      value: 'Người dùng mất nhiều thời gian nhập liệu thủ công.',
      provenance: 'interview:S1',
    });
    expect(envelope.payload.slots.current_workaround).toMatchObject({
      value: 'Hiện đang dùng bảng tính Excel chia sẻ qua email.',
    });
  });

  it('should return UNKNOWN_SUBCOMMAND envelope for unknown subcommand', async () => {
    const res = await runCliOperation(tmpDir, ['unknown-op']);
    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('UNKNOWN_SUBCOMMAND');
  });

  it('B4c/X09: target-local validate failure exits non-zero and emits one JSON envelope', () => {
    execFileSync('node', [CLAUDE_INSTALLER, tmpDir], { encoding: 'utf8' });
    const manifest = JSON.parse(
      readFileSync(join(tmpDir, '.design-everything/install-manifest.json'), 'utf8')
    );
    const targetCli = join(
      tmpDir,
      '.design-everything/runtime',
      manifest.runtime_version,
      'cli.mjs'
    );

    const run = spawnSync(process.execPath, [targetCli, 'validate', '--json'], {
      cwd: tmpDir,
      encoding: 'utf8',
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe(2);
    expect(run.stderr).toBe('');
    const envelope = JSON.parse(run.stdout);
    expect(envelope).toMatchObject({
      ok: false,
      operation: 'validate',
      reason_code: 'SEMANTIC_VALIDATION_FAILED',
      severity: 'error',
    });
  });
});
