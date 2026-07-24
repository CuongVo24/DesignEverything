import { test, expect, describe } from 'vitest';
import {
  classifyArtifact,
  authorizeMutation,
  InternalMutationCapability,
} from './index.js';

describe('B2a — Protected artifact ownership policy contract', () => {
  test('classifyArtifact classifies paths correctly into 5 classes', () => {
    expect(classifyArtifact('progress.json')).toBe('engine-state');
    expect(classifyArtifact('.design-everything/interview-state.json')).toBe('engine-state');
    expect(classifyArtifact('.design-everything/execution-state.json')).toBe('engine-state');

    expect(classifyArtifact('Design/Content/interview-script/script.yaml')).toBe('engine-policy');
    expect(classifyArtifact('gate-policy.yaml')).toBe('engine-policy');

    expect(classifyArtifact('.design-everything/scratch/session-1/S0/notes.txt')).toBe('interview-scratch');

    const catalog = ['docs/01-vision.md', 'docs/02-scope.md'];
    expect(classifyArtifact('docs/01-vision.md', catalog)).toBe('managed-output');

    expect(classifyArtifact('src/index.ts')).toBe('user-owned');
    expect(classifyArtifact('test/app.test.ts')).toBe('user-owned');
  });

  test('authorizeMutation allows user-owned artifact mutation', () => {
    const res = authorizeMutation('write', 'agent-host', 'src/index.ts');
    expect(res.decision).toBe('allow');
    expect(res.reason_code).toBe('USER_OWNED_ALLOWED');
  });

  test('authorizeMutation denies direct agent-host write to engine-state', () => {
    const res = authorizeMutation('write', 'agent-host', 'progress.json');
    expect(res.decision).toBe('deny');
    expect(res.reason_code).toBe('PROTECTED_ARTIFACT_MUTATION_DENIED');
  });

  test('authorizeMutation denies direct agent-host write to engine-policy', () => {
    const res = authorizeMutation('write', 'agent-host', 'gate-policy.yaml');
    expect(res.decision).toBe('deny');
    expect(res.reason_code).toBe('PROTECTED_ARTIFACT_MUTATION_DENIED');
  });

  test('authorizeMutation allows valid scratch path write', () => {
    const res = authorizeMutation('write', 'agent-host', '.design-everything/scratch/sess1/S0/draft.txt');
    expect(res.decision).toBe('allow');
    expect(res.reason_code).toBe('INTERVIEW_SCRATCH_ALLOWED');
  });

  test('authorizeMutation denies invalid scratch path write', () => {
    const res = authorizeMutation('write', 'agent-host', '.design-everything/scratch/invalid-path.txt');
    expect(res.decision).toBe('deny');
    expect(res.reason_code).toBe('INVALID_SCRATCH_PATH');
  });

  test('authorizeMutation allows core-transaction with valid InternalMutationCapability', () => {
    const cap: InternalMutationCapability = {
      capability_id: 'cap-123',
      operation: 'commit_step',
      target_paths: ['progress.json', '.design-everything/interview-state.json'],
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60000).toISOString(),
    };

    const res = authorizeMutation('write', 'core-transaction', 'progress.json', cap);
    expect(res.decision).toBe('allow');
    expect(res.reason_code).toBe('INTERNAL_CAPABILITY_AUTHORIZED');
  });

  test('authorizeMutation denies core-transaction when capability target mismatches', () => {
    const cap: InternalMutationCapability = {
      capability_id: 'cap-123',
      operation: 'commit_step',
      target_paths: ['progress.json'],
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60000).toISOString(),
    };

    const res = authorizeMutation('write', 'core-transaction', 'gate-policy.yaml', cap);
    expect(res.decision).toBe('deny');
    expect(res.reason_code).toBe('CAPABILITY_TARGET_MISMATCH');
  });
});
