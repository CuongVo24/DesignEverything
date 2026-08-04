import type { PreActionRequest, PreActionDecision, Progress, ExecutionState } from '../schemas/index.js';

/**
 * Shared context every phase handler receives from evaluatePreAction's
 * orchestrator. The orchestrator runs the phase-independent guards (health,
 * capability, path canonicalization, shell-operator scan, state/progress load,
 * CLI-shell authority, EXECUTION_STATE_REQUIRED gate) first; a phase handler is
 * only reached once those pass, so it can trust every field here as already
 * validated/canonicalized.
 */
export interface PhaseContext {
  request: PreActionRequest;
  workspace: string;
  /** Canonicalized, traversal-checked workspace-relative target paths. */
  resolvedPaths: string[];
  /** Raw command text (command_raw ?? joined argv), trimmed. '' for non-shell. */
  commandStr: string;
  /** argv[0] of the command. '' for non-shell. */
  baseCmd: string;
  execState: ExecutionState | null;
  progress: Progress | null;
  /** Canonical interview-store revision progress was loaded at, or null. */
  canonicalRevision: number | null;
}

/** A guard returns a terminal decision (short-circuit) or null (continue). */
export type GuardResult = PreActionDecision | null;
