import { join } from 'path';
import { loadScript, issuePromptCapability, inspectRuntimeHealth } from '../../core/index.js';
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

  // 1-3. Load canonical state, rate-check, stamp turn, and issue+persist a
  // capability for the active step — all in one CAS transaction (P2.2a).
  // There is no progress.json read here anymore: the canonical store is the
  // sole authority.
  const capRes = issuePromptCapability(ctx.workspaceRoot);

  if (!capRes.ok) {
    if (capRes.reason_code === 'NO_ACTIVE_STEP') {
      // Interview already complete — allow the turn, nothing to inject.
      return { decision: 'allow' };
    }
    if (capRes.reason_code === 'RATE_LIMIT_VIOLATION') {
      return { decision: 'block', message: `Rate limit violation: ${capRes.message}` };
    }
    if (capRes.reason_code === 'REVISION_CONFLICT') {
      return { decision: 'block', message: `Trạng thái vừa thay đổi đồng thời, vui lòng thử lại: ${capRes.message}` };
    }
    // STORE_MISSING or STORE_CORRUPT
    return { decision: 'block', message: `Failed to load progress state: ${capRes.message}` };
  }

  // 4. Inject context for the active question step
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
    injectedContext = renderInject(capRes.progress, script, capRes.token);
  } catch (error: unknown) {
    return {
      decision: 'block',
      message: `Failed to render inject context: ${(error as Error).message}`,
    };
  }

  return {
    decision: 'allow',
    injectedContext,
    capabilityToken: capRes.token,
  };
}
