import { join } from 'path';
import { existsSync } from 'fs';
import {
  loadProgress,
  saveProgress,
  loadScript,
  checkRate,
  stampTurn,
  issueTurnCapability,
  inspectRuntimeHealth,
} from '../../core/index.js';
import { renderInject } from './skill/render-inject.js';

export function onUserPromptSubmit(ctx: {
  workspaceRoot: string;
  /** @deprecated unused — capability issuance/verification is the sole commit authority (B1a). */
  userTurnId?: string;
}): { decision: 'allow' | 'block'; injectedContext?: string; capabilityToken?: string; message?: string } {
  // 0. Fail-closed Runtime Health Check
  const health = inspectRuntimeHealth(ctx.workspaceRoot);
  if (health.status === 'broken') {
    const errorIssue = health.issues.find((i) => i.severity === 'error');
    if (errorIssue) {
      return {
        decision: 'block',
        message: `Runtime state is broken: ${errorIssue.detail}. Run "${errorIssue.safe_next_command}" to recover.`,
      };
    }
  }

  const progressPath = join(ctx.workspaceRoot, 'progress.json');

  if (!existsSync(progressPath)) {
    return {
      decision: 'block',
      message: 'Failed to load progress state: progress.json does not exist in workspace root',
    };
  }

  // 1. Load state
  let progress;
  try {
    progress = loadProgress(progressPath);
  } catch (error: unknown) {
    return {
      decision: 'block',
      message: `Failed to load progress state: ${(error as Error).message}`,
    };
  }

  // 2. Check rate limit
  const rateCheck = checkRate(progress, progress.answered.length);
  if (!rateCheck.ok) {
    return {
      decision: 'block',
      message: `Rate limit violation: ${rateCheck.reason ?? 'vi phạm một-bước-mỗi-lượt'}`,
    };
  }

  // 3. Stamp turn and issue turn capability for active step
  let stampedProgress = stampTurn(progress, progress.answered.length);
  let capabilityToken: string | undefined;

  if (stampedProgress.current_step !== null) {
    const issueRes = issueTurnCapability(stampedProgress.state_revision || 0, {
      sessionId: stampedProgress.session_id || 'default-session',
      operationKind: 'interview',
      questionId: stampedProgress.current_step,
    });
    stampedProgress = {
      ...stampedProgress,
      pending_turn_capability: issueRes.capability,
    };
    // Plaintext token is returned exactly once here for this turn; the
    // persisted state only ever holds its hash (issueRes.capability).
    capabilityToken = issueRes.token;
  }

  try {
    saveProgress(progressPath, stampedProgress);
  } catch (error: unknown) {
    return {
      decision: 'block',
      message: `Failed to save progress state: ${(error as Error).message}`,
    };
  }

  // 4. Inject context if active question step
  if (stampedProgress.current_step !== null) {
    const scriptPath = join(ctx.workspaceRoot, 'Design/Content/interview-script/script.yaml');
    let script;
    try {
      script = loadScript(scriptPath);
    } catch (error: unknown) {
      return {
        decision: 'block',
        message: `Failed to load interview script: ${(error as Error).message}`,
      };
    }

    let injectedContext = '';
    try {
      injectedContext = renderInject(stampedProgress, script, capabilityToken);
    } catch (error: unknown) {
      return {
        decision: 'block',
        message: `Failed to render inject context: ${(error as Error).message}`,
      };
    }

    return {
      decision: 'allow',
      injectedContext,
      capabilityToken,
    };
  }

  return {
    decision: 'allow',
  };
}
