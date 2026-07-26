import { test, expect, describe, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  inspectRuntimeHealth,
  authorizeRecovery,
  evaluatePreAction,
} from './index.js';

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

  test('returns broken when install manifest exists but mandatory progress is missing', () => {
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify({ version: '6.0.0' }, null, 2)
    );

    const report = inspectRuntimeHealth(tempDir);
    expect(report.status).toBe('broken');
    expect(report.issues.length).toBeGreaterThan(0);
    expect(report.issues[0].reason_code).toBe('MISSING_INTERVIEW_STORE');
  });

  test('returns broken when progress.json is corrupt JSON', () => {
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify({ version: '6.0.0' }, null, 2)
    );
    writeFileSync(join(tempDir, 'progress.json'), '{ CORRUPT_JSON ...');

    const report = inspectRuntimeHealth(tempDir);
    expect(report.status).toBe('broken');
    expect(report.issues[0].reason_code).toBe('CORRUPT_PROGRESS_STATE');
  });

  test('evaluatePreAction denies code write when runtime health is broken', () => {
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify({ version: '6.0.0' }, null, 2)
    );
    writeFileSync(join(tempDir, 'progress.json'), '{ INVALID_JSON }');

    const res = evaluatePreAction({
      workspace: tempDir,
      action_kind: 'write',
      tool_name: 'write_to_file',
      target_paths: ['src/app.ts'],
    });

    expect(res.decision).toBe('deny');
    expect(res.reason_code).toBe('CORRUPT_PROGRESS_STATE');
  });

  test('authorizeRecovery authorizes valid recovery commands', () => {
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify({ version: '6.0.0' }, null, 2)
    );

    const report = inspectRuntimeHealth(tempDir);
    const auth = authorizeRecovery(report, 'node adapter/claude-code/cli.mjs init');
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
      JSON.stringify({ version: '6.0.0' }, null, 2)
    );

    const report = inspectRuntimeHealth(tempDir);
    const auth = authorizeRecovery(report, 'node');
    expect(auth.authorized).toBe(false);
    expect(auth.reason_code).toBe('UNAUTHORIZED_RECOVERY_ACTION');
  });

  test('authorizeRecovery rejects an attemptedAction that pads a safe command with extra content', () => {
    // Regression: `attemptedAction.includes(cmd)` allows the caller to wrap
    // an arbitrary prefix/suffix around a valid safe_next_command and still
    // get authorized, e.g. "rm -rf / && node adapter/claude-code/cli.mjs init".
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify({ version: '6.0.0' }, null, 2)
    );

    const report = inspectRuntimeHealth(tempDir);
    const auth = authorizeRecovery(report, 'rm -rf / && node adapter/claude-code/cli.mjs init');
    expect(auth.authorized).toBe(false);
    expect(auth.reason_code).toBe('UNAUTHORIZED_RECOVERY_ACTION');
  });

  test('B3e — opted-in deepen module with a resolvable deepen-script.yaml stays healthy', () => {
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    writeFileSync(
      join(tempDir, '.design-everything/install-manifest.json'),
      JSON.stringify({ version: '6.0.0' }, null, 2)
    );
    writeFileSync(
      join(tempDir, 'progress.json'),
      JSON.stringify(
        {
          version: '7.0.0',
          phase: 'ready-to-build',
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
