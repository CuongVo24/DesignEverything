import { expect, test, describe } from 'vitest';
import { loadScript } from './loadScript.js';
import { computeBatch } from './computeBatch.js';
import { selectNextStep } from './advanceState.js';
import { issueTurnCapability, verifyTurnCapability } from './turnCapability.js';
import { loadInterviewStore, transactInterviewStore, initializeInterviewStore, computePayloadChecksum } from './interviewStore.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { Progress } from './schemas/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(__dirname, '../../Design/Content/interview-script/script.yaml');
const script = loadScript(scriptPath);

// B24f — QA invariants for lane 8.2 (D59/D60/D61), verified against the real
// script.yaml and the real state machine, not hand-picked fixtures.
describe('B24f — invariant: multi_select never on CAL0/S7', () => {
  test('neither CAL0 nor S7 declares multi_select in the real script.yaml', () => {
    const cal0 = script.questions.find((q) => q.id === 'CAL0')!;
    const s7 = script.questions.find((q) => q.id === 'S7')!;
    expect(cal0.multi_select).not.toBe(true);
    expect(s7.multi_select).not.toBe(true);
  });

  test('every question with recommendation.mode fixed has multi_select unset/false (schema-level, scanned over the whole real script)', () => {
    for (const q of script.questions) {
      if (q.recommendation?.mode === 'fixed') {
        expect(q.multi_select, `${q.id} is fixed-recommendation and must not declare multi_select`).not.toBe(true);
      }
    }
  });
});

describe('B24f — invariant: computeBatch never crosses a branch boundary, never includes option_hints/critic questions except as the sole head, and never exceeds 4', () => {
  function selectNextStepId(answered: string[], branch: string | null): string | null {
    return selectNextStep(answered, branch, script);
  }

  /** Walks every branch (web, mobile, cli, hybrid) end to end via computeBatch, checking every batch it emits. */
  test.each(['web', 'mobile', 'cli', 'hybrid'])('branch=%s: every batch respects the invariants across the whole real journey', (branch) => {
    let answered: string[] = [];
    let progressBranch: string | null = null;
    let currentStep: string | null = 'CAL0';
    let guard = 0;

    while (currentStep !== null) {
      guard += 1;
      if (guard > 40) throw new Error('runaway loop — selectNextStep/computeBatch not converging');

      const progress: Progress = {
        version: '4.0.0',
        session_id: 's',
        state_revision: 0,
        phase: 'interview',
        branch: progressBranch,
        calibrate_mode: 'fast',
        current_step: currentStep,
        answered,
        emitted_docs: [],
        gates_passed: [],
        pending_turn_capability: null,
        last_user_turn_id: null,
        answered_len_at_last_turn: answered.length,
        updated_at: new Date().toISOString(),
      };

      const batch = computeBatch(progress, script);
      expect(batch.length).toBeGreaterThan(0);
      expect(batch.length).toBeLessThanOrEqual(4);
      expect(batch[0]).toBe(currentStep);

      const headQuestion = script.questions.find((q) => q.id === batch[0])!;
      for (const qid of batch) {
        const q = script.questions.find((qq) => qq.id === qid)!;
        expect(q.branch, `${qid} in batch starting at ${batch[0]} crosses branch boundary`).toBe(headQuestion.branch);
        if (qid !== batch[0]) {
          expect(q.option_hints, `${qid} has option_hints but is not the sole batch head`).toBeUndefined();
          expect(script.critics?.[qid], `${qid} has a critic but is not the sole batch head`).toBeUndefined();
        }
      }
      // S7 always caps the batch — nothing may follow it.
      const s7Index = batch.indexOf('S7');
      if (s7Index !== -1) {
        expect(s7Index).toBe(batch.length - 1);
      }

      // Advance past the whole batch, exactly like a real multi-question commit would.
      for (const qid of batch) {
        answered = [...answered, qid];
        if (qid === 'S7') progressBranch = branch;
      }
      currentStep = selectNextStepId(answered, progressBranch);
    }

    expect(answered.length).toBeGreaterThan(10);
  });
});

describe('B24f — invariant: batch token guards (allow within batch, replay, wrong-question)', () => {
  function issueBatchCapability(progress: Progress, batch: string[]) {
    const issued = issueTurnCapability(progress.state_revision || 0, {
      sessionId: progress.session_id || 'default-session',
      operationKind: 'interview',
      questionId: batch[0],
    });
    return { ...issued, capability: { ...issued.capability, question_ids: batch } };
  }

  test('committing the second question in a batch after the revision has bumped is allowed', () => {
    const progress: Progress = {
      version: '4.0.0', session_id: 's', state_revision: 5, phase: 'interview', branch: null,
      calibrate_mode: 'fast', current_step: 'CAL0', answered: [], emitted_docs: [], gates_passed: [],
      pending_turn_capability: null, last_user_turn_id: null, answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
    };
    const issued = issueBatchCapability(progress, ['CAL0', 'S0']);
    // First commit consumed CAL0 — revision bumped to 6, one question consumed.
    const afterFirst = { ...issued.capability, consumed_question_ids: ['CAL0'] };
    const result = verifyTurnCapability(afterFirst, issued.token, {
      sessionId: 's', operationKind: 'interview', questionId: 'S0', currentRevision: 6,
    });
    expect(result.valid).toBe(true);
  });

  test('replaying an already-consumed question within the batch is denied', () => {
    const progress: Progress = {
      version: '4.0.0', session_id: 's', state_revision: 5, phase: 'interview', branch: null,
      calibrate_mode: 'fast', current_step: 'CAL0', answered: [], emitted_docs: [], gates_passed: [],
      pending_turn_capability: null, last_user_turn_id: null, answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
    };
    const issued = issueBatchCapability(progress, ['CAL0', 'S0']);
    const afterFirst = { ...issued.capability, consumed_question_ids: ['CAL0'] };
    const result = verifyTurnCapability(afterFirst, issued.token, {
      sessionId: 's', operationKind: 'interview', questionId: 'CAL0', currentRevision: 6,
    });
    expect(result.valid).toBe(false);
    expect(result.reason_code).toBe('TURN_CAPABILITY_REPLAY');
  });

  test('committing a question outside the batch is denied as wrong-question', () => {
    const progress: Progress = {
      version: '4.0.0', session_id: 's', state_revision: 5, phase: 'interview', branch: null,
      calibrate_mode: 'fast', current_step: 'CAL0', answered: [], emitted_docs: [], gates_passed: [],
      pending_turn_capability: null, last_user_turn_id: null, answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
    };
    const issued = issueBatchCapability(progress, ['CAL0', 'S0']);
    const result = verifyTurnCapability(issued.capability, issued.token, {
      sessionId: 's', operationKind: 'interview', questionId: 'S1', currentRevision: 5,
    });
    expect(result.valid).toBe(false);
    expect(result.reason_code).toBe('TURN_CAPABILITY_WRONG_QUESTION');
  });
});

describe('B24f — invariant: a pre-B24b capability record (no question_ids) round-trips without CHECKSUM_MISMATCH', () => {
  test('loading a hand-written envelope with a bare (single-question-shape) capability record does not throw', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-b24f-checksum-'));
    try {
      initializeInterviewStore(workspace);
      // Simulate a capability record shaped exactly as pre-B24b code would
      // have written it — no question_ids/consumed_question_ids fields at
      // all (not even undefined-but-present; genuinely absent, as an old
      // JSON file on disk would be).
      const envelope = loadInterviewStore(workspace);
      const preB24bCapability = {
        token_hash: 'a'.repeat(64),
        session_id: 'default-session',
        operation_kind: 'interview' as const,
        question_id: 'CAL0',
        subject_id: null,
        expected_revision: 1,
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 1800_000).toISOString(),
        consumed_at: null,
        status: 'active' as const,
        // deliberately no question_ids / consumed_question_ids
      };
      const updated = transactInterviewStore(workspace, envelope.state_revision, (env) => ({
        ...env,
        payload: {
          ...env.payload,
          progress: { ...env.payload.progress, pending_turn_capability: preB24bCapability },
        },
      }));
      expect(updated.checksum).toBe(computePayloadChecksum(updated.payload));

      // Re-read from disk exactly as a fresh process would — this is the
      // real regression: loadInterviewStore must not throw CHECKSUM_MISMATCH
      // just because a record predates question_ids.
      expect(() => loadInterviewStore(workspace)).not.toThrow();
      const reloaded = loadInterviewStore(workspace);
      expect(reloaded.payload.progress.pending_turn_capability?.question_ids).toBeUndefined();
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
