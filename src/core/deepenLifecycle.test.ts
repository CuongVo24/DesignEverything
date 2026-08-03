import { test, expect, describe } from 'vitest';
import {
  canStartDeepen,
  isPlanAffectingModule,
  invalidateSnapshotForTier2,
  type DeepenRuntimeSnapshot,
} from './deepenLifecycle.js';
import type { Progress, ExecutionState } from './schemas/index.js';
import type { EmitManifest } from './schemas/emitManifest.js';

function makeProgress(overrides: Partial<Progress> = {}): Progress {
  return {
    version: '7.0.0',
    phase: 'ready-for-validation',
    session_id: 'default-session',
    state_revision: 0,
    branch: 'web',
    current_step: null,
    answered: [],
    emitted_docs: [],
    gates_passed: [],
    pending_turn_capability: null,
    last_user_turn_id: null,
    answered_len_at_last_turn: 0,
    updated_at: new Date().toISOString(),
    calibrate_mode: null,
    ...overrides,
  };
}

function makeManifest(overrides: Partial<EmitManifest> = {}): EmitManifest {
  return {
    version: '1.0.0',
    generation_id: 'gen-1',
    shape: 'web',
    catalog_version: '1.0.0',
    catalog_digest: 'a'.repeat(64),
    input_digest: 'b'.repeat(64),
    artifacts: [],
    created_at: new Date().toISOString(),
    activated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeExecutionState(overrides: Partial<ExecutionState> = {}): ExecutionState {
  return {
    version: '1.0.0',
    phase: 'ready-to-execute',
    active_task: null,
    active_milestone: null,
    completed_tasks: [],
    evidence: [],
    block_reason: null,
    validated_plan_digest: 'x'.repeat(64),
    validated_docs_digest: 'y'.repeat(64),
    validation_result_digest: 'z'.repeat(64),
    plan_revision: 1,
    amendment_history: [],
    open_break_tasks: [],
    reviewed_milestones: [],
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('B3e — deepen lifecycle and tier-2 transaction contract', () => {
  test('denies opt-in when tier-1 has never been emitted', () => {
    const snapshot: DeepenRuntimeSnapshot = {
      progress: makeProgress(),
      tier1Manifest: null,
      executionState: makeExecutionState(),
    };
    const decision = canStartDeepen(snapshot, 'glossary');
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason_code).toBe('TIER1_NOT_EMITTED');
  });

  test('denies opt-in when the staged tier-1 generation was never activated', () => {
    const snapshot: DeepenRuntimeSnapshot = {
      progress: makeProgress(),
      tier1Manifest: makeManifest({ activated_at: null }),
      executionState: makeExecutionState(),
    };
    const decision = canStartDeepen(snapshot, 'glossary');
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason_code).toBe('TIER1_NOT_ACTIVATED');
  });

  test('denies opt-in while required core interview questions remain', () => {
    const snapshot: DeepenRuntimeSnapshot = {
      progress: makeProgress({ current_step: 'S4', phase: 'interview' }),
      tier1Manifest: makeManifest(),
      executionState: null,
    };
    const decision = canStartDeepen(snapshot, 'glossary');
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason_code).toBe('INTERVIEW_INCOMPLETE');
  });

  test.each(['executing', 'verifying', 'repairing', 'reviewing', 'blocked'] as const)(
    'denies opt-in while execution phase is busy (%s)',
    (phase) => {
      const snapshot: DeepenRuntimeSnapshot = {
        progress: makeProgress(),
        tier1Manifest: makeManifest(),
        executionState: makeExecutionState({ phase }),
      };
      const decision = canStartDeepen(snapshot, 'adr');
      expect(decision.allowed).toBe(false);
      if (!decision.allowed) expect(decision.reason_code).toBe('EXECUTION_BUSY');
    }
  );

  test('allows opt-in once tier-1 is activated, interview is done, and execution is idle', () => {
    const snapshot: DeepenRuntimeSnapshot = {
      progress: makeProgress(),
      tier1Manifest: makeManifest(),
      executionState: makeExecutionState({ phase: 'ready-to-execute' }),
    };
    expect(canStartDeepen(snapshot, 'glossary')).toEqual({ allowed: true });
  });

  test('allows opt-in with no execution state at all (interview just finished, build never started)', () => {
    const snapshot: DeepenRuntimeSnapshot = {
      progress: makeProgress(),
      tier1Manifest: makeManifest(),
      executionState: null,
    };
    expect(canStartDeepen(snapshot, 'glossary')).toEqual({ allowed: true });
  });

  test('isPlanAffectingModule: only adr and test-strategy affect the plan', () => {
    expect(isPlanAffectingModule('adr')).toBe(true);
    expect(isPlanAffectingModule('test-strategy')).toBe(true);
    expect(isPlanAffectingModule('glossary')).toBe(false);
    expect(isPlanAffectingModule('feature-spec')).toBe(false);
  });

  test('invalidateSnapshotForTier2 blocks an in-progress execution when adr/test-strategy re-emits', () => {
    const state = makeExecutionState({ phase: 'executing', active_task: 'T3' });
    const next = invalidateSnapshotForTier2(state, 'adr');
    expect(next.phase).toBe('blocked');
    expect(next.block_reason).not.toBeNull();
    if (next.block_reason && typeof next.block_reason === 'object') {
      expect(next.block_reason.kind).toBe('snapshot-stale');
      expect(next.block_reason.recoverable_by).toBe('/build validate');
    }
  });

  test('invalidateSnapshotForTier2 leaves state untouched for glossary/feature-spec', () => {
    const state = makeExecutionState({ phase: 'executing' });
    expect(invalidateSnapshotForTier2(state, 'glossary')).toBe(state);
    expect(invalidateSnapshotForTier2(state, 'feature-spec')).toBe(state);
  });

  test('invalidateSnapshotForTier2 is a no-op when nothing has been validated yet (still plan-validating)', () => {
    const state = makeExecutionState({ phase: 'plan-validating' as ExecutionState['phase'] });
    expect(invalidateSnapshotForTier2(state, 'adr')).toBe(state);
  });
});
