import { test, expect, describe } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createHash } from 'crypto';
import { buildGateSnapshot } from './gateSnapshot.js';
import { manifestPath } from './emitTransactionActivate.js';
import type { EmitManifest } from './schemas/index.js';
import type { EvidenceRecord } from './schemas/index.js';

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

describe('P5.1 — buildGateSnapshot must be fail-closed for missing artifacts', () => {
  test('a doc path that does not exist on disk is reported as exists=false, not exists=true', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-gate-snapshot-'));
    try {
      const snapshot = buildGateSnapshot(workspace, ['docs/does-not-exist.md']);
      const artifact = snapshot.artifacts['docs/does-not-exist.md'];
      expect(artifact.exists).toBe(false);
      expect(artifact.nonEmpty).toBe(false);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('a doc path that exists and is non-empty is reported correctly', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-gate-snapshot-'));
    try {
      mkdirSync(join(workspace, 'docs'), { recursive: true });
      writeFileSync(join(workspace, 'docs', 'vision.md'), '# Vision');

      const snapshot = buildGateSnapshot(workspace, ['docs/vision.md']);
      const artifact = snapshot.artifacts['docs/vision.md'];
      expect(artifact.exists).toBe(true);
      expect(artifact.nonEmpty).toBe(true);
      expect(artifact.sha256).toHaveLength(64);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('an empty file on disk is reported as exists=true but nonEmpty=false', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-gate-snapshot-'));
    try {
      mkdirSync(join(workspace, 'docs'), { recursive: true });
      writeFileSync(join(workspace, 'docs', 'empty.md'), '');

      const snapshot = buildGateSnapshot(workspace, ['docs/empty.md']);
      const artifact = snapshot.artifacts['docs/empty.md'];
      expect(artifact.exists).toBe(true);
      expect(artifact.nonEmpty).toBe(false);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('a directory at the given path is not treated as an existing file', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-gate-snapshot-'));
    try {
      mkdirSync(join(workspace, 'docs', 'not-a-file.md'), { recursive: true });

      const snapshot = buildGateSnapshot(workspace, ['docs/not-a-file.md']);
      const artifact = snapshot.artifacts['docs/not-a-file.md'];
      expect(artifact.exists).toBe(false);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

describe('DEBT3.1 — gate snapshot binds the active emit manifest, evidence and validation digest', () => {
  test('no manifest on disk -> present:false, no mismatches (unchanged behavior)', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-gate-snapshot-manifest-'));
    try {
      const snapshot = buildGateSnapshot(workspace, []);
      expect(snapshot.manifest.present).toBe(false);
      expect(snapshot.manifest.activated).toBe(false);
      expect(snapshot.manifest.digestMismatches).toEqual([]);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('a doc whose bytes no longer match the active manifest digest is reported in digestMismatches', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-gate-snapshot-manifest-'));
    try {
      mkdirSync(join(workspace, 'docs'), { recursive: true });
      writeFileSync(join(workspace, 'docs/00-vision.md'), '# real vision content', 'utf8');

      mkdirSync(join(workspace, '.design-everything'), { recursive: true });
      const manifest = baseManifest({
        artifacts: [
          { id: 'vision', path: 'docs/00-vision.md', digest: 'f'.repeat(64), ownership: 'managed', kind: 'doc' },
        ],
      });
      writeFileSync(manifestPath(workspace, 'tier1'), JSON.stringify(manifest, null, 2), 'utf8');

      const snapshot = buildGateSnapshot(workspace, ['docs/00-vision.md']);
      expect(snapshot.manifest.present).toBe(true);
      expect(snapshot.manifest.digestMismatches).toContain('docs/00-vision.md');
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('a doc whose bytes match the active manifest digest is not reported as mismatched', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-gate-snapshot-manifest-'));
    try {
      const content = '# real vision content, byte for byte';
      mkdirSync(join(workspace, 'docs'), { recursive: true });
      writeFileSync(join(workspace, 'docs/00-vision.md'), content, 'utf8');

      mkdirSync(join(workspace, '.design-everything'), { recursive: true });
      const realDigest = createHash('sha256').update(content).digest('hex');
      const manifest = baseManifest({
        artifacts: [
          { id: 'vision', path: 'docs/00-vision.md', digest: realDigest, ownership: 'managed', kind: 'doc' },
        ],
      });
      writeFileSync(manifestPath(workspace, 'tier1'), JSON.stringify(manifest, null, 2), 'utf8');

      const snapshot = buildGateSnapshot(workspace, ['docs/00-vision.md']);
      expect(snapshot.manifest.digestMismatches).toEqual([]);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('snapshotDigest changes when the active manifest generation changes, all else equal', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-gate-snapshot-manifest-'));
    try {
      const genA = buildGateSnapshot(workspace, [], false, [], { manifest: baseManifest({ generation_id: 'gen-a' }) });
      const genB = buildGateSnapshot(workspace, [], false, [], { manifest: baseManifest({ generation_id: 'gen-b' }) });
      expect(genA.snapshotDigest).not.toBe(genB.snapshotDigest);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test('evidenceByTask only includes tasks with a passing (exit_code 0) evidence record', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'de-gate-snapshot-evidence-'));
    try {
      const snapshot = buildGateSnapshot(workspace, [], false, [], {
        evidence: [
          evidenceRecord({ task_id: 'T1', exit_code: 0 }),
          evidenceRecord({ task_id: 'T2', command_id: 'cmd-2', exit_code: 1 }),
        ],
      });
      expect(snapshot.evidenceByTask['T1']).toBe(true);
      expect(snapshot.evidenceByTask['T2']).toBeUndefined();
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
