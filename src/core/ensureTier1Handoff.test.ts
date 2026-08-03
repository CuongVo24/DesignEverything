import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdtempSync, rmSync, existsSync, cpSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { activateTier1Emit } from './emitTier1.js';
import { manifestPath } from './emitTransactionActivate.js';
import { ensureTier1Handoff } from './ensureTier1Handoff.js';
import { loadInterviewStore } from './interviewStore.js';
import type { InterviewAnswers } from './emit.js';
import { seedCanonicalAnswers, seedCanonicalProgress } from '../../test/helpers/canonicalProgress.js';

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
  seedCanonicalProgress(root, { phase: 'ready-for-validation', branch: 'cli', current_step: null });
  seedCanonicalAnswers(root, cliAnswers);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('P3.1 — ensureTier1Handoff reports, but never manufactures, a tier-1 handoff', () => {
  function emitWithAtomicHandoff() {
    return activateTier1Emit(root, cliAnswers, 'cli', {
      interview_state_revision: loadInterviewStore(root).state_revision,
    });
  }

  test('an activated manifest without execution-state.json remains fail-closed instead of self-healing', () => {
    const result = emitWithAtomicHandoff();
    expect(result.ok).toBe(true);

    const execStatePath = join(root, execStateRelPath);
    expect(existsSync(execStatePath)).toBe(true);
    rmSync(execStatePath);

    const health = ensureTier1Handoff(root);

    expect(health).toBe('state-required');
    expect(existsSync(execStatePath)).toBe(false);
  });

  test('repeated inspection of a missing state is non-mutating', () => {
    const result = emitWithAtomicHandoff();
    expect(result.ok).toBe(true);
    rmSync(join(root, execStateRelPath));

    expect(ensureTier1Handoff(root)).toBe('state-required');
    expect(ensureTier1Handoff(root)).toBe('state-required');
    expect(existsSync(join(root, execStateRelPath))).toBe(false);
  });

  test('an existing execution state is reported ready and left untouched', () => {
    const result = emitWithAtomicHandoff();
    expect(result.ok).toBe(true);

    const execStatePath = join(root, execStateRelPath);
    const advanced = JSON.parse(readFileSync(execStatePath, 'utf8'));
    advanced.phase = 'executing';
    writeFileSync(execStatePath, JSON.stringify(advanced, null, 2), 'utf8');

    expect(ensureTier1Handoff(root)).toBe('ready');

    const after = JSON.parse(readFileSync(execStatePath, 'utf8'));
    expect(after.phase).toBe('executing');
  });

  test('a workspace with no tier-1 manifest at all (pure interview phase) is a no-op', () => {
    expect(ensureTier1Handoff(root)).toBe('not-applicable');
    expect(existsSync(join(root, execStateRelPath))).toBe(false);
  });

  test('a tier-1 manifest that exists but was never activated is not applicable', () => {
    const result = emitWithAtomicHandoff();
    expect(result.ok).toBe(true);

    const mPath = manifestPath(root, 'tier1');
    const manifest = JSON.parse(readFileSync(mPath, 'utf8'));
    manifest.activated_at = null;
    writeFileSync(mPath, JSON.stringify(manifest, null, 2), 'utf8');
    rmSync(join(root, execStateRelPath));

    expect(ensureTier1Handoff(root)).toBe('not-applicable');

    expect(existsSync(join(root, execStateRelPath))).toBe(false);
  });

  test('an incomplete handoff-pending journal requires recovery and never creates state', () => {
    const result = emitWithAtomicHandoff();
    expect(result.ok).toBe(true);
    rmSync(join(root, execStateRelPath));

    const manifest = JSON.parse(readFileSync(manifestPath(root, 'tier1'), 'utf8'));
    const journalPath = join(root, '.design-everything/emit-journal.json');
    const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
    journal.step = 'handoff-pending';
    journal.handoff = {
      execution_state_path: execStateRelPath,
      interview_state_revision: 1,
      manifest_generation_id: manifest.generation_id,
      manifest_digest: 'a'.repeat(64),
      plan_digest: 'b'.repeat(64),
      docs_digest: 'c'.repeat(64),
      state_status: 'pending',
    };
    writeFileSync(journalPath, JSON.stringify(journal, null, 2), 'utf8');

    expect(ensureTier1Handoff(root)).toBe('recovery-required');
    expect(existsSync(join(root, execStateRelPath))).toBe(false);
  });
});
