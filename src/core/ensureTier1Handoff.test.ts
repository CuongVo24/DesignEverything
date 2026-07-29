import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdtempSync, rmSync, existsSync, cpSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { activateTier1Emit } from './emitTier1.js';
import { manifestPath } from './emitTransactionActivate.js';
import { completeTier1Activation } from './advanceExecutionState.js';
import { ensureTier1Handoff } from './ensureTier1Handoff.js';
import type { InterviewAnswers } from './emit.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');

const cliAnswers: InterviewAnswers = {
  S0: 'CLI tool',
  S1: 'Nỗi đau A, xoay xở B',
  S2: 'Dev (Contributor)',
  S3: 'Must: chạy lệnh chính. Should: log đẹp.',
  S4: 'Config, Job',
  S5: 'Mở terminal -> chạy lệnh -> xem kết quả',
  S6: 'Solo, 2 tuần',
  C1: 'Node.js (TypeScript)',
  C2: 'flags/arguments',
  C3: 'file config JSON ~/.config/myapp.json',
  C4: 'macOS',
  C5: 'NPM registry',
};

let root: string;
const execStateRelPath = '.design-everything/execution-state.json';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'ensure-tier1-handoff-test-'));
  cpSync(join(projectRoot, 'Design/Content'), join(root, 'Design/Content'), { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('P3.1/P7 — ensureTier1Handoff closes the crash window between docs activation and execution-state creation', () => {
  test('a tier-1 emit interrupted before execution-state.json is created gets healed on the next call', () => {
    const result = activateTier1Emit(root, cliAnswers, 'cli');
    expect(result.ok).toBe(true);

    // Simulate the crash: tier-1 docs/manifest are fully activated (real
    // production authority already ran to completion), but the process was
    // killed before cliOperations.handleEmit reached its subsequent
    // completeTier1Activation call — execution-state.json was never
    // created.
    expect(existsSync(join(root, execStateRelPath))).toBe(false);

    ensureTier1Handoff(root);

    expect(existsSync(join(root, execStateRelPath))).toBe(true);
    const state = JSON.parse(readFileSync(join(root, execStateRelPath), 'utf8'));
    expect(state.phase).toBe('plan-validating');
  });

  test('calling it twice is idempotent — the second call does not touch an already-healed execution-state.json', () => {
    const result = activateTier1Emit(root, cliAnswers, 'cli');
    expect(result.ok).toBe(true);

    ensureTier1Handoff(root);
    const firstWrite = readFileSync(join(root, execStateRelPath), 'utf8');

    ensureTier1Handoff(root);
    const secondRead = readFileSync(join(root, execStateRelPath), 'utf8');
    expect(secondRead).toBe(firstWrite);
  });

  test('a normal, non-crashed handoff (execution-state.json already exists) is left untouched', () => {
    const result = activateTier1Emit(root, cliAnswers, 'cli');
    expect(result.ok).toBe(true);

    // Simulate the normal path: handleEmit's completeTier1Activation already
    // ran (no crash), and state has since advanced further than
    // plan-validating (e.g. build already started) before this self-heal is
    // ever invoked — it must never reset that.
    completeTier1Activation(root);
    const execStatePath = join(root, execStateRelPath);
    const advanced = JSON.parse(readFileSync(execStatePath, 'utf8'));
    advanced.phase = 'executing';
    writeFileSync(execStatePath, JSON.stringify(advanced, null, 2), 'utf8');

    ensureTier1Handoff(root);

    const after = JSON.parse(readFileSync(execStatePath, 'utf8'));
    expect(after.phase).toBe('executing');
  });

  test('a workspace with no tier-1 manifest at all (pure interview phase) is a no-op', () => {
    ensureTier1Handoff(root);
    expect(existsSync(join(root, execStateRelPath))).toBe(false);
  });

  test('a tier-1 manifest that exists but was never activated (still mid-transaction) does not trigger a heal', () => {
    const result = activateTier1Emit(root, cliAnswers, 'cli');
    expect(result.ok).toBe(true);

    const mPath = manifestPath(root, 'tier1');
    const manifest = JSON.parse(readFileSync(mPath, 'utf8'));
    delete manifest.activated_at;
    writeFileSync(mPath, JSON.stringify(manifest, null, 2), 'utf8');

    ensureTier1Handoff(root);

    expect(existsSync(join(root, execStateRelPath))).toBe(false);
  });
});
