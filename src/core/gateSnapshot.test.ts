import { test, expect, describe } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildGateSnapshot } from './gateSnapshot.js';

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
