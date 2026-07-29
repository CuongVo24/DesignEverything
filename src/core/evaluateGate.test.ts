import { expect, test, describe } from 'vitest';
import { evaluateGate, isBlocked, passedGates } from './evaluateGate.js';
import { loadGatePolicy } from './loadGatePolicy.js';
import { buildGateSnapshot } from './gateSnapshot.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import type { EmitManifest, EvidenceRecord, Gate } from './schemas/index.js';

function baseManifest(overrides: Partial<EmitManifest> = {}): EmitManifest {
  return {
    version: '1.0.0',
    generation_id: 'gen-1',
    shape: 'cli',
    catalog_version: '1.0.0',
    catalog_digest: 'a'.repeat(64),
    input_digest: 'b'.repeat(64),
    artifacts: [],
    created_at: new Date().toISOString(),
    activated_at: new Date().toISOString(),
    ...overrides,
  };
}

function evidenceRecord(overrides: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return {
    task_id: 'T1',
    command_id: 'cmd-1',
    argv: ['npm', 'test'],
    exit_code: 0,
    stdout_sha256: 'c'.repeat(64),
    stderr_sha256: 'd'.repeat(64),
    artifact_digests: {},
    captured_at: new Date().toISOString(),
    source: 'runner',
    ...overrides,
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const policyPath = join(__dirname, '../../Design/Content/interview-script/gate-policy.yaml');
const policy = loadGatePolicy(policyPath);
const scopeLockedGate = policy.gates[0];

/**
 * evaluateGate now requires artifacts to actually exist on disk (P5.1
 * fail-closed fix) — a bare list of doc filenames is no longer treated as
 * "these all exist". Tests build a real temp workspace and pass a
 * pre-computed GateSnapshot instead of relying on that removed fail-open
 * shortcut.
 */
function snapshotFor(workspace: string, presentDocs: string[]) {
  mkdirSync(workspace, { recursive: true });
  for (const doc of presentDocs) {
    writeFileSync(join(workspace, doc), `# ${doc}`);
  }
  return buildGateSnapshot(workspace, scopeLockedGate.requires_docs);
}

describe('evaluateGate engine', () => {
  test('evaluateGate should return correct open status and missing docs', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-evaluate-gate-'));
    try {
      // Missing all 3 docs
      let result = evaluateGate(scopeLockedGate, snapshotFor(workspace, []));
      expect(result.open).toBe(false);
      expect(result.missing).toEqual(['00-vision.md', '01-personas.md', '02-scope.md']);

      // Missing 2 docs
      result = evaluateGate(scopeLockedGate, snapshotFor(workspace, ['00-vision.md']));
      expect(result.open).toBe(false);
      expect(result.missing).toEqual(['01-personas.md', '02-scope.md']);

      // All 3 docs present
      result = evaluateGate(
        scopeLockedGate,
        snapshotFor(workspace, ['00-vision.md', '01-personas.md', '02-scope.md'])
      );
      expect(result.open).toBe(true);
      expect(result.missing.length).toBe(0);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('isBlocked should correctly check tool blocking rules', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-evaluate-gate-'));
    try {
      // Closed gate blocks Write, Edit, Bash
      const closedSnapshot = snapshotFor(workspace, ['00-vision.md']);
      expect(isBlocked(scopeLockedGate, 'Write', closedSnapshot)).toBe(true);
      expect(isBlocked(scopeLockedGate, 'Edit', closedSnapshot)).toBe(true);
      expect(isBlocked(scopeLockedGate, 'Bash', closedSnapshot)).toBe(true);

      // Open gate does not block any tools
      const openSnapshot = snapshotFor(workspace, ['00-vision.md', '01-personas.md', '02-scope.md']);
      expect(isBlocked(scopeLockedGate, 'Write', openSnapshot)).toBe(false);
      expect(isBlocked(scopeLockedGate, 'Edit', openSnapshot)).toBe(false);
      expect(isBlocked(scopeLockedGate, 'Bash', openSnapshot)).toBe(false);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('passedGates should return list of open gates only', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-evaluate-gate-'));
    try {
      // Empty when gate is closed
      expect(passedGates(policy, snapshotFor(workspace, ['00-vision.md']))).toEqual([]);

      // Contains gate ID when open
      expect(
        passedGates(policy, snapshotFor(workspace, ['00-vision.md', '01-personas.md', '02-scope.md']))
      ).toEqual(['scope-locked']);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('buildGateSnapshot builds snapshot and computes input_digest', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-evaluate-gate-'));
    try {
      const gate = policy.gates[0];
      const res = evaluateGate(
        gate,
        snapshotFor(workspace, ['00-vision.md', '01-personas.md', '02-scope.md'])
      );
      expect(res.input_digest).toBeDefined();
      expect(typeof res.input_digest).toBe('string');
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('a required doc is only satisfied by its exact canonical path, not a same-basename file elsewhere (confused-deputy)', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-evaluate-gate-'));
    try {
      // A file with the same basename as a required doc, but living in an
      // unrelated directory, must not satisfy the gate requirement.
      mkdirSync(join(workspace, 'unrelated-dir'), { recursive: true });
      writeFileSync(join(workspace, 'unrelated-dir', '00-vision.md'), '# not the real one');
      writeFileSync(join(workspace, '01-personas.md'), '# real');
      writeFileSync(join(workspace, '02-scope.md'), '# real');

      const snapshot = buildGateSnapshot(workspace, [
        'unrelated-dir/00-vision.md',
        '01-personas.md',
        '02-scope.md',
      ]);
      const result = evaluateGate(scopeLockedGate, snapshot);
      expect(result.open).toBe(false);
      expect(result.missing).toContain('00-vision.md');
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('a bare requires_docs filename matches the one well-known docs/ location, but not other lookalike directories', () => {
    // gate-policy.yaml declares requires_docs as bare filenames, but the
    // engine always emits them flatly under docs/ (see evaluatePreAction's
    // docsDir). A bare requirement must resolve against that single fixed
    // location — this is not a basename-anywhere fallback.
    const workspace = mkdtempSync(join(tmpdir(), 'de-evaluate-gate-'));
    try {
      mkdirSync(join(workspace, 'docs'), { recursive: true });
      writeFileSync(join(workspace, 'docs', '00-vision.md'), '# real vision');
      writeFileSync(join(workspace, 'docs', '01-personas.md'), '# real personas');
      writeFileSync(join(workspace, 'docs', '02-scope.md'), '# real scope');

      const docPaths = [
        join(workspace, 'docs', '00-vision.md'),
        join(workspace, 'docs', '01-personas.md'),
        join(workspace, 'docs', '02-scope.md'),
      ];
      const snapshot = buildGateSnapshot(workspace, docPaths);
      const result = evaluateGate(scopeLockedGate, snapshot);
      expect(result.open).toBe(true);
      expect(result.missing.length).toBe(0);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('a bare requires_docs filename does not match a lookalike file under an unrelated non-docs directory', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-evaluate-gate-'));
    try {
      mkdirSync(join(workspace, 'some-other-dir'), { recursive: true });
      writeFileSync(join(workspace, 'some-other-dir', '00-vision.md'), '# impostor');

      const snapshot = buildGateSnapshot(workspace, [join(workspace, 'some-other-dir', '00-vision.md')]);
      const result = evaluateGate(scopeLockedGate, snapshot);
      expect(result.open).toBe(false);
      expect(result.missing).toContain('00-vision.md');
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('a required doc that does not actually exist on disk keeps the gate closed even if listed', () => {
    // Regression for the fail-open buildGateSnapshot bug: listing a path
    // that has no file on disk must never count as "present".
    const workspace = mkdtempSync(join(tmpdir(), 'de-evaluate-gate-'));
    try {
      const snapshot = buildGateSnapshot(workspace, scopeLockedGate.requires_docs);
      const result = evaluateGate(scopeLockedGate, snapshot);
      expect(result.open).toBe(false);
      expect(result.missing).toEqual(['00-vision.md', '01-personas.md', '02-scope.md']);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

describe('DEBT3.1 — requires_docs/requires_validation/requires_evidence bound to real manifest/evidence', () => {
  test('a required doc present on disk but tampered relative to the active manifest keeps the gate closed with a tampered: marker', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-evaluate-gate-tamper-'));
    try {
      mkdirSync(join(workspace, 'docs'), { recursive: true });
      writeFileSync(join(workspace, 'docs/00-vision.md'), '# tampered after activation');
      writeFileSync(join(workspace, '01-personas.md'), '# real');
      writeFileSync(join(workspace, '02-scope.md'), '# real');

      const manifest = baseManifest({
        artifacts: [
          { id: 'vision', path: 'docs/00-vision.md', digest: 'f'.repeat(64), ownership: 'managed', kind: 'doc' },
        ],
      });
      const snapshot = buildGateSnapshot(
        workspace,
        ['docs/00-vision.md', '01-personas.md', '02-scope.md'],
        false,
        [],
        { manifest }
      );
      const result = evaluateGate(scopeLockedGate, snapshot);
      expect(result.open).toBe(false);
      expect(result.missing).toContain('tampered:00-vision.md');
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('requires_validation only opens with a real validationPass AND a digest-shaped validation_digest', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-evaluate-gate-validation-'));
    const validationGate: Gate = {
      id: 'plan-validated-test',
      requires_docs: [],
      blocks: ['Write'],
      message: 'needs validation',
      requires_validation: true,
    };
    try {
      // validationPass true but no real digest (e.g. a caller passing the
      // old literal 'pass' string, or leaving it empty) must not open it.
      const noDigest = buildGateSnapshot(workspace, [], true, [], { validationDigest: '' });
      expect(evaluateGate(validationGate, noDigest).open).toBe(false);

      const fakeDigest = buildGateSnapshot(workspace, [], true, [], { validationDigest: 'pass' });
      expect(evaluateGate(validationGate, fakeDigest).open).toBe(false);

      const realDigest = buildGateSnapshot(workspace, [], true, [], { validationDigest: 'e'.repeat(64) });
      expect(evaluateGate(validationGate, realDigest).open).toBe(true);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('requires_evidence only opens when the task is both in completedTasks AND has a real passing evidence record', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-evaluate-gate-evidence-'));
    const evidenceGate: Gate = {
      id: 'evidence-test',
      requires_docs: [],
      blocks: ['Write'],
      message: 'needs evidence',
      requires_evidence: ['T1'],
    };
    try {
      // Named in completedTasks but no evidence record at all — closed.
      const noEvidence = buildGateSnapshot(workspace, [], false, ['T1'], { evidence: [] });
      expect(evaluateGate(evidenceGate, noEvidence).open).toBe(false);
      expect(evaluateGate(evidenceGate, noEvidence).missing).toContain('evidence:T1');

      // Named in completedTasks with only a failing evidence record — closed.
      const failingEvidence = buildGateSnapshot(workspace, [], false, ['T1'], {
        evidence: [evidenceRecord({ task_id: 'T1', exit_code: 1 })],
      });
      expect(evaluateGate(evidenceGate, failingEvidence).open).toBe(false);

      // Named in completedTasks with a real passing evidence record — open.
      const passingEvidence = buildGateSnapshot(workspace, [], false, ['T1'], {
        evidence: [evidenceRecord({ task_id: 'T1', exit_code: 0 })],
      });
      expect(evaluateGate(evidenceGate, passingEvidence).open).toBe(true);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
