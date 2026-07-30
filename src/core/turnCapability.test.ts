import { test, expect, describe } from 'vitest';
import {
  issueTurnCapability,
  verifyTurnCapability,
  hashToken,
} from './turnCapability.js';
import { commitStep } from './advanceState.js';
import { commitDeepenAnswer } from './deepenState.js';
import { defaultDeepenState } from './schemas/deepenState.js';
import type { Progress, Script, DeepenScript } from './schemas/index.js';

describe('B1a — Single-use interview turn capability', () => {
  const mockScript: Script = {
    version: '1.0.0',
    questions: [
      {
        id: 'S0',
        branch: 'core',
        kind: 'anchored',
        ask: 'Vision?',
        default: null,
        target_doc: '00-vision.md',
        translate_back: 'Vision',
        depends_on: [],
        gate: null,
      },
      {
        id: 'S1',
        branch: 'core',
        kind: 'anchored',
        ask: 'Problem?',
        default: null,
        target_doc: '00-vision.md',
        translate_back: 'Problem',
        depends_on: ['S0'],
        gate: null,
      },
    ],
  };

  const initialProgress: Progress = {
    version: '7.0.0',
    phase: 'interview',
    session_id: 'session-123',
    state_revision: 0,
    branch: null,
    current_step: 'S0',
    answered: [],
    emitted_docs: [],
    gates_passed: [],
    pending_turn_capability: null,
    last_user_turn_id: null,
    answered_len_at_last_turn: 0,
    updated_at: new Date().toISOString(),
    calibrate_mode: null,
  };

  test('issueTurnCapability creates a valid active capability token hash', () => {
    const issueRes = issueTurnCapability(0, {
      sessionId: 'session-123',
      operationKind: 'interview',
      questionId: 'S0',
    });

    expect(issueRes.token).toBeDefined();
    expect(issueRes.tokenHash).toBe(hashToken(issueRes.token));
    expect(issueRes.capability.status).toBe('active');
    expect(issueRes.capability.session_id).toBe('session-123');
    expect(issueRes.capability.question_id).toBe('S0');
    expect(issueRes.capability.expected_revision).toBe(0);
  });

  test('verifyTurnCapability verifies token successfully when match', () => {
    const issueRes = issueTurnCapability(0, {
      sessionId: 'session-123',
      operationKind: 'interview',
      questionId: 'S0',
    });

    const verifyRes = verifyTurnCapability(issueRes.capability, issueRes.token, {
      sessionId: 'session-123',
      operationKind: 'interview',
      questionId: 'S0',
      currentRevision: 0,
    });

    expect(verifyRes.valid).toBe(true);
    expect(verifyRes.reason_code).toBe('VALID');
  });

  test('verifyTurnCapability rejects forged, expired, or mismatched tokens', () => {
    const issueRes = issueTurnCapability(0, {
      sessionId: 'session-123',
      operationKind: 'interview',
      questionId: 'S0',
    });

    // Forged token
    const forgedRes = verifyTurnCapability(issueRes.capability, 'wrong-token', {
      sessionId: 'session-123',
      operationKind: 'interview',
      questionId: 'S0',
      currentRevision: 0,
    });
    expect(forgedRes.valid).toBe(false);
    expect(forgedRes.reason_code).toBe('TURN_CAPABILITY_FORGED');

    // Revision mismatch
    const revRes = verifyTurnCapability(issueRes.capability, issueRes.token, {
      sessionId: 'session-123',
      operationKind: 'interview',
      questionId: 'S0',
      currentRevision: 1,
    });
    expect(revRes.valid).toBe(false);
    expect(revRes.reason_code).toBe('TURN_CAPABILITY_WRONG_REVISION');

    // Question mismatch
    const qRes = verifyTurnCapability(issueRes.capability, issueRes.token, {
      sessionId: 'session-123',
      operationKind: 'interview',
      questionId: 'S1',
      currentRevision: 0,
    });
    expect(qRes.valid).toBe(false);
    expect(qRes.reason_code).toBe('TURN_CAPABILITY_WRONG_QUESTION');
  });

  test('commitStep advances revision and consumes capability', () => {
    const issueRes = issueTurnCapability(0, {
      sessionId: 'session-123',
      operationKind: 'interview',
      questionId: 'S0',
    });

    const progressWithCap: Progress = {
      ...initialProgress,
      pending_turn_capability: issueRes.capability,
    };

    const nextProgress = commitStep(progressWithCap, mockScript, {
      capabilityToken: issueRes.token,
    });

    expect(nextProgress.answered).toContain('S0');
    expect(nextProgress.current_step).toBe('S1');
    expect(nextProgress.state_revision).toBe(1);
    expect(nextProgress.pending_turn_capability?.status).toBe('consumed');

    // Replay attack with same token should fail
    expect(() =>
      commitStep(nextProgress, mockScript, {
        capabilityToken: issueRes.token,
      })
    ).toThrow(/replay/i);
  });

  test('deepen commit respects capability tokens with operation_kind=deepen', () => {
    const deepenScript: DeepenScript = {
      version: '1.0.0',
      questions: [
        {
          id: 'DS1a',
          module: 'glossary',
          per_subject: 'none',
          ask: 'Terms?',
          kind: 'anchored',
          target_doc: 'design/glossary.md',
          default_from: ['S4'],
          depends_on_tier1: ['S4'],
          translate_back: true,
        },
      ],
    };

    const issueRes = issueTurnCapability(0, {
      sessionId: 'session-123',
      operationKind: 'deepen',
      questionId: 'DS1a',
      subjectId: null,
    });

    const dState = {
      ...defaultDeepenState(),
      session_id: 'session-123',
      state_revision: 0,
      pending_turn_capability: issueRes.capability,
    };

    dState.modules.glossary.opted_in = true;

    const nextDState = commitDeepenAnswer(dState, deepenScript, {
      module: 'glossary',
      questionId: 'DS1a',
      subjectId: null,
      capabilityToken: issueRes.token,
    });

    expect(nextDState.state_revision).toBe(1);
    expect(nextDState.modules.glossary.answered).toHaveLength(1);
    expect(nextDState.pending_turn_capability?.status).toBe('consumed');
  });
});
