import { join } from 'path';
import { existsSync } from 'fs';
import { loadProgress, saveProgress, loadScript, checkRate, stampTurn, issueTurnCapability } from '../../core/index.js';
import { renderInject } from './skill/render-inject.js';

export function onUserPromptSubmit(ctx: {
  workspaceRoot: string;
  userTurnId: string;
}): { decision: 'allow' | 'block'; injectedContext?: string; message?: string } {
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

  // 3. Stamp turn, issue capability if active step, and save progress
  let stampedProgress = stampTurn(progress, progress.answered.length);

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
  }

  try {
    saveProgress(progressPath, stampedProgress);
  } catch (error: unknown) {
    return {
      decision: 'block',
      message: `Failed to save progress state: ${(error as Error).message}`,
    };
  }

  // 4. Inject context if current_step != null
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
      injectedContext = renderInject(stampedProgress, script);
    } catch (error: unknown) {
      return {
        decision: 'block',
        message: `Failed to render inject context: ${(error as Error).message}`,
      };
    }

    return {
      decision: 'allow',
      injectedContext,
    };
  }

  // 5. If current_step == null -> do not inject
  return {
    decision: 'allow',
  };
}
