import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import {
  HealthReport,
  HealthIssue,
  loadProgress,
  loadExecutionState,
  loadInterviewStore,
  installManifestSchema,
  type InstallManifest,
} from './index.js';
import { loadDeepenState } from './deepenState.js';
import { loadDeepenScript } from './loadDeepenScript.js';
import { emitManifestSchema } from './schemas/emitManifest.js';
import { RUNTIME_VERSION, TARGET_LOCAL_INIT_COMMAND, targetLocalCliCommand } from '../version.js';

function sha256File(p: string): string {
  return createHash('sha256').update(readFileSync(p)).digest('hex');
}

/**
 * DEBT3.2 (bonus-plan Phase 5) — install-manifest.json used to only be
 * `existsSync`-checked (a boolean "is this workspace installed" marker);
 * every field inside it was trusted blindly. This parses it for real,
 * hash-verifies every declared asset against the bytes actually on disk,
 * and (for the Claude adapter) confirms every declared hook is still wired
 * in .claude/settings.json — so a manifest that's present but stale,
 * corrupt, or describing tampered/missing files reports broken instead of
 * silently passing as "installed".
 */
function checkInstallManifestIntegrity(workspaceRoot: string, installManifestPath: string): HealthIssue[] {
  const issues: HealthIssue[] = [];

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(installManifestPath, 'utf8'));
  } catch (err: unknown) {
    return [
      {
        severity: 'error',
        reason_code: 'CORRUPT_INSTALL_MANIFEST',
        artifact: 'install-manifest.json',
        detail: `install-manifest.json is not valid JSON: ${(err as Error).message}`,
        safe_next_command: 'node adapter/claude-code/install.mjs <target-dir>',
        can_auto_repair: false,
      },
    ];
  }

  const parsed = installManifestSchema.safeParse(raw);
  if (!parsed.success) {
    return [
      {
        severity: 'error',
        reason_code: 'CORRUPT_INSTALL_MANIFEST',
        artifact: 'install-manifest.json',
        detail: `install-manifest.json does not match the expected schema: ${JSON.stringify(parsed.error.format())}`,
        safe_next_command: 'node adapter/claude-code/install.mjs <target-dir>',
        can_auto_repair: false,
      },
    ];
  }

  const manifest: InstallManifest = parsed.data;

  if (manifest.runtime_version !== RUNTIME_VERSION) {
    issues.push({
      severity: 'warning',
      reason_code: 'INSTALL_MANIFEST_STALE',
      artifact: 'install-manifest.json',
      detail: `Installed runtime_version "${manifest.runtime_version}" does not match the running engine's version "${RUNTIME_VERSION}".`,
      safe_next_command: 'node adapter/claude-code/install.mjs <target-dir>',
      can_auto_repair: true,
    });
  }

  const tamperedOrMissing: string[] = [];
  for (const asset of manifest.assets) {
    const assetPath = join(workspaceRoot, asset.path);
    if (!existsSync(assetPath)) {
      tamperedOrMissing.push(`${asset.path} (missing)`);
      continue;
    }
    if (sha256File(assetPath) !== asset.sha256) {
      tamperedOrMissing.push(asset.path);
    }
  }
  if (tamperedOrMissing.length > 0) {
    issues.push({
      severity: 'error',
      reason_code: 'TAMPERED_RUNTIME_ASSET',
      artifact: 'install-manifest.json',
      detail: `Installed asset(s) no longer match the manifest's recorded hash: ${tamperedOrMissing.join(', ')}.`,
      safe_next_command: 'node adapter/claude-code/install.mjs <target-dir>',
      can_auto_repair: true,
    });
  }

  if (manifest.adapter === 'claude-code' && manifest.hook_ids.length > 0) {
    const settingsPath = join(workspaceRoot, '.claude/settings.json');
    let wiredHookCommandCount = 0;
    if (existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
        const allCommands: string[] = Object.values(settings.hooks ?? {})
          .flatMap((entries) => entries as Array<{ hooks?: Array<{ command?: string }> }>)
          .flatMap((entry) => entry.hooks ?? [])
          .map((h) => h.command)
          .filter((c): c is string => typeof c === 'string');
        wiredHookCommandCount = allCommands.filter((c) => c.includes('.design-everything/runtime/')).length;
      } catch {
        wiredHookCommandCount = 0;
      }
    }
    if (wiredHookCommandCount < manifest.hook_ids.length) {
      issues.push({
        severity: 'error',
        reason_code: 'MISSING_HOOK_WIRING',
        artifact: '.claude/settings.json',
        detail: `Install manifest declares ${manifest.hook_ids.length} hook(s) (${manifest.hook_ids.join(', ')}) but only ${wiredHookCommandCount} are wired in .claude/settings.json.`,
        safe_next_command: 'node adapter/claude-code/install.mjs <target-dir>',
        can_auto_repair: true,
      });
    }
  }

  return issues;
}

function checkEmitManifestIntegrity(workspaceRoot: string): HealthIssue[] {
  const issues: HealthIssue[] = [];
  for (const [channel, relPath] of [
    ['tier1', '.design-everything/emit-manifest.json'],
    ['tier2', '.design-everything/emit-manifest-tier2.json'],
  ] as const) {
    const p = join(workspaceRoot, relPath);
    if (!existsSync(p)) continue;
    try {
      const parsed = emitManifestSchema.safeParse(JSON.parse(readFileSync(p, 'utf8')));
      if (!parsed.success) {
        issues.push({
          severity: 'error',
          reason_code: 'CORRUPT_EMIT_MANIFEST',
          artifact: relPath,
          detail: `${channel} emit manifest does not match the expected schema: ${JSON.stringify(parsed.error.format())}`,
          safe_next_command: targetLocalCliCommand('validate'),
          can_auto_repair: false,
        });
      }
    } catch (err: unknown) {
      issues.push({
        severity: 'error',
        reason_code: 'CORRUPT_EMIT_MANIFEST',
        artifact: relPath,
        detail: `Failed to parse ${channel} emit manifest: ${(err as Error).message}`,
        safe_next_command: targetLocalCliCommand('validate'),
        can_auto_repair: false,
      });
    }
  }
  return issues;
}

/**
 * A tier-1 manifest is not a substitute for execution-state.json.  The
 * manifest only proves files were activated; the execution state is the
 * authority that keeps the code gate closed until semantic validation passes.
 */
function checkTier1ExecutionHandoff(workspaceRoot: string, hasExecState: boolean): HealthIssue[] {
  if (hasExecState) return [];

  const relPath = '.design-everything/emit-manifest.json';
  const p = join(workspaceRoot, relPath);
  if (!existsSync(p)) return [];
  try {
    const parsed = emitManifestSchema.safeParse(JSON.parse(readFileSync(p, 'utf8')));
    if (!parsed.success || !parsed.data.activated_at) return [];
  } catch {
    // checkEmitManifestIntegrity owns reporting malformed manifests.
    return [];
  }

  return [{
    severity: 'error',
    reason_code: 'MISSING_EXECUTION_STATE',
    artifact: '.design-everything/execution-state.json',
    detail: 'An active tier-1 emit manifest exists but its bound execution state is missing; code remains denied until the handoff is recovered or emitted again.',
    safe_next_command: targetLocalCliCommand('emit'),
    can_auto_repair: false,
  }];
}

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
  if (hasInstallManifest && !hasCanonicalStore) {
    issues.push({
      severity: 'error',
      reason_code: 'MISSING_INTERVIEW_STORE',
      artifact: 'interview-state.json',
      detail: 'Install manifest exists but mandatory canonical interview store is missing.',
      safe_next_command: TARGET_LOCAL_INIT_COMMAND,
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
        safe_next_command: targetLocalCliCommand('repair --state progress'),
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
        safe_next_command: targetLocalCliCommand('repair --state interview'),
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
        safe_next_command: targetLocalCliCommand('validate'),
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
          safe_next_command: targetLocalCliCommand('repair --state deepen'),
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
            safe_next_command: targetLocalCliCommand('repair --state deepen'),
            can_auto_repair: false,
          });
        }
      }
    }
  }

  // DEBT3.2 — appended last so they never shift the index of the
  // pre-existing progress/interview-store/execution-state checks above
  // (existing callers rely on issues[0] staying MISSING_INTERVIEW_STORE
  // when that's the only real problem).
  if (hasInstallManifest) {
    issues.push(...checkInstallManifestIntegrity(workspaceRoot, installManifestPath));
  }
  issues.push(...checkEmitManifestIntegrity(workspaceRoot));
  issues.push(...checkTier1ExecutionHandoff(workspaceRoot, hasExecState));

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
  // Exact match only (modulo surrounding whitespace). A substring/contains
  // check in either direction is unsafe: `cmd.includes(attemptedAction)` lets
  // a trivial attemptedAction like "node" match any long safe command, and
  // `attemptedAction.includes(cmd)` lets an attacker pad an arbitrary
  // prefix/suffix (e.g. "rm -rf / && <safe command>") around a valid command
  // and still get authorized.
  const trimmedAttempt = attemptedAction.trim();
  const isAllowed = allowedRecoveryCmds.some((cmd) => trimmedAttempt === cmd.trim());

  if (isAllowed) {
    return { authorized: true, reason_code: 'RECOVERY_AUTHORIZED', message: 'Recovery command authorized.' };
  }

  return {
    authorized: false,
    reason_code: 'UNAUTHORIZED_RECOVERY_ACTION',
    message: `Attempted action "${attemptedAction}" is not an authorized recovery command for current health issues.`,
  };
}
