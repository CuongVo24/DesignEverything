import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdtempSync, rmSync, existsSync, cpSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { activateTier1Emit } from './emitTier1.js';
import { manifestPath } from './emitTransactionActivate.js';
import { initializeInterviewStore, transactInterviewStore } from './interviewStore.js';
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
let handoffInput: { interview_state_revision: number };

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'emit-tier1-test-'));
  cpSync(join(projectRoot, 'Design/Content'), join(root, 'Design/Content'), { recursive: true });
  const initial = initializeInterviewStore(root);
  const ready = transactInterviewStore(root, initial.state_revision, (envelope) => ({
    ...envelope,
    payload: {
      ...envelope.payload,
      progress: {
        ...envelope.payload.progress,
        phase: 'ready-for-validation',
        current_step: null,
        branch: 'cli',
      },
    },
  }));
  handoffInput = { interview_state_revision: ready.state_revision };
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('P7.1 — activateTier1Emit is the sole application-service authority for production emit', () => {
  test('a complete cli generation activates through the real transaction kernel, not a direct write loop', () => {
    const result = activateTier1Emit(root, cliAnswers, 'cli', handoffInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.reason_code).toBe('EMIT_ACTIVATED');
    expect(existsSync(join(root, 'docs/00-vision.md'))).toBe(true);
    // The whole point of routing through the kernel: a real manifest/journal
    // exists after activation — the naive writeFileSync loop it replaces
    // never produced one.
    expect(existsSync(manifestPath(root, 'tier1'))).toBe(true);
    expect(existsSync(join(root, '.design-everything/emit-journal.json'))).toBe(true);
    expect(result.emitted_files).toContain('docs/00-vision.md');
  });

  test('an invalid branch is a real failure — never a false success from a stale manifest fallback', () => {
    // First, activate a real generation so an active manifest exists on disk
    // (the exact precondition the old catch-block fallback in cliOperations
    // handleEmit relied on to fabricate ok:true after a thrown error).
    const first = activateTier1Emit(root, cliAnswers, 'cli', handoffInput);
    expect(first.ok).toBe(true);

    const failing = activateTier1Emit(root, cliAnswers, 'not-a-real-branch', handoffInput);
    expect(failing.ok).toBe(false);
    if (failing.ok) return;
    expect(failing.reason_code).toBe('EMIT_RENDER_FAILED');
  });

  test('re-emitting the same shape activates a new generation without leaving the tree partially mixed', () => {
    const first = activateTier1Emit(root, cliAnswers, 'cli', handoffInput);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = activateTier1Emit(root, cliAnswers, 'cli', handoffInput);
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(second.manifest_generation_id).not.toBe(first.manifest_generation_id);
    expect(existsSync(join(root, 'docs/00-vision.md'))).toBe(true);
  });

  test('loads derived recipes before validation instead of silently skipping production provenance checks', () => {
    rmSync(join(root, 'Design/Content/interview-script/derived-recipes.yaml'));

    const result = activateTier1Emit(root, cliAnswers, 'cli', handoffInput);
    expect(result).toMatchObject({
      ok: false,
      reason_code: 'EMIT_DERIVED_RECIPES_LOAD_FAILED',
    });
    expect(existsSync(manifestPath(root, 'tier1'))).toBe(false);
  });
});

describe('P6.2/U06/X23 -> A1-02 (Wave A1) — derived-recipe provenance is now a real, satisfied citation, not a tolerated gap', () => {
  // Before A1-02, a normal cli emit always tripped derived-recipe-
  // provenance-missing as a non-blocking warning, and it was recorded to a
  // best-effort append-only log (appendWarningAcknowledgement). A1-02 made
  // emit.ts's renderer attach real "> Nguồn:" citations (see emit.ts's
  // withSourceNote/collectDecisions wiring) and promoted the check to
  // error severity — a clean cli emit no longer produces that issue at
  // any severity, which made the log mechanism permanently unreachable.
  // A1-03 removed it rather than leave dead code with a docstring
  // describing behavior that could never run; this test pins the
  // renderer-correctness half of that removal's precondition.
  test('a complete cli emit produces zero derived-recipe-provenance-missing issues (renderer citations are real)', () => {
    const result = activateTier1Emit(root, cliAnswers, 'cli', handoffInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reason_code).toBe('EMIT_ACTIVATED');
    expect(result.warnings.some((w) => w.id === 'derived-recipe-provenance-missing')).toBe(false);
  });
});

describe('A1-03 (Wave A1) — staging directory is always cleaned up, success or reject', () => {
  function stagedGenerationDirs(): string[] {
    const stagingRoot = join(root, '.design-everything/staging');
    if (!existsSync(stagingRoot)) return [];
    return readdirSync(stagingRoot);
  }

  test('a successful activation leaves no orphaned staging directory behind', () => {
    const result = activateTier1Emit(root, cliAnswers, 'cli', handoffInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // prepareEmit's staging dir is named after the generation it just
    // activated — activateEmit copies out of it rather than moving it, so
    // without A1-03's cleanup it would still be sitting on disk here.
    expect(stagedGenerationDirs()).not.toContain(result.manifest_generation_id);
    expect(stagedGenerationDirs().length).toBe(0);
  });

  test('a rejected activation (user-file-collision) also leaves no orphaned staging directory', () => {
    // No manifest exists yet, so activateEmit's collision check treats any
    // pre-existing file at a target doc path as a real, un-managed user
    // file — never silently adopted. prepareEmit still stages the full
    // generation before this rejection is discovered at the activate step,
    // which is exactly the path this test needs.
    mkdirSync(join(root, 'docs'), { recursive: true });
    writeFileSync(join(root, 'docs/00-vision.md'), 'pre-existing user content, not from this engine', 'utf8');

    const result = activateTier1Emit(root, cliAnswers, 'cli', handoffInput);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason_code).toBe('EMIT_FILE_COLLISION');
    expect(stagedGenerationDirs().length).toBe(0);
  });
});
