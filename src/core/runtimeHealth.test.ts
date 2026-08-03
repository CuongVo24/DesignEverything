import { test, expect, describe, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  inspectRuntimeHealth,
  authorizeRecovery,
  evaluatePreAction,
} from './index.js';
import { initializeInterviewStore } from './interviewStore.js';
import { RUNTIME_VERSION, TARGET_LOCAL_INIT_COMMAND } from '../version.js';
import { createHash } from 'crypto';

function validProgress(overrides: Record<string, unknown> = {}) {
  return {
    version: '4.0.0',
    phase: 'ready-for-validation',
    branch: 'web',
    calibrate_mode: 'fast',
    current_step: null,
    answered: [],
    emitted_docs: [],
    gates_passed: [],
    last_user_turn_id: null,
    answered_len_at_last_turn: 0,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// DEBT3.2 — a real install-manifest.json is now parsed and hash-verified
// (Phase 5), so the old fabricated `{ version: '6.0.0' }` stub (which never
// matched the real schema) would report CORRUPT_INSTALL_MANIFEST for every
// test in this file. This builds a fully schema-valid manifest with no
// assets/hook_ids declared, so it trivially passes the new integrity checks
// and each test still only exercises what it's actually testing.
function validManifest(overrides: Record<string, unknown> = {}) {
  return {
    version: '1.0.0',
    adapter: 'claude-code',
    runtime_version: RUNTIME_VERSION,
    catalog_version: 'test',
    catalog_digest: '0'.repeat(64),
    build_hash: '0'.repeat(64),
    engine_range: `^${RUNTIME_VERSION}`,
    target_root: 'test',
    hook_ids: [],
    assets: [],
    installed_at: new Date().toISOString(),
    ...overrides,
  };
}

function activeTier1Manifest(overrides: Record<string, unknown> = {}) {
  return {
    version: '1.0.0',
    generation_id: 'test-generation',
    shape: 'web',
    catalog_version: 'test',
    catalog_digest: 'a'.repeat(64),
    input_digest: 'b'.repeat(64),
    artifacts: [],
    created_at: new Date().toISOString(),
    activated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('B2e — Installed runtime health and fail-closed recovery contract', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `de-test-b2e-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
    mkdirSync(tempDir, { recursive: true });
    return () => {
      if (existsSync(tempDir)) {
        try {
          rmSync(tempDir, { recursive: true, force: true });
        } catch {
          // Ignore
        }
      }
    };
  });

  test('returns uninvolved when no install manifest and no state files exist', () => {
    const report = inspectRuntimeHealth(tempDir);
    expect(report.status).toBe('uninvolved');
    expect(report.issues).toEqual([]);
  });

  test('returns broken when install manifest exists but only legacy progress is present', () => {
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify(validManifest(), null, 2)
    );
    writeFileSync(join(tempDir, 'progress.json'), JSON.stringify(validProgress(), null, 2));

    const report = inspectRuntimeHealth(tempDir);
    expect(report.status).toBe('broken');
    expect(report.issues.length).toBeGreaterThan(0);
    expect(report.issues[0].reason_code).toBe('MISSING_INTERVIEW_STORE');
  });

  test('returns broken when progress.json is corrupt JSON', () => {
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    initializeInterviewStore(tempDir);
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify(validManifest(), null, 2)
    );
    writeFileSync(join(tempDir, 'progress.json'), '{ CORRUPT_JSON ...');

    const report = inspectRuntimeHealth(tempDir);
    expect(report.status).toBe('broken');
    expect(report.issues.some((issue) => issue.reason_code === 'CORRUPT_PROGRESS_STATE')).toBe(true);
  });

  test('evaluatePreAction denies code write when runtime health is broken', () => {
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    initializeInterviewStore(tempDir);
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify(validManifest(), null, 2)
    );
    writeFileSync(join(tempDir, 'progress.json'), '{ INVALID_JSON }');

    const res = evaluatePreAction({
      workspace: tempDir,
      session_id: 'test-session',
      runtime: 'claude',
      action_kind: 'write',
      tool_name: 'write_to_file',
      target_paths: ['src/app.ts'],
      command_argv: [],
    });

    expect(res.decision).toBe('deny');
    expect(res.reason_code).toBe('CORRUPT_PROGRESS_STATE');
  });

  test('an active tier-1 manifest without execution state is unhealthy and denies code writes', () => {
    initializeInterviewStore(tempDir);
    writeFileSync(join(tempDir, 'progress.json'), JSON.stringify(validProgress(), null, 2));
    writeFileSync(
      join(tempDir, '.design-everything/emit-manifest.json'),
      JSON.stringify(activeTier1Manifest(), null, 2)
    );

    const report = inspectRuntimeHealth(tempDir);
    expect(report.status).toBe('broken');
    expect(report.issues.some((issue) => issue.reason_code === 'MISSING_EXECUTION_STATE')).toBe(true);

    const res = evaluatePreAction({
      workspace: tempDir,
      session_id: 'test-session',
      runtime: 'claude',
      action_kind: 'write',
      tool_name: 'write_to_file',
      target_paths: ['src/app.ts'],
      command_argv: [],
    });

    expect(res.decision).toBe('deny');
    expect(res.reason_code).toBe('MISSING_EXECUTION_STATE');
  });

  test('authorizeRecovery authorizes valid recovery commands', () => {
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify(validManifest(), null, 2)
    );

    const report = inspectRuntimeHealth(tempDir);
    const auth = authorizeRecovery(report, TARGET_LOCAL_INIT_COMMAND);
    expect(auth.authorized).toBe(true);
  });

  test('authorizeRecovery rejects a short attemptedAction that is merely a substring of the safe command', () => {
    // Regression: authorizeRecovery used to also check
    // `cmd.includes(attemptedAction)`, so a trivial attemptedAction like
    // "node" would match against any long safe_next_command and be
    // authorized as a bypass.
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify(validManifest(), null, 2)
    );

    const report = inspectRuntimeHealth(tempDir);
    const auth = authorizeRecovery(report, 'node');
    expect(auth.authorized).toBe(false);
    expect(auth.reason_code).toBe('UNAUTHORIZED_RECOVERY_ACTION');
  });

  test('authorizeRecovery rejects an attemptedAction that pads a safe command with extra content', () => {
    // Regression: `attemptedAction.includes(cmd)` allows the caller to wrap
    // an arbitrary prefix/suffix around a valid safe_next_command and still
    // get authorized when a destructive prefix is added to the safe command.
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify(validManifest(), null, 2)
    );

    const report = inspectRuntimeHealth(tempDir);
    const auth = authorizeRecovery(report, `rm -rf / && ${TARGET_LOCAL_INIT_COMMAND}`);
    expect(auth.authorized).toBe(false);
    expect(auth.reason_code).toBe('UNAUTHORIZED_RECOVERY_ACTION');
  });

  test('B3e — opted-in deepen module with a resolvable deepen-script.yaml stays healthy', () => {
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify(validManifest(), null, 2)
    );
    writeFileSync(
      join(tempDir, 'progress.json'),
      JSON.stringify(
        {
          version: '7.0.0',
          phase: 'ready-for-validation',
          branch: 'web',
          current_step: null,
          answered: [],
          emitted_docs: [],
          gates_passed: [],
          last_user_turn_id: null,
          answered_len_at_last_turn: 0,
          updated_at: new Date().toISOString(),
        },
        null,
        2
      )
    );
    writeFileSync(
      join(tempDir, '.design-everything/deepen-state.json'),
      JSON.stringify(
        {
          version: '1.0.0',
          session_id: 'default-session',
          state_revision: 0,
          pending_turn_capability: null,
          modules: {
            glossary: { opted_in: true, activation: 'explicit', answered: [], last_user_turn_id: null, emitted_at: null, source_digest: null, artifacts: [] },
            'feature-spec': { opted_in: false, activation: null, answered: [], last_user_turn_id: null, emitted_at: null, source_digest: null, artifacts: [] },
            adr: { opted_in: false, activation: null, answered: [], last_user_turn_id: null, emitted_at: null, source_digest: null, artifacts: [] },
            'test-strategy': { opted_in: false, activation: null, answered: [], last_user_turn_id: null, emitted_at: null, source_digest: null, artifacts: [] },
          },
        },
        null,
        2
      )
    );

    const report = inspectRuntimeHealth(tempDir);
    expect(report.issues.some((i) => i.reason_code === 'MISSING_DEEPEN_SCRIPT')).toBe(false);
    expect(report.issues.some((i) => i.reason_code === 'CORRUPT_DEEPEN_SCRIPT')).toBe(false);
  });
});

describe('DEBT3.2 — install-manifest.json is parsed and hash-verified, not just existsSync-checked', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `de-test-debt3.2-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    initializeInterviewStore(tempDir);
    writeFileSync(join(tempDir, 'progress.json'), JSON.stringify(validProgress(), null, 2));
    return () => {
      if (existsSync(tempDir)) {
        try {
          rmSync(tempDir, { recursive: true, force: true });
        } catch {
          // Ignore
        }
      }
    };
  });

  test('a fully valid manifest with no declared assets/hooks reports healthy', () => {
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify(validManifest(), null, 2)
    );
    const report = inspectRuntimeHealth(tempDir);
    expect(report.status).toBe('healthy');
    expect(report.issues).toEqual([]);
  });

  test('corrupt (non-JSON) install-manifest.json reports broken with CORRUPT_INSTALL_MANIFEST', () => {
    writeFileSync(join(tempDir, '.design-everything/install-manifest.json'), '{ not valid json ...');
    const report = inspectRuntimeHealth(tempDir);
    expect(report.status).toBe('broken');
    expect(report.issues.some((i) => i.reason_code === 'CORRUPT_INSTALL_MANIFEST')).toBe(true);
  });

  test('a manifest missing required schema fields reports broken with CORRUPT_INSTALL_MANIFEST', () => {
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify({ version: '6.0.0' }, null, 2)
    );
    const report = inspectRuntimeHealth(tempDir);
    expect(report.status).toBe('broken');
    expect(report.issues.some((i) => i.reason_code === 'CORRUPT_INSTALL_MANIFEST')).toBe(true);
  });

  test('a one-byte tamper of a declared asset reports broken with TAMPERED_RUNTIME_ASSET', () => {
    writeFileSync(join(tempDir, 'runtime.mjs'), 'export const x = 1;\n');
    const originalHash = createHash('sha256')
      .update(readFileSync(join(tempDir, 'runtime.mjs')))
      .digest('hex');
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify(
        validManifest({ assets: [{ path: 'runtime.mjs', sha256: originalHash, kind: 'runtime' }] }),
        null,
        2
      )
    );

    // Sanity: healthy before tampering.
    expect(inspectRuntimeHealth(tempDir).status).toBe('healthy');

    writeFileSync(join(tempDir, 'runtime.mjs'), 'export const x = 2;\n');
    const report = inspectRuntimeHealth(tempDir);
    expect(report.status).toBe('broken');
    const issue = report.issues.find((i) => i.reason_code === 'TAMPERED_RUNTIME_ASSET');
    expect(issue).toBeDefined();
    expect(issue!.detail).toContain('runtime.mjs');
  });

  test('a declared asset that no longer exists on disk reports broken with TAMPERED_RUNTIME_ASSET', () => {
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify(
        validManifest({ assets: [{ path: 'cli.mjs', sha256: '0'.repeat(64), kind: 'launcher' }] }),
        null,
        2
      )
    );
    const report = inspectRuntimeHealth(tempDir);
    expect(report.status).toBe('broken');
    expect(report.issues.some((i) => i.reason_code === 'TAMPERED_RUNTIME_ASSET')).toBe(true);
  });

  test('a Claude-adapter manifest declaring hook_ids with no matching command in settings.json reports MISSING_HOOK_WIRING', () => {
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify(validManifest({ hook_ids: ['claude:pre-tool-use'] }), null, 2)
    );
    // No .claude/settings.json at all.
    const report = inspectRuntimeHealth(tempDir);
    expect(report.status).toBe('broken');
    expect(report.issues.some((i) => i.reason_code === 'MISSING_HOOK_WIRING')).toBe(true);
  });

  test('a Claude-adapter manifest whose hook_ids are all wired in settings.json reports no MISSING_HOOK_WIRING', () => {
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify(validManifest({ hook_ids: ['claude:pre-tool-use'] }), null, 2)
    );
    mkdirSync(join(tempDir, '.claude'), { recursive: true });
    writeFileSync(
      join(tempDir, '.claude/settings.json'),
      JSON.stringify(
        {
          hooks: {
            PreToolUse: [
              {
                matcher: 'Write|Edit|Bash',
                hooks: [{ type: 'command', command: 'node ".design-everything/runtime/6.0.0/hooks/pre-tool-use.mjs"' }],
              },
            ],
          },
        },
        null,
        2
      )
    );
    const report = inspectRuntimeHealth(tempDir);
    expect(report.issues.some((i) => i.reason_code === 'MISSING_HOOK_WIRING')).toBe(false);
  });

  test('a corrupt tier2 emit manifest reports broken with CORRUPT_EMIT_MANIFEST', () => {
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify(validManifest(), null, 2)
    );
    writeFileSync(join(tempDir, '.design-everything/emit-manifest-tier2.json'), '{ CORRUPT ...');
    const report = inspectRuntimeHealth(tempDir);
    expect(report.status).toBe('broken');
    expect(report.issues.some((i) => i.reason_code === 'CORRUPT_EMIT_MANIFEST')).toBe(true);
  });

  test('a stale runtime_version reports INSTALL_MANIFEST_STALE as a warning, not broken', () => {
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify(validManifest({ runtime_version: '0.0.1' }), null, 2)
    );
    const report = inspectRuntimeHealth(tempDir);
    expect(report.issues.some((i) => i.reason_code === 'INSTALL_MANIFEST_STALE')).toBe(true);
    expect(report.status).toBe('warning');
  });

  test('P4.2/R03 (X15) — a corrupt project-profile.json reports broken with CORRUPT_PROJECT_PROFILE, not silently ignored', () => {
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify(validManifest(), null, 2)
    );
    writeFileSync(join(tempDir, '.design-everything/project-profile.json'), '{ not valid json', 'utf8');

    const report = inspectRuntimeHealth(tempDir);
    expect(report.status).toBe('broken');
    expect(report.issues.some((i) => i.reason_code === 'CORRUPT_PROJECT_PROFILE')).toBe(true);
  });

  test('a missing project-profile.json is not itself a health problem', () => {
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify(validManifest(), null, 2)
    );

    const report = inspectRuntimeHealth(tempDir);
    expect(report.issues.some((i) => i.reason_code === 'CORRUPT_PROJECT_PROFILE')).toBe(false);
  });
});
