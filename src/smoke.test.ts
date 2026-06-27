import { expect, test } from 'vitest';
import { DUMMY_VAL } from '@/core/dummy.js';
import {
  loadScript,
  loadGatePolicy,
  loadProgress,
  saveProgress
} from '@/core/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { unlinkSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('smoke test - path alias resolves correctly', () => {
  expect(DUMMY_VAL).toBe('scaffolded');
});

test('loaders - loadScript', () => {
  const scriptPath = join(__dirname, '../Design/Content/interview-script/script.yaml');
  const script = loadScript(scriptPath);
  expect(script.version).toBe('0.1.0');
  expect(script.questions.length).toBeGreaterThan(0);

  // Check that the first question is S0
  expect(script.questions[0].id).toBe('S0');
});

test('loaders - loadGatePolicy', () => {
  const policyPath = join(__dirname, '../Design/Content/interview-script/gate-policy.yaml');
  const policy = loadGatePolicy(policyPath);
  expect(policy.version).toBe('0.1.0');
  expect(policy.gates.length).toBeGreaterThan(0);
  expect(policy.gates[0].id).toBe('scope-locked');
});

test('loaders - loadProgress & saveProgress', () => {
  const initS0Path = join(__dirname, '../test/fixtures/progress/init-s0.json');
  const progress = loadProgress(initS0Path);
  expect(progress.version).toBe('0.1.0');
  expect(progress.phase).toBe('interview');
  expect(progress.current_step).toBe('S0');

  // Auto-initialization test
  const tempPath = join(__dirname, '../test/fixtures/progress/temp-init.json');
  if (existsSync(tempPath)) {
    unlinkSync(tempPath);
  }
  const autoProgress = loadProgress(tempPath);
  expect(autoProgress.current_step).toBe('S0');
  expect(autoProgress.answered.length).toBe(0);

  // Save progress
  autoProgress.answered.push('S0');
  autoProgress.answered_len_at_last_turn = 1;
  saveProgress(tempPath, autoProgress);

  const reloaded = loadProgress(tempPath);
  expect(reloaded.answered).toContain('S0');
  expect(reloaded.answered_len_at_last_turn).toBe(1);

  // Clean up
  unlinkSync(tempPath);

  // Invalid test (should throw)
  const invalidPath = join(__dirname, '../test/fixtures/progress/invalid/missing-field.json');
  expect(() => loadProgress(invalidPath)).toThrow();
});
