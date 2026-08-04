import { join } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';
import { transactInterviewStore } from '../interviewStore.js';
import { loadGatePolicy } from '../loadGatePolicy.js';
import { evaluateGate, isBlocked } from '../evaluateGate.js';
import { buildGateSnapshot } from '../gateSnapshot.js';
import type { PreActionDecision } from '../schemas/index.js';
import type { PhaseContext } from './types.js';

/**
 * Interview-phase gate-policy fallback (reached only by a non-doc write that
 * survived authorizeMutation). Loads gate-policy, rebuilds the gate snapshot
 * against the real workspace root, recomputes gates_passed fresh (X11 — full
 * replace, never a merge), and denies on any blocking gate.
 */
export function evaluateInterviewGate(ctx: PhaseContext): PreActionDecision {
  const { request, workspace, progress, canonicalRevision } = ctx;

  let policy = request.policy || null;
  const policyPath = join(workspace, 'Design/Content/interview-script/gate-policy.yaml');
  if (!policy) {
    if (!existsSync(policyPath)) {
      return { decision: 'deny', reason_code: 'gate-policy-missing', user_message: 'Thiếu tệp gate-policy.yaml.', enforcement: 'hard' };
    }
    try {
      policy = loadGatePolicy(policyPath);
    } catch (error: unknown) {
      return {
        decision: 'deny',
        reason_code: 'gate-policy-invalid',
        user_message: `Lỗi nạp gate-policy.yaml: ${(error as Error).message}`,
        enforcement: 'hard',
      };
    }
  }

  const validationPass = false;
  const completedTasks: string[] = [];
  const docsDir = join(workspace, 'docs');
  const existingDocs: string[] = [];
  if (existsSync(docsDir)) {
    const getFiles = (dir: string): string[] => {
      let list: string[] = [];
      const files = readdirSync(dir);
      for (const f of files) {
        const fp = join(dir, f);
        if (statSync(fp).isDirectory()) {
          list = list.concat(getFiles(fp));
        } else {
          list.push(fp);
        }
      }
      return list;
    };
    try {
      existingDocs.push(...getFiles(docsDir));
    } catch {
      // ignore
    }
  }

  // Build the snapshot once against the real workspace root so every gate in
  // the loop is evaluated against identical bytes/digests.
  const gateSnapshot = buildGateSnapshot(workspace, existingDocs, validationPass, completedTasks);

  let blockedGate = null;
  // X11 — gates_passed is recomputed fresh from the current snapshot every
  // call, a full replace (this loop is the sole production writer of it), so a
  // doc deleted/corrupted after its gate opened no longer leaves a stale id.
  const openGateIds: string[] = [];
  for (const gate of policy.gates) {
    if (gate.requires_validation || gate.task_id || gate.requires_evidence) {
      continue;
    }
    const { open } = evaluateGate(gate, gateSnapshot);
    if (open) {
      openGateIds.push(gate.id);
    }

    const coreToolMap: Record<string, 'Write' | 'Edit' | 'Bash'> = {
      write: 'Write',
      shell: 'Bash',
    };
    const toolMapped = coreToolMap[request.action_kind];
    if (toolMapped && isBlocked(gate, toolMapped, gateSnapshot) && !blockedGate) {
      blockedGate = gate;
    }
  }

  const gatesPassedChanged =
    !!progress &&
    (openGateIds.length !== progress.gates_passed.length ||
      openGateIds.some((id) => !progress!.gates_passed.includes(id)) ||
      progress.gates_passed.some((id) => !openGateIds.includes(id)));

  if (gatesPassedChanged && progress && canonicalRevision !== null) {
    try {
      transactInterviewStore(workspace, canonicalRevision, (env) => ({
        ...env,
        payload: { ...env.payload, progress: { ...env.payload.progress, gates_passed: openGateIds } },
      }));
    } catch {
      // best-effort — a concurrent writer already advanced the revision;
      // gates_passed is recomputed fresh on the next evaluatePreAction call.
    }
  }

  if (blockedGate) {
    return { decision: 'deny', reason_code: 'gate-policy-blocked', user_message: blockedGate.message, enforcement: 'hard' };
  }

  return {
    decision: 'allow',
    reason_code: 'interview-allowed',
    user_message: 'Được phép thực hiện trong pha phỏng vấn.',
    enforcement: 'hard',
  };
}
