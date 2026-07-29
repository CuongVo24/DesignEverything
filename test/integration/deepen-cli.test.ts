import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, cpSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { runCliOperation } from '../../src/adapters/shared/cliOperations.js';
import { manifestPath } from '../../src/core/emitTransactionActivate.js';
import { seedCanonicalProgress, seedCanonicalAnswers, mutateCanonicalProgress } from '../helpers/canonicalProgress.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');

interface DeepenModuleStatusLike {
  module: string;
  opted_in: boolean;
  emitted_at: string | null;
}
interface DeepenNextDataLike {
  question_id: string;
  subject_id: string | null;
  capability_token: string;
}

function asModuleList(data: unknown): DeepenModuleStatusLike[] {
  return (data as { modules: DeepenModuleStatusLike[] }).modules;
}
function asNextData(data: unknown): DeepenNextDataLike {
  return data as DeepenNextDataLike;
}

/**
 * P10/X01 — Phase 3.5 wires `deepen` into the CLI dispatcher for the first
 * time (deepenState.ts/deepenLifecycle.ts/emitTier2.ts already existed and
 * were fully tested at the core level via P7.2/test/e2e/deepen-flow.test.ts,
 * but had zero CLI caller). These tests drive the exact documented SKILL.md
 * shape (deepen --module <id> --opt-in|--next|--commit|--emit) purely
 * through runCliOperation, mirroring cli-protocol.test.ts's seedEmitReadyWorkspace
 * pattern for a real activated tier-1 manifest instead of hand-crafting one.
 */
describe('Deepen CLI — tier-2 module wiring', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'deepen-cli-test-'));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  /** Real tier-1 emit + interview-complete canonical progress, via the CLI. */
  async function seedDeepenReadyWorkspace(workspace: string): Promise<void> {
    cpSync(join(REPO_ROOT, 'Design/Content'), join(workspace, 'Design/Content'), { recursive: true });
    seedCanonicalProgress(workspace, { branch: 'cli', phase: 'ready-for-validation', current_step: null });
    // P10 — tier-1 emit reads payload.answers off the canonical store, not
    // the legacy Design/.interview/answers.json file — that file is owned
    // exclusively by tier-2 deepen answers today (see handleEmit).
    seedCanonicalAnswers(workspace, {
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
    });
    const emitRes = await runCliOperation(workspace, ['emit']);
    expect(emitRes.ok).toBe(true);
  }

  test('deepen (no --module) lists status for all 4 modules, none opted in yet', async () => {
    await seedDeepenReadyWorkspace(tempDir);
    const res = await runCliOperation(tempDir, ['deepen']);
    expect(res.ok).toBe(true);
    expect(res.reason_code).toBe('DEEPEN_STATUS');
    const modules = asModuleList(res.data);
    expect(modules).toHaveLength(4);
    expect(modules.every((m) => m.opted_in === false)).toBe(true);
  });

  test('opt-in is denied TIER1_NOT_EMITTED before any emit has happened', async () => {
    seedCanonicalProgress(tempDir, { branch: 'cli', phase: 'ready-for-validation', current_step: null });
    const res = await runCliOperation(tempDir, ['deepen', '--module', 'glossary', '--opt-in']);
    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('TIER1_NOT_EMITTED');
  });

  test('opt-in is denied INTERVIEW_INCOMPLETE while the core interview still has a current_step', async () => {
    await seedDeepenReadyWorkspace(tempDir);
    mutateCanonicalProgress(tempDir, (p) => ({ ...p, phase: 'interview', current_step: 'S1' }));
    const res = await runCliOperation(tempDir, ['deepen', '--module', 'glossary', '--opt-in']);
    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('INTERVIEW_INCOMPLETE');
  });

  test('opt-in is denied EXECUTION_BUSY while execution state is executing', async () => {
    await seedDeepenReadyWorkspace(tempDir);
    const execStatePath = join(tempDir, '.design-everything/execution-state.json');
    mkdirSync(dirname(execStatePath), { recursive: true });
    writeFileSync(
      execStatePath,
      JSON.stringify({
        version: '4.0.0',
        phase: 'executing',
        active_task: 'T1',
        active_milestone: 'M0',
        completed_tasks: [],
        evidence: [],
        block_reason: null,
        validated_plan_digest: '',
        validated_docs_digest: '',
        validation_result_digest: '',
        plan_revision: 1,
        amendment_history: [],
        open_break_tasks: [],
        reviewed_milestones: [],
        updated_at: new Date().toISOString(),
      }),
      'utf8'
    );
    const res = await runCliOperation(tempDir, ['deepen', '--module', 'glossary', '--opt-in']);
    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('EXECUTION_BUSY');
  });

  test('an invalid --module value is rejected before touching any state', async () => {
    await seedDeepenReadyWorkspace(tempDir);
    const res = await runCliOperation(tempDir, ['deepen', '--module', 'not-a-real-module', '--opt-in']);
    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('INVALID_DEEPEN_MODULE');
  });

  test('--next before --opt-in is denied DEEPEN_NOT_OPTED_IN', async () => {
    await seedDeepenReadyWorkspace(tempDir);
    const res = await runCliOperation(tempDir, ['deepen', '--module', 'glossary', '--next']);
    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('DEEPEN_NOT_OPTED_IN');
  });

  test('--commit without --capability-token is rejected before touching module state (mirrors handleCommit)', async () => {
    await seedDeepenReadyWorkspace(tempDir);
    const res = await runCliOperation(tempDir, [
      'deepen',
      '--module',
      'glossary',
      '--commit',
      '--turn',
      'turn-1',
      '--question',
      'DS1a',
      '--answer',
      'Answer',
    ]);
    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('TURN_CAPABILITY_MISSING');
  });

  test('full happy path: opt-in -> next -> commit x2 -> emit produces docs/design/glossary.md', async () => {
    await seedDeepenReadyWorkspace(tempDir);

    const optIn = await runCliOperation(tempDir, ['deepen', '--module', 'glossary', '--opt-in']);
    expect(optIn.ok).toBe(true);
    expect(optIn.reason_code).toBe('DEEPEN_OPTED_IN');

    const next1 = await runCliOperation(tempDir, ['deepen', '--module', 'glossary', '--next']);
    expect(next1.ok).toBe(true);
    expect(next1.reason_code).toBe('DEEPEN_NEXT_QUESTION');
    const data1 = asNextData(next1.data);
    expect(data1.question_id).toBe('DS1a');
    expect(data1.subject_id).toBeNull();
    expect(typeof data1.capability_token).toBe('string');

    const commit1 = await runCliOperation(tempDir, [
      'deepen',
      '--module',
      'glossary',
      '--commit',
      '--capability-token',
      data1.capability_token,
      '--question',
      'DS1a',
      '--answer',
      'Job, Config là hai thực thể lõi.',
    ]);
    expect(commit1.ok).toBe(true);
    expect(commit1.reason_code).toBe('DEEPEN_COMMIT_SUCCESS');

    const answersAfterFirst = JSON.parse(readFileSync(join(tempDir, 'Design/.interview/answers.json'), 'utf8'));
    expect(answersAfterFirst.DS1a).toBe('Job, Config là hai thực thể lõi.');

    // Re-committing the same instance is rejected, not silently overwritten.
    const dupe = await runCliOperation(tempDir, [
      'deepen',
      '--module',
      'glossary',
      '--commit',
      '--capability-token',
      data1.capability_token,
      '--question',
      'DS1a',
      '--answer',
      'lần hai',
    ]);
    expect(dupe.ok).toBe(false);
    expect(dupe.reason_code).toBe('DEEPEN_ANSWER_ALREADY_COMMITTED');

    const next2 = await runCliOperation(tempDir, ['deepen', '--module', 'glossary', '--next']);
    expect(next2.ok).toBe(true);
    const data2 = asNextData(next2.data);
    expect(data2.question_id).toBe('DS1b');

    // The stale DS1a token is no longer the pending capability (DS1b's is) —
    // reusing it must be rejected, not silently accepted as a replay.
    const staleReplay = await runCliOperation(tempDir, [
      'deepen',
      '--module',
      'glossary',
      '--commit',
      '--capability-token',
      data1.capability_token,
      '--question',
      'DS1b',
      '--answer',
      'replay attempt',
    ]);
    expect(staleReplay.ok).toBe(false);
    expect(staleReplay.reason_code).toBe('TURN_CAPABILITY_FORGED');

    const commit2 = await runCliOperation(tempDir, [
      'deepen',
      '--module',
      'glossary',
      '--commit',
      '--capability-token',
      data2.capability_token,
      '--question',
      'DS1b',
      '--answer',
      'Job: đơn vị công việc. Config: tệp cấu hình.',
    ]);
    expect(commit2.ok).toBe(true);

    // Every instance answered -> --next reports DEEPEN_ALL_ANSWERED.
    const nextAfterAll = await runCliOperation(tempDir, ['deepen', '--module', 'glossary', '--next']);
    expect(nextAfterAll.ok).toBe(false);
    expect(nextAfterAll.reason_code).toBe('DEEPEN_ALL_ANSWERED');

    const emitRes = await runCliOperation(tempDir, ['deepen', '--module', 'glossary', '--emit']);
    expect(emitRes.ok).toBe(true);
    expect(emitRes.reason_code).toBe('DEEPEN_EMIT_ACTIVATED');
    expect(existsSync(join(tempDir, 'docs/design/glossary.md'))).toBe(true);
    expect(existsSync(manifestPath(tempDir, 'tier2-glossary'))).toBe(true);

    const status = await runCliOperation(tempDir, ['deepen']);
    const glossaryStatus = asModuleList(status.data).find((m) => m.module === 'glossary')!;
    expect(glossaryStatus.opted_in).toBe(true);
    expect(glossaryStatus.emitted_at).not.toBeNull();
  });

  test('emitting a module with unanswered questions is skipped, not partially emitted', async () => {
    await seedDeepenReadyWorkspace(tempDir);
    await runCliOperation(tempDir, ['deepen', '--module', 'glossary', '--opt-in']);
    const res = await runCliOperation(tempDir, ['deepen', '--module', 'glossary', '--emit']);
    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('DEEPEN_EMIT_MISSING_ANSWERS');
    expect(existsSync(join(tempDir, 'docs/design/glossary.md'))).toBe(false);
  });

  test('a plan-affecting module (test-strategy) invalidates an already-advanced execution state on emit', async () => {
    await seedDeepenReadyWorkspace(tempDir);

    // Advance execution state past plan-validating, as if a build had begun.
    const execStatePath = join(tempDir, '.design-everything/execution-state.json');
    mkdirSync(dirname(execStatePath), { recursive: true });
    writeFileSync(
      execStatePath,
      JSON.stringify({
        version: '4.0.0',
        phase: 'ready-to-execute',
        active_task: null,
        active_milestone: null,
        completed_tasks: [],
        evidence: [],
        block_reason: null,
        validated_plan_digest: 'x',
        validated_docs_digest: 'x',
        validation_result_digest: 'x',
        plan_revision: 1,
        amendment_history: [],
        open_break_tasks: [],
        reviewed_milestones: [],
        updated_at: new Date().toISOString(),
      }),
      'utf8'
    );

    await runCliOperation(tempDir, ['deepen', '--module', 'test-strategy', '--opt-in']);
    const nextA = await runCliOperation(tempDir, ['deepen', '--module', 'test-strategy', '--next']);
    const dataA = asNextData(nextA.data);
    await runCliOperation(tempDir, [
      'deepen',
      '--module',
      'test-strategy',
      '--commit',
      '--capability-token',
      dataA.capability_token,
      '--question',
      dataA.question_id,
      '--answer',
      'Đăng nhập là kịch bản rủi ro cao nhất.',
    ]);
    const nextB = await runCliOperation(tempDir, ['deepen', '--module', 'test-strategy', '--next']);
    const dataB = asNextData(nextB.data);
    await runCliOperation(tempDir, [
      'deepen',
      '--module',
      'test-strategy',
      '--commit',
      '--capability-token',
      dataB.capability_token,
      '--question',
      dataB.question_id,
      '--answer',
      'Module xử lý job đồng thời là vùng dễ vỡ nhất.',
    ]);

    const emitRes = await runCliOperation(tempDir, ['deepen', '--module', 'test-strategy', '--emit']);
    expect(emitRes.ok).toBe(true);

    const state = JSON.parse(readFileSync(execStatePath, 'utf8'));
    expect(state.phase).toBe('blocked');
    expect(state.block_reason.reason_code).toBe('TIER2_PLAN_AFFECTING_CHANGE');
  });
});
