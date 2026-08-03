import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, cpSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { runCliOperation } from '../adapters/shared/cliOperations.js';
import { manifestPath } from './emitTransactionActivate.js';
import { runSemanticValidation } from './semanticValidation.js';
import { seedCanonicalProgress, seedCanonicalAnswers } from '../../test/helpers/canonicalProgress.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');

/**
 * Mirrors test/integration/cli-protocol.test.ts's seedEmitReadyWorkspace.
 * P3 tightened `emit` to require the canonical store already be in
 * `ready-for-validation` (the honest post-interview handoff phase), and P10
 * made tier-1 emit read answers off the canonical store, not the legacy
 * Design/.interview/answers.json file. This helper had drifted from both:
 * it left the phase at the `initializeInterviewStore` default (`interview`)
 * and hand-wrote the dead answers.json, so `emit` fails closed with
 * INTERVIEW_NOT_READY_FOR_VALIDATION. Align it with the canonical seed.
 */
function seedEmitReadyWorkspace(workspace: string): void {
  cpSync(join(REPO_ROOT, 'Design/Content'), join(workspace, 'Design/Content'), { recursive: true });
  seedCanonicalProgress(workspace, {
    phase: 'ready-for-validation',
    branch: 'cli',
    current_step: null,
  });
  seedCanonicalAnswers(workspace, {
    S0: 'CLI tool',
    S1: 'Nỗi đau A, xoay xở B',
    S2: 'Dev (Contributor)',
    S3: 'Must: chạy lệnh chính. Should: log đẹp.',
    S4: 'Config, Job',
    S5: 'Mở terminal -> chạy lệnh -> xem kết quả',
    S6: 'Solo, 2 tuần',
    C1: 'Node.js (TypeScript)',
    C2: 'flags/arguments',
    C3: 'file config JSON ~/.config/myapp.json',
    C4: 'macOS',
    C5: 'NPM registry',
  });
}

describe('P1 (DEBT1) — runSemanticValidation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'semantic-validation-test-'));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test('fails closed with manifest-present when no tier-1 manifest exists', () => {
    const result = runSemanticValidation(tempDir);
    expect(result.pass).toBe(false);
    const manifestCheck = result.checks.find((c) => c.id === 'manifest-present');
    expect(manifestCheck?.ok).toBe(false);
    // every check id is always emitted, even when downstream checks skip
    expect(result.checks.map((c) => c.id)).toEqual([
      'manifest-present',
      'manifest-activated',
      'artifact-digest',
      'plan-schema',
      'gate-docs',
    ]);
  });

  test('fails manifest-activated on a manifest that is staged but not yet activated', async () => {
    await runCliOperation(tempDir, ['status']); // no-op, just confirms tempDir is inert
    seedEmitReadyWorkspace(tempDir);
    const emitRes = await runCliOperation(tempDir, ['emit']);
    expect(emitRes.ok).toBe(true);

    const mPath = manifestPath(tempDir, 'tier1');
    const manifest = JSON.parse(readFileSync(mPath, 'utf8'));
    manifest.activated_at = null;
    writeFileSync(mPath, JSON.stringify(manifest, null, 2), 'utf8');

    const result = runSemanticValidation(tempDir);
    expect(result.pass).toBe(false);
    expect(result.checks.find((c) => c.id === 'manifest-activated')?.ok).toBe(false);
  });

  test('fails artifact-digest when an emitted doc is tampered after activation', async () => {
    seedEmitReadyWorkspace(tempDir);
    const emitRes = await runCliOperation(tempDir, ['emit']);
    expect(emitRes.ok).toBe(true);

    writeFileSync(join(tempDir, 'docs/00-vision.md'), 'tampered content, does not match manifest digest', 'utf8');

    const result = runSemanticValidation(tempDir);
    expect(result.pass).toBe(false);
    const digestCheck = result.checks.find((c) => c.id === 'artifact-digest');
    expect(digestCheck?.ok).toBe(false);
    expect(digestCheck?.detail).toContain('docs/00-vision.md');
  });

  test('passes with a 64-hex validation_digest on a freshly-emitted, untampered workspace', async () => {
    seedEmitReadyWorkspace(tempDir);
    const emitRes = await runCliOperation(tempDir, ['emit']);
    expect(emitRes.ok).toBe(true);

    const result = runSemanticValidation(tempDir);
    expect(result.pass).toBe(true);
    expect(result.checks.every((c) => c.ok)).toBe(true);
    expect(result.validation_digest).toMatch(/^[0-9a-f]{64}$/);
    expect(result.validation_digest).not.toBe('pass');
  });

  test('validation_digest changes when a check flips from pass to fail', async () => {
    seedEmitReadyWorkspace(tempDir);
    const emitRes = await runCliOperation(tempDir, ['emit']);
    expect(emitRes.ok).toBe(true);

    const happy = runSemanticValidation(tempDir);
    writeFileSync(join(tempDir, 'docs/00-vision.md'), 'tampered', 'utf8');
    const tampered = runSemanticValidation(tempDir);

    expect(happy.validation_digest).not.toBe(tampered.validation_digest);
  });
});
