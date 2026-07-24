import type { Gate, GatePolicy, ExecutionState } from './schemas/index.js';
import { basename } from 'path';
import { GateSnapshot, buildGateSnapshot } from './gateSnapshot.js';

const getBasename = (p: string): string => basename(p.replace(/\\/g, '/'));

export function evaluateGate(
  gate: Gate,
  docsOrSnapshot: string[] | GateSnapshot,
  validationPass?: boolean,
  completedTasks?: string[]
): { open: boolean; missing: string[]; input_digest?: string } {
  let snapshot: GateSnapshot;

  if (Array.isArray(docsOrSnapshot)) {
    // Build snapshot dynamically for backward compatibility
    snapshot = buildGateSnapshot(process.cwd(), docsOrSnapshot, validationPass ?? false, completedTasks ?? []);
  } else {
    snapshot = docsOrSnapshot;
  }

  const missing: string[] = [];

  // Check required docs by exact path match or basename fallback if exact not found
  for (const reqDoc of gate.requires_docs) {
    const normReq = reqDoc.replace(/\\/g, '/');
    const reqBasename = getBasename(normReq);

    // Look for exact key match or basename match in snapshot artifacts
    const foundArtifact = Object.values(snapshot.artifacts).find(
      (art) => art.canonicalPath === normReq || art.canonicalPath.endsWith(normReq) || getBasename(art.canonicalPath) === reqBasename
    );

    if (!foundArtifact || !foundArtifact.exists || !foundArtifact.nonEmpty) {
      missing.push(reqDoc);
    }
  }

  let open = missing.length === 0;

  if (gate.requires_validation && !snapshot.validationPass) {
    open = false;
    missing.push('validation-pass');
  }

  if (gate.requires_evidence && snapshot.completedTasks) {
    const missingEvidence = gate.requires_evidence.filter(
      (taskId) => !snapshot.completedTasks.includes(taskId)
    );
    if (missingEvidence.length > 0) {
      open = false;
      missing.push(...missingEvidence.map((id) => `evidence:${id}`));
    }
  }

  return {
    open,
    missing,
    input_digest: snapshot.snapshotDigest,
  };
}

export function isBlocked(
  gate: Gate,
  tool: 'Write' | 'Edit' | 'Bash',
  existingDocs: string[],
  validationPass?: boolean,
  completedTasks?: string[]
): boolean {
  const { open } = evaluateGate(gate, existingDocs, validationPass, completedTasks);
  if (open) {
    return false;
  }
  return gate.blocks.includes(tool);
}

export function passedGates(
  policy: GatePolicy,
  existingDocs: string[],
  validationPass?: boolean,
  completedTasks?: string[]
): string[] {
  const passed: string[] = [];
  for (const gate of policy.gates) {
    const { open } = evaluateGate(gate, existingDocs, validationPass, completedTasks);
    if (open) {
      passed.push(gate.id);
    }
  }
  return passed;
}
import { evaluatePreAction } from './evaluatePreAction.js';

export function checkExecutionGate(
  state: ExecutionState | null,
  policy: GatePolicy | null,
  tool: 'Write' | 'Edit' | 'Bash',
  path?: string,
  allowedPathsFromPlan?: string[]
): { allowed: boolean; reason?: string } {
  if (!state) {
    return { allowed: true };
  }
  const action_kind = tool === 'Bash' ? ('shell' as const) : ('write' as const);
  const target_paths = path ? [path] : [];
  const command_argv = tool === 'Bash' && path ? path.split(/\s+/) : [];
  const workspace = process.cwd();

  let plan = undefined;
  if (state && state.active_task && allowedPathsFromPlan) {
    plan = {
      tasks: {
        [state.active_task]: {
          id: state.active_task,
          allowed_paths: allowedPathsFromPlan,
          commands: [],
        }
      }
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  const decision = evaluatePreAction({
    runtime: 'generic',
    tool_name: tool,
    action_kind,
    target_paths,
    command_argv,
    workspace,
    session_id: 'legacy-compat',
    state: state || undefined,
    policy: policy || undefined,
    plan,
  });

  return {
    allowed: decision.decision === 'allow',
    reason: decision.user_message,
  };
}

