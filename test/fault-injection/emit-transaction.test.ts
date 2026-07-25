import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import {
  prepareEmit,
  activateEmit,
  recoverEmit,
  manifestPath,
} from '../../src/core/emitTransaction.js';
import { loadArtifactCatalog } from '../../src/core/loadArtifactCatalog.js';
import { compileRuntimeCatalog, type RuntimeCatalog } from '../../src/core/compileRuntimeCatalog.js';
import { loadScript } from '../../src/core/loadScript.js';
import { loadShapes } from '../../src/core/loadShapes.js';
import { injectFsFault, restoreFsFaults } from '../helpers/faulty-filesystem.js';

const REPO_ROOT = join(__dirname, '../..');
const CRASH_WORKER = join(REPO_ROOT, 'test/helpers/crash-worker.mjs');

function loadTestCatalog(): RuntimeCatalog {
  const catalog = loadArtifactCatalog(join(REPO_ROOT, 'Design/Content/artifact-catalog.yaml'));
  const script = loadScript(join(REPO_ROOT, 'Design/Content/interview-script/script.yaml'));
  const shapes = loadShapes(join(REPO_ROOT, 'Design/Content/interview-script/shapes.yaml'));
  return compileRuntimeCatalog({ catalog, script, shapes });
}

describe('B5b — Emit Transaction Fault Injection Suite', () => {
  let tmpDir: string;
  let catalog: RuntimeCatalog;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `de-emit-fault-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    catalog = loadTestCatalog();

    // Initial valid emit (Generation 1)
    const initialDocs = [
      { file: 'docs/00-vision.md', content: '# Vision v1\nInitial content' },
    ];
    const staged = prepareEmit(tmpDir, { docs: initialDocs, shape: 'web', inputDigest: 'a'.repeat(64) }, catalog);
    activateEmit(tmpDir, staged, null, 'tier1');
  });

  afterEach(() => {
    restoreFsFaults();
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('FE-01 — should recover cleanly after process crash at backing-up step', () => {
    try {
      execSync(`node "${CRASH_WORKER}" --workspace="${tmpDir}" --action=emit --crash-at=backing-up`, {
        stdio: 'pipe',
      });
    } catch (err: unknown) {
      expect((err as { status?: number }).status).toBe(137);
    }

    // Recover transaction
    const res1 = recoverEmit(tmpDir, 'tier1');
    expect(res1).toBe('rolled-back');

    // Gen 1 content remains intact
    const visionContent = readFileSync(join(tmpDir, 'docs/00-vision.md'), 'utf8');
    expect(visionContent).toContain('Initial content');

    // Dual recovery check (idempotency)
    const res2 = recoverEmit(tmpDir, 'tier1');
    expect(res2).toBe('no-op');
  });

  it('FE-02 — should recover cleanly after process crash at promoting step', () => {
    try {
      execSync(`node "${CRASH_WORKER}" --workspace="${tmpDir}" --action=emit --crash-at=promoting`, {
        stdio: 'pipe',
      });
    } catch (err: unknown) {
      expect((err as { status?: number }).status).toBe(137);
    }

    // Recover transaction
    const res1 = recoverEmit(tmpDir, 'tier1');
    expect(res1).toBe('rolled-back');

    // Gen 1 content remains intact
    const visionContent = readFileSync(join(tmpDir, 'docs/00-vision.md'), 'utf8');
    expect(visionContent).toContain('Initial content');

    // Dual recovery check (idempotency)
    const res2 = recoverEmit(tmpDir, 'tier1');
    expect(res2).toBe('no-op');
  });

  it('FE-03 — should recover cleanly after process crash at writing-manifest step', () => {
    try {
      execSync(`node "${CRASH_WORKER}" --workspace="${tmpDir}" --action=emit --crash-at=writing-manifest`, {
        stdio: 'pipe',
      });
    } catch (err: unknown) {
      expect((err as { status?: number }).status).toBe(137);
    }

    // Recover transaction
    const res1 = recoverEmit(tmpDir, 'tier1');
    expect(res1).toBe('rolled-back');

    // Dual recovery check (idempotency)
    const res2 = recoverEmit(tmpDir, 'tier1');
    expect(res2).toBe('no-op');
  });

  it('FE-04 — should block user-file-collision and preserve pre-existing file byte content 100%', () => {
    // Pre-create an unmanaged user file at docs/user-custom.md
    const userFilePath = join(tmpDir, 'docs/user-custom.md');
    const userOriginalContent = '# Custom User File\nDO NOT OVERWRITE THIS CONTENT!';
    writeFileSync(userFilePath, userOriginalContent, 'utf8');
    const originalBytes = Buffer.byteLength(userOriginalContent);

    // Prepare generation containing docs/00-vision.md as managed
    const conflictingDocs = [
      { file: 'docs/00-vision.md', content: '# Overwritten Content' },
    ];
    const staged = prepareEmit(tmpDir, { docs: conflictingDocs, shape: 'web', inputDigest: 'b'.repeat(64) }, catalog);

    // Manually create a user file collision on docs/00-vision.md by deleting manifest
    rmSync(manifestPath(tmpDir, 'tier1'));

    // Attempt activation with null expectedRevision: docs/00-vision.md exists as user-owned collision!
    const res = activateEmit(tmpDir, staged, null, 'tier1');
    expect(res.status).toBe('blocked');
    if (res.status === 'blocked') {
      expect(res.reason).toBe('user-file-collision');
      expect(res.details).toContain('docs/00-vision.md');
    }

    // User file remains 100% intact with exact byte length
    const currentContent = readFileSync(userFilePath, 'utf8');
    expect(currentContent).toBe(userOriginalContent);
    expect(Buffer.byteLength(currentContent)).toBe(originalBytes);
  });

  it('FE-05 — should block parallel/stale revision activation (1 winner, 1 loser)', () => {
    const activeGenId = JSON.parse(readFileSync(manifestPath(tmpDir, 'tier1'), 'utf8')).generation_id;

    const docsA = [{ file: 'docs/00-vision.md', content: '# Vision Gen A' }];
    const stagedA = prepareEmit(tmpDir, { docs: docsA, shape: 'web', inputDigest: 'a'.repeat(64) }, catalog);

    const docsB = [{ file: 'docs/00-vision.md', content: '# Vision Gen B' }];
    const stagedB = prepareEmit(tmpDir, { docs: docsB, shape: 'web', inputDigest: 'b'.repeat(64) }, catalog);

    // Winner A activates with valid expectedRevision
    const resA = activateEmit(tmpDir, stagedA, activeGenId, 'tier1');
    expect(resA.status).toBe('activated');

    // Loser B attempts activation with old expectedRevision
    const resB = activateEmit(tmpDir, stagedB, activeGenId, 'tier1');
    expect(resB.status).toBe('blocked');
    if (resB.status === 'blocked') {
      expect(resB.reason).toBe('revision-mismatch');
    }

    // Active vision content belongs to Winner A
    const currentVision = readFileSync(join(tmpDir, 'docs/00-vision.md'), 'utf8');
    expect(currentVision).toBe('# Vision Gen A');
  });

  it('FE-06 — should fail-safe on ENOSPC disk full during backup phase', () => {
    const activeGenId = JSON.parse(readFileSync(manifestPath(tmpDir, 'tier1'), 'utf8')).generation_id;
    const newDocs = [{ file: 'docs/00-vision.md', content: '# Vision New' }];
    const staged = prepareEmit(tmpDir, { docs: newDocs, shape: 'web', inputDigest: 'c'.repeat(64) }, catalog);

    injectFsFault({
      targetMethod: 'copyFileSync',
      pathSubstring: 'backups',
      errorCode: 'ENOSPC',
    });

    expect(() => {
      activateEmit(tmpDir, staged, activeGenId, 'tier1');
    }).toThrow('ENOSPC');

    // Restore fs and recover
    restoreFsFaults();
    const recoverRes = recoverEmit(tmpDir, 'tier1');
    expect(recoverRes).toBe('rolled-back');

    // Initial vision content preserved
    const currentVision = readFileSync(join(tmpDir, 'docs/00-vision.md'), 'utf8');
    expect(currentVision).toContain('Initial content');
  });
});
