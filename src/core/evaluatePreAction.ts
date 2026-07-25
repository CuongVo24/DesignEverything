import { join } from 'path';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { loadInterviewStore, transactInterviewStore } from './interviewStore.js';
import { loadGatePolicy } from './loadGatePolicy.js';
import { evaluateGate, isBlocked } from './evaluateGate.js';
import { loadExecutionState } from './advanceExecutionState.js';
import { assertValidatedSnapshot, loadEmittedDocs } from './validatedSnapshot.js';
import { loadDeepenState } from './deepenState.js';
import { authorizeMutation } from './artifactOwnership.js';
import { classifyCommand } from './classifyCommand.js';
import { canonicalizeWorkspacePath } from './pathPolicy.js';
import { inspectRuntimeHealth } from './runtimeHealth.js';
import {
  PreActionRequest,
  PreActionDecision,
  AdapterCapability,
  type Progress,
} from './schemas/index.js';

/**
 * Cảnh báo mềm B20a: module deepen đã opt-in nhưng chưa emit. Best-effort, không
 * bao giờ throw (deepen-state hỏng/thiếu → []). KHÔNG đổi decision/enforcement.
 */
function collectDeepenPending(workspace: string): string[] {
  try {
    const state = loadDeepenState(workspace);
    return (Object.keys(state.modules) as (keyof typeof state.modules)[]).filter(
      (m) => state.modules[m].opted_in && state.modules[m].emitted_at === null
    );
  } catch {
    return [];
  }
}

export function evaluatePreAction(
  request: PreActionRequest,
  capability?: AdapterCapability
): PreActionDecision {
  const decision = evaluatePreActionInner(request, capability);
  if (decision.decision === 'allow') {
    const pending = collectDeepenPending(request.workspace);
    if (pending.length > 0) return { ...decision, deepen_pending: pending };
  }
  return decision;
}

function evaluatePreActionInner(
  request: PreActionRequest,
  capability?: AdapterCapability
): PreActionDecision {
  const workspace = request.workspace;

  // 0. Fail-closed Runtime Health Check
  const health = inspectRuntimeHealth(workspace);
  if (health.status === 'broken' && request.action_kind === 'write') {
    const issue = health.issues[0];
    return {
      decision: 'deny',
      reason_code: issue?.reason_code || 'RUNTIME_HEALTH_BROKEN',
      user_message: `Runtime state is broken: ${issue?.detail || 'State corrupted'}. Run "${issue?.safe_next_command || '/build'}" to recover.`,
      enforcement: 'hard',
    };
  }

  // 1. Check capability interception early
  if (capability && !capability.intercepts.includes(request.tool_name)) {
    return {
      decision: 'allow',
      reason_code: 'unsupported-tool',
      user_message: `Tool "${request.tool_name}" không được hỗ trợ intercept bởi adapter hiện tại.`,
      enforcement: 'unsupported',
    };
  }

  // 2. Path normalization & traversal check
  const resolvedPaths: string[] = [];
  if (request.target_paths && request.target_paths.length > 0) {
    for (const targetPath of request.target_paths) {
      const canon = canonicalizeWorkspacePath(workspace, targetPath);
      if (!canon.ok) {
        return {
          decision: 'deny',
          reason_code: canon.reason_code,
          user_message: canon.message,
          enforcement: 'hard',
        };
      }
      resolvedPaths.push(canon.canonicalPath);
    }
  }

  // 3. Command argv shell operators check
  let commandStr = '';
  let baseCmd = '';
  if (request.command_argv && request.command_argv.length > 0) {
    commandStr = request.command_argv.join(' ').trim();
    baseCmd = request.command_argv[0] || '';

    const hasSeparator = /[&;|]/.test(commandStr);
    const hasRedirect = /[<>]/.test(commandStr);
    const hasSubstitution = /\$\(|`/.test(commandStr);
    const hasInlineInterpreter = /node\s+-e|python\s+-c/i.test(commandStr);

    if (hasSeparator || hasRedirect || hasSubstitution || hasInlineInterpreter) {
      return {
        decision: 'deny',
        reason_code: 'shell-operators-blocked',
        user_message: `Lệnh thực thi bị chặn do chứa ký tự shell đặc biệt hoặc inline interpreter: ${commandStr}.`,
        enforcement: 'hard',
      };
    }

    if (baseCmd === 'git') {
      const sub = request.command_argv[1];
      const disallowedGit = ['apply', 'checkout', 'reset', 'commit', 'push', 'merge', 'rebase', 'add', 'rm', 'mv'];
      if (disallowedGit.includes(sub)) {
        return {
          decision: 'deny',
          reason_code: 'git-mutation-blocked',
          user_message: `Không được phép sử dụng lệnh git ghi sửa "${sub}" trong pha thực thi để tránh mất mát code/state.`,
          enforcement: 'hard',
        };
      }
    }
  }

  // 4. Load execution state (or use request.state)
  let execState = request.state || null;
  const execStatePath = join(workspace, '.design-everything/execution-state.json');
  if (!execState && existsSync(execStatePath)) {
    try {
      execState = loadExecutionState(execStatePath);
    } catch (error: unknown) {
      return {
        decision: 'deny',
        reason_code: 'state-invalid',
        user_message: `Tệp trạng thái thực thi bị lỗi hoặc không hợp lệ: ${(error as Error).message}`,
        enforcement: 'hard',
      };
    }
  }

  // 5. Load progress state from the canonical interview store (P2.2a) — no
  // progress.json read here anymore. A caller may supply a pre-loaded
  // snapshot via request.progress (mirrors request.state); when absent this
  // loads canonical directly rather than fabricating or falling back to
  // legacy state.
  let progress: Progress | null = (request.progress as Progress | undefined) ?? null;
  let canonicalRevision: number | null = null;
  if (!progress) {
    if (!execState) {
      try {
        const envelope = loadInterviewStore(workspace);
        progress = envelope.payload.progress;
        canonicalRevision = envelope.state_revision;
      } catch (error: unknown) {
        const msg = (error as Error).message;
        if (msg.startsWith('STORE_MISSING')) {
          return {
            decision: 'deny',
            reason_code: 'progress-missing',
            user_message: 'Thiếu trạng thái phỏng vấn (canonical interview store) trong thư mục.',
            enforcement: 'hard',
          };
        }
        return {
          decision: 'deny',
          reason_code: 'progress-invalid',
          user_message: `Không thể nạp canonical interview store: ${msg}`,
          enforcement: 'hard',
        };
      }
    } else {
      try {
        const envelope = loadInterviewStore(workspace);
        progress = envelope.payload.progress;
        canonicalRevision = envelope.state_revision;
      } catch {
        // ignore — matches prior best-effort behavior once execState exists
      }
    }
  }

  if (!execState && progress && progress.phase !== 'interview' && progress.phase !== 'docs-emitted' && progress.phase !== 'ready-for-validation') {
    return {
      decision: 'deny',
      reason_code: 'EXECUTION_STATE_REQUIRED',
      user_message: 'Thiếu tệp trạng thái thực thi (execution-state.json). Vui lòng hoàn tất phỏng vấn và chạy /build để validate kế hoạch trước khi viết code.',
      enforcement: 'hard',
    };
  }

  if (!execState) {
    if (request.action_kind === 'read') {
      return {
        decision: 'allow',
        reason_code: 'read-only-allowed',
        user_message: 'Đọc tệp được phép.',
        enforcement: 'hard',
      };
    }

    if (request.action_kind === 'write') {
      for (const targetPath of resolvedPaths) {
        const auth = authorizeMutation('write', 'agent-host', targetPath);
        if (auth.decision === 'deny') {
          return {
            decision: 'deny',
            reason_code: auth.reason_code,
            user_message: auth.user_message,
            enforcement: 'hard',
          };
        }
      }
      const isDocWrite = resolvedPaths.every(
        (p) => p.startsWith('Design/') || p.startsWith('docs/') || p.startsWith('.design-everything/scratch/') || p === 'progress.json'
      );
      if (isDocWrite) {
        return {
          decision: 'allow',
          reason_code: 'interview-doc-write-allowed',
          user_message: 'Ghi tài liệu được phép.',
          enforcement: 'hard',
        };
      }
    }

    if (request.action_kind === 'shell') {
      const reqExt = request as unknown as { shell_kind?: string; command?: string };
      const classification = classifyCommand({
        shell: reqExt.shell_kind,
        raw: reqExt.command,
        argv: request.command_argv,
        cwd: request.workspace,
      });

      if (classification.outcome === 'proven_read_only') {
        return {
          decision: 'allow',
          reason_code: classification.reason_code,
          user_message: classification.message,
          enforcement: 'hard',
        };
      } else {
        return {
          decision: 'deny',
          reason_code: classification.reason_code,
          user_message: classification.message,
          enforcement: 'hard',
        };
      }
    }

    // Fallback to gate policy checks
    let policy = request.policy || null;
    const policyPath = join(workspace, 'Design/Content/interview-script/gate-policy.yaml');
    if (!policy) {
      if (!existsSync(policyPath)) {
        return {
          decision: 'deny',
          reason_code: 'gate-policy-missing',
          user_message: 'Thiếu tệp gate-policy.yaml.',
          enforcement: 'hard',
        };
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

    let blockedGate = null;
    let progressModified = false;
    for (const gate of policy.gates) {
      if (gate.requires_validation || gate.task_id || gate.requires_evidence) {
        continue;
      }
      const { open } = evaluateGate(gate, existingDocs, validationPass, completedTasks);
      if (open) {
        if (progress && !progress.gates_passed.includes(gate.id)) {
          progress.gates_passed.push(gate.id);
          progressModified = true;
        }
      }

      const coreToolMap: Record<string, 'Write' | 'Edit' | 'Bash'> = {
        'write': 'Write',
        'shell': 'Bash',
      };
      const toolMapped = coreToolMap[request.action_kind];
      if (toolMapped && isBlocked(gate, toolMapped, existingDocs, validationPass, completedTasks) && !blockedGate) {
        blockedGate = gate;
      }
    }

    if (progressModified && progress && canonicalRevision !== null) {
      try {
        const passedGates = progress.gates_passed;
        transactInterviewStore(workspace, canonicalRevision, (env) => ({
          ...env,
          payload: { ...env.payload, progress: { ...env.payload.progress, gates_passed: passedGates } },
        }));
      } catch {
        // best-effort — a concurrent writer already advanced the revision;
        // gates_passed is recomputed on the next evaluatePreAction call.
      }
    }

    if (blockedGate) {
      return {
        decision: 'deny',
        reason_code: 'gate-policy-blocked',
        user_message: blockedGate.message,
        enforcement: 'hard',
      };
    }

    return {
      decision: 'allow',
      reason_code: 'interview-allowed',
      user_message: 'Được phép thực hiện trong pha phỏng vấn.',
      enforcement: 'hard',
    };
  }

  // 7. Handle Blocked / Plan-Validating execution phase
  if (execState.phase === 'blocked') {
    return {
      decision: 'deny',
      reason_code: 'state-blocked',
      user_message: `Quy trình thực thi đang bị chặn (blocked). Lý do: ${execState.block_reason || 'Không rõ lý do.'}. Vui lòng chạy "validate" hoặc "repair" để khắc phục.`,
      enforcement: 'hard',
    };
  }

  if (execState.phase === 'plan-validating') {
    if (request.action_kind === 'read') {
      return {
        decision: 'allow',
        reason_code: 'read-only-allowed',
        user_message: 'Đọc tệp được phép.',
        enforcement: 'hard',
      };
    }

    if (request.action_kind === 'write') {
      const isAllDocs = resolvedPaths.every(
        (p) => p.startsWith('Design/') || p.startsWith('docs/') || p.startsWith('.design-everything/')
      );
      if (isAllDocs) {
        return {
          decision: 'allow',
          reason_code: 'plan-validating-write-allowed',
          user_message: 'Được phép sửa đổi kế hoạch và tài liệu thiết kế.',
          enforcement: 'hard',
        };
      }
      return {
        decision: 'deny',
        reason_code: 'PLAN_VALIDATION_REQUIRED',
        user_message: 'Không có task hoạt động (active_task) nào đang chạy. Vui lòng chạy lệnh "validate" để bắt đầu quy trình.',
        enforcement: 'hard',
      };
    }

    if (request.action_kind === 'shell') {
      const isCliCommand = request.command_argv.includes('cli.mjs') || request.command_argv.includes('cli.js');
      if (isCliCommand) {
        return {
          decision: 'allow',
          reason_code: 'cli-allowed',
          user_message: 'CLI tool execution allowed.',
          enforcement: 'hard',
        };
      }
      const safeCmds = ['cat', 'less', 'more', 'tail', 'head', 'ls', 'dir', 'find', 'pwd', 'git', 'grep', 'rg', 'echo'];
      if (safeCmds.includes(baseCmd)) {
        return {
          decision: 'allow',
          reason_code: 'read-only-allowed',
          user_message: 'Đọc thông tin qua shell được phép.',
          enforcement: 'hard',
        };
      }
      return {
        decision: 'deny',
        reason_code: 'plan-validating-shell-blocked',
        user_message: `Lệnh "${baseCmd}" bị chặn trong pha validate kế hoạch. Vui lòng chạy lệnh "validate" trước.`,
        enforcement: 'hard',
      };
    }
  }

  // 8. Handle active task execution phase
  const execPlanPath = join(workspace, '.design-everything/execution-plan.json');
  let planJson = request.plan || null;
  if (!planJson && existsSync(execPlanPath)) {
    try {
      planJson = JSON.parse(readFileSync(execPlanPath, 'utf8'));
      const emittedDocs = loadEmittedDocs(workspace, execPlanPath);
      assertValidatedSnapshot({ docs: emittedDocs, plan: planJson!, state: execState });
    } catch (error: unknown) {
      return {
        decision: 'deny',
        reason_code: 'stale-digest',
        user_message: `Xác thực Snapshot thất bại: ${(error as Error).message}`,
        enforcement: 'hard',
      };
    }
  }

  if (!execState.active_task) {
    return {
      decision: 'deny',
      reason_code: 'task-inactive',
      user_message: 'Không có task hoạt động (active_task) nào đang chạy. Vui lòng kích hoạt một task bằng lệnh "start" trước.',
      enforcement: 'hard',
    };
  }

  let policy = request.policy || null;
  const policyPath = join(workspace, 'Design/Content/interview-script/gate-policy.yaml');
  if (!policy && existsSync(policyPath)) {
    try {
      policy = loadGatePolicy(policyPath);
    } catch {
      // ignore
    }
  }

  const activeTask = planJson?.tasks?.[execState.active_task];
  let allowedPaths = activeTask?.allowed_paths || [];
  if (allowedPaths.length === 0 && policy) {
    const taskGate = policy.gates.find((g: any) => g.task_id === execState.active_task); // eslint-disable-line @typescript-eslint/no-explicit-any
    allowedPaths = taskGate?.allows_paths || [];
  }

  if (request.action_kind === 'read') {
    return {
      decision: 'allow',
      reason_code: 'read-only-allowed',
      user_message: 'Đọc tệp được phép.',
      enforcement: 'hard',
      matched_task_id: execState.active_task,
    };
  }

  if (request.action_kind === 'write') {
    // Check glob match for all resolvedPaths against allowedPaths
    const matchGlob = (p: string, glob: string): boolean => {
      const normP = p.replace(/\\/g, '/');
      const normG = glob.replace(/\\/g, '/');
      if (normP === normG || normP.startsWith(normG + '/')) return true;
      try {
        const rStr = normG.replace(/\*\*\//g, '(?:.*/)?').replace(/\*/g, '[^/]*');
        return new RegExp(`^${rStr}$`).test(normP);
      } catch {
        return false;
      }
    };

    const isAllPathsAllowed = resolvedPaths.every((path) =>
      allowedPaths.some((allowedGlob: string) => matchGlob(path, allowedGlob))
    );

    if (!isAllPathsAllowed) {
      return {
        decision: 'deny',
        reason_code: 'path-outside-scope',
        user_message: `Đường dẫn bị chặn. Lý do: không nằm trong danh sách được sửa (allows_paths) của active task. Tiếp theo: Vui lòng chạy "status", "verify", "repair" hoặc "validate".`,
        enforcement: 'hard',
        matched_task_id: execState.active_task,
      };
    }

    return {
      decision: 'allow',
      reason_code: 'write-allowed',
      user_message: 'Sửa đổi tệp hợp lệ.',
      enforcement: 'hard',
      matched_task_id: execState.active_task,
    };
  }

  if (request.action_kind === 'shell') {
    const isCliCommand = request.command_argv.includes('cli.mjs') || request.command_argv.includes('cli.js');
    if (isCliCommand) {
      return {
        decision: 'allow',
        reason_code: 'cli-allowed',
        user_message: 'CLI tool execution allowed.',
        enforcement: 'hard',
      };
    }

    const safeCmds = ['cat', 'less', 'more', 'tail', 'head', 'ls', 'dir', 'find', 'pwd', 'git', 'grep', 'rg', 'echo'];
    if (safeCmds.includes(baseCmd)) {
      return {
        decision: 'allow',
        reason_code: 'read-only-allowed',
        user_message: 'Đọc thông tin được phép.',
        enforcement: 'hard',
        matched_task_id: execState.active_task,
      };
    }

    // Exact verification command matching
    let isExactVerification = false;
    if (activeTask && activeTask.commands) {
      const cmdStr = commandStr.trim();
      for (const cmd of activeTask.commands) {
        const verificationCmdStr = cmd.argv.join(' ');
        if (cmdStr === verificationCmdStr || cmdStr.replace(/['"]/g, '') === verificationCmdStr.replace(/['"]/g, '')) {
          isExactVerification = true;
          break;
        }
      }
    }

    if (isExactVerification) {
      return {
        decision: 'allow',
        reason_code: 'command-allowed',
        user_message: 'Lệnh kiểm chứng chính xác được phép.',
        enforcement: 'hard',
        matched_task_id: execState.active_task,
      };
    }

    return {
      decision: 'deny',
      reason_code: 'command-not-registered',
      user_message: `Lệnh thực thi bị chặn: "${commandStr}". Nhiệm vụ hoạt động hiện tại: "${execState.active_task}". Chỉ cho phép các lệnh đọc thông tin an toàn hoặc lệnh kiểm chứng chính xác của task. Tiếp theo: Vui lòng chạy "status", "verify", "repair" hoặc "validate".`,
      enforcement: 'hard',
      matched_task_id: execState.active_task,
    };
  }

  return {
    decision: 'deny',
    reason_code: 'unsupported-action',
    user_message: 'Hành động không được hỗ trợ.',
    enforcement: 'hard',
  };
}
