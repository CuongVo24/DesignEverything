import { expect, test, describe } from 'vitest';
import { evaluateGate, isBlocked, passedGates } from './evaluateGate.js';
import { loadGatePolicy } from './loadGatePolicy.js';
import { buildGateSnapshot } from './gateSnapshot.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';

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
