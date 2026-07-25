import { existsSync } from 'fs';
import { join } from 'path';
import {
  HealthReport,
  HealthIssue,
  loadProgress,
  loadExecutionState,
  loadInterviewStore,
} from './index.js';
import { loadDeepenState } from './deepenState.js';
import { loadDeepenScript } from './loadDeepenScript.js';

export function inspectRuntimeHealth(workspaceRoot: string): HealthReport {
  const issues: HealthIssue[] = [];
  const now = new Date().toISOString();

  const installManifestPath = join(workspaceRoot, '.design-everything/install-manifest.json');
  const progressPath = join(workspaceRoot, 'progress.json');
  const canonicalStorePath = join(workspaceRoot, '.design-everything/interview-state.json');
  const execStatePath = join(workspaceRoot, '.design-everything/execution-state.json');

  const hasInstallManifest = existsSync(installManifestPath);
  const hasProgress = existsSync(progressPath);
  const hasCanonicalStore = existsSync(canonicalStorePath);
  const hasExecState = existsSync(execStatePath);

  // 1. Check if completely uninstalled & uninvolved
  if (!hasInstallManifest && !hasProgress && !hasCanonicalStore && !hasExecState) {
    return {
      status: 'uninvolved',
      issues: [],
      checked_at: now,
    };
  }

  // 2. Installed or partially initialized -> check progress & interview store
  if (hasInstallManifest && !hasProgress && !hasCanonicalStore) {
    issues.push({
      severity: 'error',
      reason_code: 'MISSING_INTERVIEW_STORE',
      artifact: 'interview-state.json',
      detail: 'Install manifest exists but mandatory interview store/progress is missing.',
      safe_next_command: 'node adapter/claude-code/cli.mjs init',
      can_auto_repair: true,
    });
  }

  if (hasProgress) {
    try {
      loadProgress(progressPath);
    } catch (err: unknown) {
      issues.push({
        severity: 'error',
        reason_code: 'CORRUPT_PROGRESS_STATE',
        artifact: 'progress.json',
        detail: `Failed to load progress.json: ${(err as Error).message}`,
        safe_next_command: 'node adapter/claude-code/cli.mjs repair --state progress',
        can_auto_repair: false,
      });
    }
  }

  if (hasCanonicalStore) {
    try {
      loadInterviewStore(workspaceRoot);
    } catch (err: unknown) {
      issues.push({
        severity: 'error',
        reason_code: 'CORRUPT_INTERVIEW_STORE',
        artifact: 'interview-state.json',
        detail: `Failed to load interview store: ${(err as Error).message}`,
        safe_next_command: 'node adapter/claude-code/cli.mjs repair --state interview',
        can_auto_repair: false,
      });
    }
  }

  if (hasExecState) {
    try {
      loadExecutionState(execStatePath);
    } catch (err: unknown) {
      issues.push({
        severity: 'error',
        reason_code: 'CORRUPT_EXECUTION_STATE',
        artifact: 'execution-state.json',
        detail: `Failed to load execution state: ${(err as Error).message}`,
        safe_next_command: 'node adapter/claude-code/cli.mjs validate',
        can_auto_repair: true,
      });
    }
  }

  // B3e — a project that has opted into at least one deepen module depends on
  // deepen-script.yaml existing and parsing; if it's missing/corrupt that is a
  // hard health error (blocks deepen commit/emit), never a soft warning, since
  // the module state machine has no fallback content to fall back to.
  const deepenStatePath = join(workspaceRoot, '.design-everything/deepen-state.json');
  if (existsSync(deepenStatePath)) {
    const deepenState = loadDeepenState(workspaceRoot);
    const optedIn = Object.values(deepenState.modules).some((m) => m.opted_in);
    if (optedIn) {
      const candidates = [
        join(process.cwd(), 'Design/Content/interview-script/deepen-script.yaml'),
        join(workspaceRoot, 'Design/Content/interview-script/deepen-script.yaml'),
      ];
      const scriptPath = candidates.find((p) => existsSync(p));
      if (!scriptPath) {
        issues.push({
          severity: 'error',
          reason_code: 'MISSING_DEEPEN_SCRIPT',
          artifact: 'deepen-script.yaml',
          detail: 'Project has opted into a deepen module but deepen-script.yaml could not be found.',
          safe_next_command: 'node adapter/claude-code/cli.mjs repair --state deepen',
          can_auto_repair: false,
        });
      } else {
        try {
          loadDeepenScript(scriptPath);
        } catch (err: unknown) {
          issues.push({
            severity: 'error',
            reason_code: 'CORRUPT_DEEPEN_SCRIPT',
            artifact: 'deepen-script.yaml',
            detail: `Failed to load deepen-script.yaml: ${(err as Error).message}`,
            safe_next_command: 'node adapter/claude-code/cli.mjs repair --state deepen',
            can_auto_repair: false,
          });
        }
      }
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  const hasWarnings = issues.some((i) => i.severity === 'warning');

  return {
    status: hasErrors ? 'broken' : hasWarnings ? 'warning' : 'healthy',
    issues,
    checked_at: now,
  };
}

export function authorizeRecovery(
  report: HealthReport,
  attemptedAction: string
): { authorized: boolean; reason_code: string; message: string } {
  if (report.status === 'healthy' || report.status === 'uninvolved') {
    return { authorized: true, reason_code: 'HEALTHY_NO_RECOVERY_NEEDED', message: 'Runtime is healthy.' };
  }

  const allowedRecoveryCmds = report.issues.map((i) => i.safe_next_command);
  // Only the forward direction is safe: the attempted action must contain
  // the FULL allowed command. The reverse (`cmd.includes(attemptedAction)`)
  // let any short attemptedAction — even a single word like "node" — match
  // against a long safe command and get authorized (bypass).
  const isAllowed = allowedRecoveryCmds.some((cmd) => attemptedAction.includes(cmd));

  if (isAllowed) {
    return { authorized: true, reason_code: 'RECOVERY_AUTHORIZED', message: 'Recovery command authorized.' };
  }

  return {
    authorized: false,
    reason_code: 'UNAUTHORIZED_RECOVERY_ACTION',
    message: `Attempted action "${attemptedAction}" is not an authorized recovery command for current health issues.`,
  };
}
