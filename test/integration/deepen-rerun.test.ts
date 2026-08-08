import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { runCliOperation } from '../../src/adapters/shared/cliOperations.js';
import {
  issueDeepenCapability,
  issueDeepenRerunCapability,
  commitDeepen,
  rerunDeepen,
  loadDeepenState,
} from '../../src/core/index.js';
import { seedCanonicalProgress, seedCanonicalAnswers } from '../helpers/canonicalProgress.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');

/**
 * B3e §3 — "Re-run module là amendment/version mới... mỗi rerun tạo
 * generation/version mới có supersedes, giữ history/provenance và một
 * current pointer tới generation active; raw confirmed answer cũ không bị
 * overwrite." These exercise issueDeepenRerunCapability/rerunDeepen (Core
 * application services) against a real deepen-ready workspace, seeded the
 * same way test/integration/deepen-cli.test.ts seeds one — CLI wiring for
 * rerun itself is a separate, future B4-scoped follow-up (not this
 * contract's layer), so these call the Core services directly rather than
 * through runCliOperation.
 */
describe('Deepen rerun/versioning (B3e)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'deepen-rerun-test-'));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  async function seedDeepenReadyWorkspace(workspace: string): Promise<void> {
    cpSync(join(REPO_ROOT, 'Design/Content'), join(workspace, 'Design/Content'), { recursive: true });
    seedCanonicalProgress(workspace, { branch: 'cli', phase: 'ready-for-validation', current_step: null });
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

  async function optInAndCommitFirst(workspace: string): Promise<void> {
    const optIn = await runCliOperation(workspace, ['deepen', '--module', 'glossary', '--opt-in']);
    expect(optIn.ok).toBe(true);
    const next = issueDeepenCapability(workspace, 'glossary');
    if (!('ok' in next) || !next.ok) throw new Error('setup: issueDeepenCapability failed');
    const commit = commitDeepen(workspace, {
      module: 'glossary',
      questionId: next.instance.question_id,
      subjectId: next.instance.subject_id,
      capabilityToken: next.capability_token,
      answerText: 'Bản đầu tiên.',
    });
    expect(commit.ok).toBe(true);
  }

  test('issueDeepenRerunCapability từ chối instance chưa từng commit (DEEPEN_RERUN_NOT_YET_ANSWERED)', async () => {
    await seedDeepenReadyWorkspace(tempDir);
    await runCliOperation(tempDir, ['deepen', '--module', 'glossary', '--opt-in']);
    const res = issueDeepenRerunCapability(tempDir, 'glossary', 'DS1a', null);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('unreachable');
    expect(res.reason_code).toBe('DEEPEN_RERUN_NOT_YET_ANSWERED');
  });

  test('rerun đầy đủ: generation tăng, supersedes đúng, current answers.json cập nhật, entry cũ giữ trong history', async () => {
    await seedDeepenReadyWorkspace(tempDir);
    await optInAndCommitFirst(tempDir);

    const stateBefore = loadDeepenState(tempDir);
    const firstEntry = stateBefore.modules.glossary.answered.find((a) => a.question_id === 'DS1a')!;
    expect(firstEntry.generation).toBe(1);
    expect(firstEntry.supersedes).toBeNull();

    const rerunCap = issueDeepenRerunCapability(tempDir, 'glossary', 'DS1a', null);
    expect(rerunCap.ok).toBe(true);
    if (!rerunCap.ok) throw new Error('unreachable');

    const rerunRes = rerunDeepen(tempDir, {
      module: 'glossary',
      questionId: 'DS1a',
      subjectId: null,
      capabilityToken: rerunCap.capability_token,
      answerText: 'Bản sửa lại, chính xác hơn.',
    });
    expect(rerunRes.ok).toBe(true);
    if (!rerunRes.ok) throw new Error('unreachable');
    expect(rerunRes.generation).toBe(2);

    const stateAfter = loadDeepenState(tempDir);
    const entries = stateAfter.modules.glossary.answered.filter((a) => a.question_id === 'DS1a');
    expect(entries.length).toBe(2);
    expect(entries.some((a) => a.generation === 1)).toBe(true);
    const gen2 = entries.find((a) => a.generation === 2)!;
    expect(gen2.supersedes).toBe(1);

    // Current-value projection (answers.json) points at the latest answer —
    // every existing reader (renderers/computeSourceDigest/emitTier2) keeps
    // working off this flat map unchanged.
    const answers = JSON.parse(readFileSync(join(tempDir, 'Design/.interview/answers.json'), 'utf8'));
    expect(answers.DS1a).toBe('Bản sửa lại, chính xác hơn.');

    // The old raw answer is never overwritten — it stays readable in history.
    const historyPath = join(tempDir, 'Design/.interview/deepen-answer-history.json');
    expect(existsSync(historyPath)).toBe(true);
    const history = JSON.parse(readFileSync(historyPath, 'utf8'));
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({ question_id: 'DS1a', generation: 1, value: 'Bản đầu tiên.' });
    expect(history[1]).toMatchObject({
      question_id: 'DS1a',
      generation: 2,
      value: 'Bản sửa lại, chính xác hơn.',
    });
  });

  test('rerunDeepen không cho rerun 2 lần với cùng 1 capability token đã tiêu thụ (replay)', async () => {
    await seedDeepenReadyWorkspace(tempDir);
    await optInAndCommitFirst(tempDir);

    const rerunCap = issueDeepenRerunCapability(tempDir, 'glossary', 'DS1a', null);
    expect(rerunCap.ok).toBe(true);
    if (!rerunCap.ok) throw new Error('unreachable');

    const first = rerunDeepen(tempDir, {
      module: 'glossary',
      questionId: 'DS1a',
      subjectId: null,
      capabilityToken: rerunCap.capability_token,
      answerText: 'Sửa lần 1.',
    });
    expect(first.ok).toBe(true);

    const replay = rerunDeepen(tempDir, {
      module: 'glossary',
      questionId: 'DS1a',
      subjectId: null,
      capabilityToken: rerunCap.capability_token,
      answerText: 'Sửa lần 2 dùng lại token cũ.',
    });
    expect(replay.ok).toBe(false);
    if (replay.ok) throw new Error('unreachable');
    expect(replay.reason_code).toBe('TURN_CAPABILITY_REPLAY');
  });

  test('rerun không phá canEmitModule completeness — module vẫn emit được sau rerun', async () => {
    await seedDeepenReadyWorkspace(tempDir);
    await optInAndCommitFirst(tempDir);
    // Commit câu còn lại của glossary để module đủ điều kiện emit.
    const next2 = issueDeepenCapability(tempDir, 'glossary');
    if (!next2.ok) throw new Error('setup: DS1b capability failed');
    const commit2 = commitDeepen(tempDir, {
      module: 'glossary',
      questionId: next2.instance.question_id,
      subjectId: next2.instance.subject_id,
      capabilityToken: next2.capability_token,
      answerText: 'Bản đầu tiên câu 2.',
    });
    expect(commit2.ok).toBe(true);

    const rerunCap = issueDeepenRerunCapability(tempDir, 'glossary', 'DS1a', null);
    if (!rerunCap.ok) throw new Error('setup: rerun capability failed');
    const rerunRes = rerunDeepen(tempDir, {
      module: 'glossary',
      questionId: 'DS1a',
      subjectId: null,
      capabilityToken: rerunCap.capability_token,
      answerText: 'Bản sửa lại.',
    });
    expect(rerunRes.ok).toBe(true);

    const emitRes = await runCliOperation(tempDir, ['deepen', '--module', 'glossary', '--emit']);
    expect(emitRes.ok).toBe(true);
  });
});
