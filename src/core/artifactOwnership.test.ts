import { test, expect, describe } from 'vitest';
import {
  classifyArtifact,
  authorizeMutation,
  InternalMutationCapability,
  preActionRequestSchema,
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

  test('classifyArtifact does not false-deny legitimate user paths that merely contain "schemas/" or "shapes/"', () => {
    // Regression for a false-deny bug: a bare substring check on
    // shapes//schemas/ would classify ordinary user source files as
    // engine-policy (deny-by-default) even though the installed layout
    // never places a shapes/ or schemas/ directory in a target project.
    expect(classifyArtifact('src/schemas/user.ts')).toBe('user-owned');
    expect(classifyArtifact('src/shapes/circle.ts')).toBe('user-owned');
    expect(classifyArtifact('app/schemas/order.schema.json')).toBe('user-owned');
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

  test('authorizeMutation denies an expired capability even with a matching target_paths entry', () => {
    // Before this fix, `expires_at` was parsed into the schema but never
    // actually read by authorizeMutation — an expired capability authorized
    // exactly like a fresh one as long as target_paths matched.
    const cap: InternalMutationCapability = {
      capability_id: 'cap-expired',
      operation: 'commit_step',
      target_paths: ['progress.json'],
      issued_at: new Date(Date.now() - 120000).toISOString(),
      expires_at: new Date(Date.now() - 60000).toISOString(),
    };

    const res = authorizeMutation('write', 'core-transaction', 'progress.json', cap);
    expect(res.decision).toBe('deny');
    expect(res.reason_code).toBe('CAPABILITY_EXPIRED');
  });

  test('authorizeMutation denies a capability that expires at exactly the current instant (boundary, not strictly in the future)', () => {
    const now = new Date().toISOString();
    const cap: InternalMutationCapability = {
      capability_id: 'cap-boundary',
      operation: 'commit_step',
      target_paths: ['progress.json'],
      issued_at: now,
      expires_at: now,
    };

    const res = authorizeMutation('write', 'core-transaction', 'progress.json', cap);
    expect(res.decision).toBe('deny');
    expect(res.reason_code).toBe('CAPABILITY_EXPIRED');
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

  describe('P4.2 — exact-path authority (no endsWith/includes substring matching)', () => {
    test('classifyArtifact does not classify a lookalike path outside the catalog as managed-output via endsWith', () => {
      const catalog = ['docs/01-vision.md'];
      // Shares a suffix with the catalog entry but lives in a different
      // directory entirely — must not be treated as the managed artifact.
      expect(classifyArtifact('other/docs/01-vision.md', catalog)).toBe('user-owned');
    });

    test('classifyArtifact does not classify a lookalike path as managed-output via includes', () => {
      const catalog = ['docs/01-vision.md'];
      expect(classifyArtifact('notes/docs/01-vision.md-backup/x.txt', catalog)).toBe('user-owned');
    });

    test('authorizeMutation denies a core-transaction capability whose target merely ends with an allowed path', () => {
      const cap: InternalMutationCapability = {
        capability_id: 'cap-456',
        operation: 'commit_step',
        target_paths: ['.design-everything/interview-state.json'],
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60000).toISOString(),
      };

      // 'evil/.design-everything/interview-state.json' ends with the
      // capability's allowed path but is a different file entirely.
      const res = authorizeMutation(
        'write',
        'core-transaction',
        'evil/.design-everything/interview-state.json',
        cap
      );
      expect(res.decision).toBe('deny');
      expect(res.reason_code).toBe('CAPABILITY_TARGET_MISMATCH');
    });
  });

  describe('P6 10.3 — pattern-declared catalog artifacts (path_pattern)', () => {
    test('classifyArtifact classifies a path matching a catalog path_pattern as managed-output', () => {
      const catalog = [{ id: 'adr', path_pattern: 'docs/design/adr/ADR-{seq}.md', tier: 1 as const }];
      expect(classifyArtifact('docs/design/adr/ADR-1.md', catalog)).toBe('managed-output');
      expect(classifyArtifact('docs/design/adr/ADR-42.md', catalog)).toBe('managed-output');
    });

    test('classifyArtifact does not match a path outside the declared pattern', () => {
      const catalog = [{ path_pattern: 'docs/design/adr/ADR-{seq}.md' }];
      expect(classifyArtifact('docs/design/adr/nested/ADR-1.md', catalog)).toBe('user-owned');
      expect(classifyArtifact('docs/design/other/ADR-1.md', catalog)).toBe('user-owned');
    });

    test('classifyArtifact still accepts a plain string array for exact paths (backward compatible)', () => {
      const catalog = ['docs/01-vision.md'];
      expect(classifyArtifact('docs/01-vision.md', catalog)).toBe('managed-output');
    });

    test('classifyArtifact accepts a mix of exact-path and pattern catalog entries', () => {
      const catalog = [{ path: 'docs/01-vision.md' }, { path_pattern: 'docs/design/adr/ADR-{seq}.md' }];
      expect(classifyArtifact('docs/01-vision.md', catalog)).toBe('managed-output');
      expect(classifyArtifact('docs/design/adr/ADR-7.md', catalog)).toBe('managed-output');
      expect(classifyArtifact('docs/02-scope.md', catalog)).toBe('user-owned');
    });

    test('authorizeMutation denies a direct agent-host write to a pattern-matched managed artifact', () => {
      const catalog = [{ path_pattern: 'docs/design/adr/ADR-{seq}.md' }];
      const res = authorizeMutation('write', 'agent-host', 'docs/design/adr/ADR-1.md', undefined, catalog);
      expect(res.decision).toBe('deny');
      expect(res.reason_code).toBe('PROTECTED_ARTIFACT_MUTATION_DENIED');
    });
  });

  // P8.5 — action_kind widened to include 'delete'/'rename' as a typed-gap
  // closure only. No production caller constructs a request with these
  // yet: no native Claude Code tool surfaces delete/rename distinct from
  // Write/Edit/Bash today, and extracting rm/mv shell argv into per-target
  // authorizeMutation calls is deliberately NOT done here — today,
  // classifyCommand fail-closes every rm/mv invocation outright (falls
  // into UNPROVEN_EXECUTABLE), including a delete of the user's own file.
  // Wiring action_kind:'delete' for shell commands would, if done here,
  // *loosen* that default (let a user-owned-path rm through
  // authorizeMutation's always-allow branch) — a security-relevant
  // behavior change the plan's P8 checklist never asked for, so it's left
  // as an explicit, separately-scoped follow-up.
  describe('P8.5 — action-aware authorizeMutation (delete/rename)', () => {
    test('authorizeMutation("delete", ...) denies a protected engine-state path from agent-host, same as write already did', () => {
      const writeRes = authorizeMutation('write', 'agent-host', 'progress.json');
      const deleteRes = authorizeMutation('delete', 'agent-host', 'progress.json');
      expect(deleteRes.decision).toBe(writeRes.decision);
      expect(deleteRes.reason_code).toBe(writeRes.reason_code);
      expect(deleteRes.reason_code).toBe('PROTECTED_ARTIFACT_MUTATION_DENIED');
      expect(deleteRes.user_message).toContain('delete');
    });

    test('authorizeMutation("rename", ...) denies a protected engine-policy path from agent-host, same as write already did', () => {
      const res = authorizeMutation('rename', 'agent-host', 'gate-policy.yaml');
      expect(res.decision).toBe('deny');
      expect(res.reason_code).toBe('PROTECTED_ARTIFACT_MUTATION_DENIED');
      expect(res.user_message).toContain('rename');
    });

    test('authorizeMutation("delete", ...) still allows a user-owned path, message reflects the real action', () => {
      const res = authorizeMutation('delete', 'agent-host', 'src/index.ts');
      expect(res.decision).toBe('allow');
      expect(res.reason_code).toBe('USER_OWNED_ALLOWED');
      expect(res.user_message).toContain('delete');
    });

    test('a PreActionRequest with action_kind "delete"/"rename" validates against the schema', () => {
      const base = {
        runtime: 'claude' as const,
        tool_name: 'Bash',
        target_paths: ['src/index.ts'],
        command_argv: [],
        workspace: '/tmp/ws',
        session_id: 'test-session',
      };
      for (const kind of ['delete', 'rename'] as const) {
        const parsed = preActionRequestSchema.safeParse({ ...base, action_kind: kind });
        expect(parsed.success).toBe(true);
      }
    });
  });
});
