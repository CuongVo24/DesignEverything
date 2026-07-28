import { join } from 'path';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { loadInterviewStore, transactInterviewStore } from './interviewStore.js';
import { loadGatePolicy } from './loadGatePolicy.js';
import { evaluateGate, isBlocked } from './evaluateGate.js';
import { buildGateSnapshot } from './gateSnapshot.js';
import { loadExecutionState, allowedRemediation } from './advanceExecutionState.js';
import { assertValidatedSnapshot, loadEmittedDocs } from './validatedSnapshot.js';
import { loadDeepenState } from './deepenState.js';
import { authorizeMutation, type CatalogPathEntry } from './artifactOwnership.js';
import { loadRuntimeCatalogFor } from './runtimeCatalogLoader.js';
import { classifyCommand } from './classifyCommand.js';
import { classifyCliSubcommand } from './classifyCliSubcommand.js';
import { canonicalizeWorkspacePath, matchesPathPattern } from './pathPolicy.js';
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
/**
 * Proves the invocation is `node <cli.mjs|cli.js>` as the direct script
 * argument to node — not merely a command whose argv happens to contain the
 * literal string "cli.mjs"/"cli.js" somewhere (e.g. `node malicious.js
 * cli.mjs`), which the previous `argv.includes('cli.mjs')` check allowed.
 */
function isCliInvocation(argv: string[]): boolean {
  if (argv.length < 2) return false;
  const exe = argv[0].toLowerCase().replace(/\.exe$/, '');
  if (exe !== 'node') return false;
  const script = argv[1].replace(/\\/g, '/');
  return script === 'cli.mjs' || script === 'cli.js' || script.endsWith('/cli.mjs') || script.endsWith('/cli.js');
}

type CliShellDecision = { decision: 'allow' | 'deny'; reason_code: string; user_message: string };

// P8.2 — the subcommand-level authority resolve-cli-invocation.mjs's
// authorizeCliOperation applies on its own, now applied by Core so the
// wrapper's decision and Core's decision can never diverge. Returns null for
// a non-CLI shell command (fall through to classifyCommand as before); a
// missing subcommand defaults to 'status', mirroring resolveCliInvocation.mjs.
function classifyCliShellCommand(argv: string[], phase: string | null | undefined): CliShellDecision | null {
  if (!isCliInvocation(argv)) return null;
  const subcommand = argv[2] || 'status';
  const result = classifyCliSubcommand(subcommand, phase);
  if (result.decision === 'allow') {
    return { decision: 'allow', reason_code: 'cli-allowed', user_message: 'CLI tool execution allowed.' };
  }
  return { decision: 'deny', reason_code: result.reason_code, user_message: result.message };
}

// P6 10.3 — best-effort, same degrade-to-empty pattern as
// collectDeepenPending: a missing/broken catalog must never turn the write
// gate into a hard crash, it just falls back to exact-path-only
// classification (today's behavior) for that call.
function collectCatalogEntries(workspace: string): CatalogPathEntry[] {
  try {
    return loadRuntimeCatalogFor(workspace).artifacts;
  } catch {
    return [];
  }
}

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
      const isDocWrite = resolvedPaths.every(
        (p) => p.startsWith('Design/') || p.startsWith('docs/') || p.startsWith('.design-everything/scratch/') || p === 'progress.json'
      );
      // P6 10.3 — the real catalog's managed-output protection only applies
      // OUTSIDE the interview-phase doc-write bypass below. That bypass is a
      // known, deliberately-deferred design gap (plan-v1-bonus-tasks.md
      // P4.2: "plan-validating blanket-allow Design/**/docs/**/
      // .design-everything/**" is confirmed still present and explicitly
      // NOT fixed in this batch — it needs a real task/gate-based
      // authorization redesign, bigger than a catalog-wiring change).
      // Passing the real catalog here regardless would silently start
      // closing that gap as an unplanned side effect, since every current
      // catalog artifact lives under docs/ — exactly what the bypass covers.
      const catalogEntries = isDocWrite ? [] : collectCatalogEntries(request.workspace);
      for (const targetPath of resolvedPaths) {
        const auth = authorizeMutation('write', 'agent-host', targetPath, undefined, catalogEntries);
        if (auth.decision === 'deny') {
          return {
            decision: 'deny',
            reason_code: auth.reason_code,
            user_message: auth.user_message,
            enforcement: 'hard',
          };
        }
      }
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
      // P8.2 — a CLI-shaped invocation (e.g. `node cli.mjs commit` during
      // interview) gets Core's own subcommand+phase authority here instead
      // of falling through to classifyCommand's generic non-read-only deny.
      // Previously this branch had NO CLI awareness at all — only the
      // .mjs wrapper's parallel authorizeCliOperation ever allowed it,
      // which is exactly the divergence P8 unifies.
      const cliResult = classifyCliShellCommand(request.command_argv, progress?.phase);
      if (cliResult) {
        return { ...cliResult, enforcement: 'hard' };
      }

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

    // Build the snapshot once against the real workspace root (not
    // process.cwd(), which evaluateGate's array-overload would otherwise
    // fall back to — wrong whenever workspace !== process.cwd(), e.g. any
    // installed-target or test workspace). Building it explicitly here also
    // means every gate in the loop below is evaluated against identical
    // bytes/digests.
    const gateSnapshot = buildGateSnapshot(workspace, existingDocs, validationPass, completedTasks);

    let blockedGate = null;
    let progressModified = false;
    for (const gate of policy.gates) {
      if (gate.requires_validation || gate.task_id || gate.requires_evidence) {
        continue;
      }
      const { open } = evaluateGate(gate, gateSnapshot);
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
      if (toolMapped && isBlocked(gate, toolMapped, gateSnapshot) && !blockedGate) {
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
    // P3.2: blocked no longer means deny-everything. The typed BlockRecord
    // declares an exact remediation scope via allowedRemediation(); only
    // that declared scope is allowed, everything else still denies. This is
    // NOT a blanket recovery allow — allowedRemediation itself fails closed
    // to read-only when the block has no usable reason.
    const remediation = allowedRemediation(execState);

    if (request.action_kind === 'read' && remediation.allowed_actions.includes('read')) {
      return {
        decision: 'allow',
        reason_code: 'blocked-remediation-read-allowed',
        user_message: 'Đọc tệp được phép trong khi quy trình đang blocked.',
        enforcement: 'hard',
      };
    }

    if (request.action_kind === 'write') {
      const canWriteDocs =
        remediation.allowed_actions.includes('write-docs') ||
        remediation.allowed_actions.includes('write-task-scope');
      const pathsMatchRemediation =
        resolvedPaths.length > 0 &&
        resolvedPaths.every((p) => remediation.allowed_paths.some((pattern) => matchesPathPattern(p, pattern)));
      if (canWriteDocs && pathsMatchRemediation) {
        return {
          decision: 'allow',
          reason_code: 'blocked-remediation-write-allowed',
          user_message: 'Ghi trong phạm vi khắc phục được khai báo cho block hiện tại là được phép.',
          enforcement: 'hard',
        };
      }
    }

    if (request.action_kind === 'shell' && remediation.allowed_actions.includes('verify')) {
      const trimmedCmd = commandStr.trim();
      const trimmedRecoverCmd = (remediation.next_command || '').trim();
      if (trimmedCmd && trimmedRecoverCmd && trimmedCmd === trimmedRecoverCmd) {
        return {
          decision: 'allow',
          reason_code: 'blocked-remediation-verify-allowed',
          user_message: 'Lệnh khắc phục chính xác (recoverable_by) được phép.',
          enforcement: 'hard',
        };
      }
    }

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
      const cliResult = classifyCliShellCommand(request.command_argv, progress?.phase);
      if (cliResult) {
        return { ...cliResult, enforcement: 'hard' };
      }
      const classification = classifyCommand({
        argv: request.command_argv,
        raw: commandStr,
        cwd: request.workspace,
      });
      if (classification.outcome === 'proven_read_only') {
        return {
          decision: 'allow',
          reason_code: classification.reason_code,
          user_message: classification.message,
          enforcement: 'hard',
        };
      }
      return {
        decision: 'deny',
        reason_code: classification.reason_code,
        user_message: `Lệnh "${baseCmd}" bị chặn trong pha validate kế hoạch (${classification.message}). Vui lòng chạy lệnh "validate" trước.`,
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
    // Check glob match for all resolvedPaths against allowedPaths using the
    // shared canonical path matcher (segment-aware, regex-metacharacter-safe)
    // instead of a homegrown regex that let literal dots/pluses in a glob
    // act as unintended wildcards/quantifiers.
    const isAllPathsAllowed = resolvedPaths.every((path) =>
      allowedPaths.some((allowedGlob: string) => matchesPathPattern(path, allowedGlob))
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
    const cliResult = classifyCliShellCommand(request.command_argv, progress?.phase);
    if (cliResult) {
      return { ...cliResult, enforcement: 'hard' };
    }

    const shellClassification = classifyCommand({
      argv: request.command_argv,
      raw: commandStr,
      cwd: request.workspace,
    });
    if (shellClassification.outcome === 'proven_read_only') {
      return {
        decision: 'allow',
        reason_code: shellClassification.reason_code,
        user_message: shellClassification.message,
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
