// P2.2a — shared e2e fixture helpers for driving the canonical interview
// store directly (the way the CLI/hook application services do internally)
// instead of hand-writing progress.json, which is no longer authoritative.
import {
  loadInterviewStore,
  transactInterviewStore,
  initializeInterviewStore,
  commitStep,
  type Progress,
  type Script,
} from '../../src/core/index.js';

export function loadCanonicalProgress(workspaceRoot: string): Progress {
  return loadInterviewStore(workspaceRoot).payload.progress;
}

/** Runs commitStep inside a real canonical transaction, mirroring what commitInterviewAnswer does in production. */
export function commitViaCanonical(
  workspaceRoot: string,
  script: Script,
  commitOpts: { capabilityToken: string; branchChoice?: string }
): Progress {
  const envelope = loadInterviewStore(workspaceRoot);
  const updated = transactInterviewStore(workspaceRoot, envelope.state_revision, (env) => {
    const committed = commitStep(env.payload.progress, script, commitOpts);
    return { ...env, payload: { ...env.payload, progress: committed } };
  });
  return updated.payload.progress;
}

/** Seeds a fresh canonical store with arbitrary progress overrides (test setup only). */
export function seedCanonicalProgress(workspaceRoot: string, overrides: Partial<Progress>): Progress {
  const base = initializeInterviewStore(workspaceRoot).payload.progress;
  const seeded = transactInterviewStore(workspaceRoot, 0, (env) => ({
    ...env,
    payload: { ...env.payload, progress: { ...base, ...overrides } },
  }));
  return seeded.payload.progress;
}

/** Arbitrary direct mutation of canonical progress (test setup / adversarial simulation only). */
export function mutateCanonicalProgress(
  workspaceRoot: string,
  mutator: (p: Progress) => Progress
): Progress {
  const envelope = loadInterviewStore(workspaceRoot);
  const updated = transactInterviewStore(workspaceRoot, envelope.state_revision, (env) => ({
    ...env,
    payload: { ...env.payload, progress: mutator(env.payload.progress) },
  }));
  return updated.payload.progress;
}
