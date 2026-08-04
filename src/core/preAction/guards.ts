import { join } from 'path';
import { existsSync } from 'fs';
import { loadInterviewStore } from '../interviewStore.js';
import { loadExecutionState } from '../advanceExecutionState.js';
import { stripQuotedContent } from '../tokenizeShellCommand.js';
import { canonicalizeWorkspacePath } from '../pathPolicy.js';
import { inspectRuntimeHealth } from '../runtimeHealth.js';
import type { PreActionRequest, PreActionDecision, Progress, ExecutionState } from '../schemas/index.js';
import type { GuardResult } from './types.js';

/** 0. Fail-closed runtime health check — a broken runtime denies every write. */
export function checkHealth(request: PreActionRequest, workspace: string): GuardResult {
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
  return null;
}

/** 2. Canonicalize + traversal-check every target path. */
export function normalizeTargetPaths(
  workspace: string,
  targetPaths: string[] | undefined
): { ok: true; paths: string[] } | { ok: false; deny: PreActionDecision } {
  const resolvedPaths: string[] = [];
  if (targetPaths && targetPaths.length > 0) {
    for (const targetPath of targetPaths) {
      const canon = canonicalizeWorkspacePath(workspace, targetPath);
      if (!canon.ok) {
        return { ok: false, deny: { decision: 'deny', reason_code: canon.reason_code, user_message: canon.message, enforcement: 'hard' } };
      }
      resolvedPaths.push(canon.canonicalPath);
    }
  }
  return { ok: true, paths: resolvedPaths };
}

/**
 * 3. Shell-operator / git-mutation scan. P4.3 — scan a quote-redacted copy so a
 * quoted argv token that legitimately contains "&&"/";"/"|" as literal text
 * (e.g. a commit message) is not misclassified as a real chaining operator.
 */
export function scanShellCommand(
  request: PreActionRequest
): { ok: true; commandStr: string; baseCmd: string } | { ok: false; deny: PreActionDecision } {
  let commandStr = '';
  let baseCmd = '';
  if (request.command_argv && request.command_argv.length > 0) {
    commandStr = (request.command_raw ?? request.command_argv.join(' ')).trim();
    baseCmd = request.command_argv[0] || '';

    const scanStr = stripQuotedContent(commandStr);
    const hasSeparator = /[&;|]/.test(scanStr);
    const hasRedirect = /[<>]/.test(scanStr);
    const hasSubstitution = /\$\(|`/.test(scanStr);
    const hasInlineInterpreter = /node\s+-e|python\s+-c/i.test(scanStr);

    if (hasSeparator || hasRedirect || hasSubstitution || hasInlineInterpreter) {
      return {
        ok: false,
        deny: {
          decision: 'deny',
          reason_code: 'shell-operators-blocked',
          user_message: `Lệnh thực thi bị chặn do chứa ký tự shell đặc biệt hoặc inline interpreter: ${commandStr}.`,
          enforcement: 'hard',
        },
      };
    }

    if (baseCmd === 'git') {
      const sub = request.command_argv[1];
      const disallowedGit = ['apply', 'checkout', 'reset', 'commit', 'push', 'merge', 'rebase', 'add', 'rm', 'mv'];
      if (disallowedGit.includes(sub)) {
        return {
          ok: false,
          deny: {
            decision: 'deny',
            reason_code: 'git-mutation-blocked',
            user_message: `Không được phép sử dụng lệnh git ghi sửa "${sub}" trong pha thực thi để tránh mất mát code/state.`,
            enforcement: 'hard',
          },
        };
      }
    }
  }
  return { ok: true, commandStr, baseCmd };
}

/** 4. Load execution state (request-supplied snapshot wins over disk). */
export function loadExecStateGuard(
  request: PreActionRequest,
  workspace: string
): { ok: true; execState: ExecutionState | null } | { ok: false; deny: PreActionDecision } {
  let execState = request.state || null;
  const execStatePath = join(workspace, '.design-everything/execution-state.json');
  if (!execState && existsSync(execStatePath)) {
    try {
      execState = loadExecutionState(execStatePath);
    } catch (error: unknown) {
      return {
        ok: false,
        deny: {
          decision: 'deny',
          reason_code: 'state-invalid',
          user_message: `Tệp trạng thái thực thi bị lỗi hoặc không hợp lệ: ${(error as Error).message}`,
          enforcement: 'hard',
        },
      };
    }
  }
  return { ok: true, execState };
}

/**
 * 5. Load progress from the canonical interview store (P2.2a). A caller may
 * supply a pre-loaded snapshot via request.progress; when absent this loads
 * canonical directly. Once execState exists, a store load failure is tolerated
 * (best-effort), matching prior behavior.
 */
export function loadProgressGuard(
  request: PreActionRequest,
  workspace: string,
  execState: ExecutionState | null
): { ok: true; progress: Progress | null; canonicalRevision: number | null } | { ok: false; deny: PreActionDecision } {
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
            ok: false,
            deny: {
              decision: 'deny',
              reason_code: 'progress-missing',
              user_message: 'Thiếu trạng thái phỏng vấn (canonical interview store) trong thư mục.',
              enforcement: 'hard',
            },
          };
        }
        return {
          ok: false,
          deny: {
            decision: 'deny',
            reason_code: 'progress-invalid',
            user_message: `Không thể nạp canonical interview store: ${msg}`,
            enforcement: 'hard',
          },
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
  return { ok: true, progress, canonicalRevision };
}
