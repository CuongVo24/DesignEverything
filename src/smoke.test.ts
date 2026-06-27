import { expect, test } from 'vitest';
import { DUMMY_VAL } from '@/core/dummy.js';
import {
  loadScript,
  loadGatePolicy,
  loadProgress,
  saveProgress,
  commitStep,
  checkRate,
  stampTurn
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

test('engine - advanceState web branch', () => {
  const scriptPath = join(__dirname, '../Design/Content/interview-script/script.yaml');
  const script = loadScript(scriptPath);

  let progress = loadProgress(join(__dirname, '../test/fixtures/progress/init-s0.json'));

  // Commit S0 -> S5
  for (let i = 0; i <= 5; i++) {
    const currentId = `S${i}`;
    expect(progress.current_step).toBe(currentId);
    progress = commitStep(progress, script, { userTurnId: `turn-${i}` });
  }

  // Current step should be S6
  expect(progress.current_step).toBe('S6');

  // Committing S6 requires branchChoice
  expect(() => commitStep(progress, script, { userTurnId: 'turn-6' })).toThrow();

  // Commit S6 with web branch
  progress = commitStep(progress, script, { userTurnId: 'turn-6', branchChoice: 'web' });
  expect(progress.branch).toBe('web');
  expect(progress.current_step).toBe('W1');

  // Commit W1 -> W5
  for (let i = 1; i <= 5; i++) {
    expect(progress.current_step).toBe(`W${i}`);
    progress = commitStep(progress, script, { userTurnId: `turn-web-${i}` });
  }

  // Interview complete, no more questions
  expect(progress.current_step).toBeNull();
  // Since we haven't emitted docs, phase should be docs-emitted
  expect(progress.phase).toBe('docs-emitted');

  // Let's reset and test ready-to-build phase transition
  let progressFull = loadProgress(join(__dirname, '../test/fixtures/progress/init-s0.json'));
  for (let i = 0; i <= 5; i++) {
    progressFull = commitStep(progressFull, script, { userTurnId: `turn-${i}` });
  }
  progressFull = commitStep(progressFull, script, { userTurnId: 'turn-6', branchChoice: 'web' });
  for (let i = 1; i <= 4; i++) {
    progressFull = commitStep(progressFull, script, { userTurnId: `turn-web-${i}` });
  }

  // Fake docs and gates emission
  // Web branch required docs: 00-vision.md, 01-personas.md, 02-scope.md, 03-data-model.md, 04-flows.md, 05-architecture.md, 06-constraints.md, 07-deployment.md, README.md (derived dynamically from script questions)
  const webQuestions = script.questions.filter(q => q.branch === 'core' || q.branch === 'web');
  progressFull.emitted_docs = webQuestions.map(q => q.target_doc);
  progressFull.gates_passed = ['scope-locked'];

  // Commit the last question W5
  progressFull = commitStep(progressFull, script, { userTurnId: 'turn-web-5' });
  expect(progressFull.current_step).toBeNull();
  expect(progressFull.phase).toBe('ready-to-build');
});

test('engine - advanceState mobile branch', () => {
  const scriptPath = join(__dirname, '../Design/Content/interview-script/script.yaml');
  const script = loadScript(scriptPath);

  let progress = loadProgress(join(__dirname, '../test/fixtures/progress/init-s0.json'));
  for (let i = 0; i <= 5; i++) {
    progress = commitStep(progress, script, { userTurnId: `turn-${i}` });
  }
  expect(progress.current_step).toBe('S6');

  // Commit S6 with mobile branch choice
  progress = commitStep(progress, script, { userTurnId: 'turn-6', branchChoice: 'mobile' });
  expect(progress.branch).toBe('mobile');
  expect(progress.current_step).toBe('M1');
});

test('engine - checkRate & stampTurn & duplicate turn validation', () => {
  const scriptPath = join(__dirname, '../Design/Content/interview-script/script.yaml');
  const script = loadScript(scriptPath);

  let progress = loadProgress(join(__dirname, '../test/fixtures/progress/init-s0.json'));

  // Initial: answered_len_at_last_turn is 0, answered is []
  expect(checkRate(progress, 0).ok).toBe(true);
  expect(checkRate(progress, 1).ok).toBe(true);
  expect(checkRate(progress, 2).ok).toBe(false);

  // Commit S0
  progress = commitStep(progress, script, { userTurnId: 'turn-0' });
  // Duplicate turn ID commit should throw
  expect(() => commitStep(progress, script, { userTurnId: 'turn-0' })).toThrow();

  // Stamp turn
  progress = stampTurn(progress, progress.answered.length);
  expect(progress.answered_len_at_last_turn).toBe(1);

  // Now length at last turn is 1. Checking rate limit for next turn:
  expect(checkRate(progress, 1).ok).toBe(true); // answered didn't grow
  expect(checkRate(progress, 2).ok).toBe(true); // answered grew by 1
  expect(checkRate(progress, 3).ok).toBe(false); // answered grew by 2
});
