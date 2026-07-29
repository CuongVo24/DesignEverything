import type { Gate, GatePolicy, ExecutionState } from './schemas/index.js';
import { GateSnapshot, buildGateSnapshot } from './gateSnapshot.js';
import { tokenizeShellCommand } from './tokenizeShellCommand.js';

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

  // Check required docs by exact canonical path match. `gate-policy.yaml`
  // declares requires_docs as bare filenames (e.g. "00-vision.md"), while
  // the engine always emits them flatly under the one well-known `docs/`
  // directory (see evaluatePreAction's docsDir / emit.ts templates) — so a
  // bare filename is tried both as-is and joined with that single fixed
  // canonical prefix. This is NOT a basename-anywhere fallback: it is one
  // specific, hardcoded location, so a lookalike file living under an
  // unrelated directory still cannot satisfy the requirement.
  for (const reqDoc of gate.requires_docs) {
    const normReq = reqDoc.replace(/\\/g, '/');
    const candidateKeys = normReq.includes('/') ? [normReq] : [normReq, `docs/${normReq}`];
    const foundKey = candidateKeys.find((k) => snapshot.artifacts[k] !== undefined);
    const foundArtifact = foundKey ? snapshot.artifacts[foundKey] : undefined;

    if (!foundArtifact || !foundArtifact.exists || !foundArtifact.nonEmpty) {
      missing.push(reqDoc);
      continue;
    }

    // DEBT3.1 — a doc that exists on disk but no longer matches the bytes
    // the active tier-1 manifest activated is tampered, not satisfied. No
    // active manifest (or the manifest not covering this path) means an
    // empty digestMismatches list by construction, so a workspace with no
    // manifest yet keeps behaving exactly as before this binding existed.
    if (foundKey && snapshot.manifest.digestMismatches.includes(foundKey)) {
      missing.push(`tampered:${reqDoc}`);
    }
  }

  let open = missing.length === 0;

  // DEBT3.1 — requires_validation is now bound to a real, digest-shaped
  // validation result (set by runSemanticValidation via handleValidate),
  // not a floating boolean any caller could pass as true.
  const hasRealValidationDigest = /^[0-9a-f]{64}$/.test(snapshot.validationDigest);
  if (gate.requires_validation && !(snapshot.validationPass && hasRealValidationDigest)) {
    open = false;
    missing.push('validation-pass');
  }

  if (gate.requires_evidence && snapshot.completedTasks) {
    // DEBT3.1 — a task_id must both appear in completedTasks AND have a
    // real passing EvidenceRecord, not just be named in a caller-supplied
    // list.
    const missingEvidence = gate.requires_evidence.filter(
      (taskId) => !snapshot.completedTasks.includes(taskId) || !snapshot.evidenceByTask[taskId]
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
  docsOrSnapshot: string[] | GateSnapshot,
  validationPass?: boolean,
  completedTasks?: string[]
): boolean {
  const { open } = evaluateGate(gate, docsOrSnapshot, validationPass, completedTasks);
  if (open) {
    return false;
  }
  return gate.blocks.includes(tool);
}

export function passedGates(
  policy: GatePolicy,
  docsOrSnapshot: string[] | GateSnapshot,
  validationPass?: boolean,
  completedTasks?: string[]
): string[] {
  const passed: string[] = [];
  for (const gate of policy.gates) {
    const { open } = evaluateGate(gate, docsOrSnapshot, validationPass, completedTasks);
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
    // P5.1 — a missing execution state must fail closed. The old
    // blanket-allow assumed "no state yet" meant "nothing to gate", but the
    // real production authority (evaluatePreAction) never grants a write
    // this way; it always resolves interview-phase writes through explicit
    // doc-path/gate-policy checks. Mirroring a bare allow here would let a
    // legacy caller of this compatibility helper bypass that authority.
    return { allowed: false, reason: 'EXECUTION_STATE_REQUIRED: no execution state to evaluate against.' };
  }
  const action_kind = tool === 'Bash' ? ('shell' as const) : ('write' as const);
  const target_paths = path ? [path] : [];
  // P4.3 — quote-aware tokenize instead of a naive split(/\s+/), which tore
  // a quoted argument (or the command_raw text below) apart incorrectly.
  const command_argv = tool === 'Bash' && path ? tokenizeShellCommand(path) : [];
  const command_raw = tool === 'Bash' ? path : undefined;
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
    command_raw,
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

