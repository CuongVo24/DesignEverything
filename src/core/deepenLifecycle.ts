import type { Progress, ExecutionState } from './schemas/index.js';
import type { EmitManifest } from './schemas/emitManifest.js';
import type { DeepenModuleId } from './schemas/deepenScript.js';

export interface DeepenRuntimeSnapshot {
  progress: Progress;
  tier1Manifest: EmitManifest | null;
  executionState: ExecutionState | null;
}

export type CanStartDeepenDecision =
  | { allowed: true }
  | { allowed: false; reason_code: string; message: string };

// Execution phases where the build is actively doing something — deepen
// opt-in/commit must wait so it never competes with execution recovery for
// the user's attention or for file-write budget.
const BUSY_EXECUTION_PHASES = new Set(['executing', 'verifying', 'repairing', 'reviewing', 'blocked']);

/**
 * Preconditions for opening (opting into) a deepen module, per B3e: tier-1
 * must have an activated manifest (healthy emit), the core interview must
 * have no remaining required question, and execution must not be busy.
 * Pure decision — callers apply it before invoking optInModule/commitDeepenAnswer.
 */
export function canStartDeepen(
  snapshot: DeepenRuntimeSnapshot,
  _moduleId: DeepenModuleId
): CanStartDeepenDecision {
  void _moduleId;
  if (!snapshot.tier1Manifest) {
    return {
      allowed: false,
      reason_code: 'TIER1_NOT_EMITTED',
      message: 'Tier-1 docs chưa được emit — chạy /build emit trước khi mở module thiết kế chi tiết.',
    };
  }
  if (!snapshot.tier1Manifest.activated_at) {
    return {
      allowed: false,
      reason_code: 'TIER1_NOT_ACTIVATED',
      message: 'Bản emit tier-1 hiện tại chưa được activate (còn ở staging) — hoàn tất activation trước.',
    };
  }

  const { progress } = snapshot;
  if (progress.current_step !== null || progress.phase === 'interview') {
    return {
      allowed: false,
      reason_code: 'INTERVIEW_INCOMPLETE',
      message: 'Vẫn còn câu phỏng vấn bắt buộc chưa trả lời — hoàn tất phỏng vấn lõi trước khi mở deepen.',
    };
  }

  if (snapshot.executionState && BUSY_EXECUTION_PHASES.has(snapshot.executionState.phase)) {
    return {
      allowed: false,
      reason_code: 'EXECUTION_BUSY',
      message: `Execution đang ở pha "${snapshot.executionState.phase}" — deepen chỉ mở khi build không bận hoặc bị chặn.`,
    };
  }

  return { allowed: true };
}

// Deepen modules whose content is derived from — and can contradict — the
// architecture/test-strategy inputs a validated execution plan relied on.
// glossary/feature-spec describe existing scope and never invalidate a plan.
const PLAN_AFFECTING_MODULES: ReadonlySet<DeepenModuleId> = new Set(['adr', 'test-strategy']);

export function isPlanAffectingModule(module: DeepenModuleId): boolean {
  return PLAN_AFFECTING_MODULES.has(module);
}

/**
 * After a plan-affecting tier-2 module (adr/test-strategy) is emitted, any
 * execution state that has already moved past plan-validating must be marked
 * stale so `/build validate` re-runs before further execution — never a
 * silent pass on outdated architecture/test assumptions.
 */
export function invalidateSnapshotForTier2(
  state: ExecutionState,
  module: DeepenModuleId
): ExecutionState {
  if (!isPlanAffectingModule(module)) return state;
  if (state.phase === 'plan-validating' || state.phase === 'blocked') return state;

  return {
    ...state,
    phase: 'blocked',
    block_reason: {
      kind: 'snapshot-stale',
      reason_code: 'TIER2_PLAN_AFFECTING_CHANGE',
      origin_phase: state.phase,
      task_id: null,
      recoverable_by: '/build validate',
      detail: `Module deepen "${module}" vừa emit lại và có thể đổi nội dung architecture/test-strategy mà kế hoạch đã validate dựa vào. Chạy /build validate lại trước khi tiếp tục execution.`,
      created_at: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };
}
