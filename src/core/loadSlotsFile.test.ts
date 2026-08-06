import { test, expect, describe, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, symlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadSlotsFile } from './loadSlotsFile.js';

describe('B3a — --slots-file confinement to Design/.interview/', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `de-test-slotsfile-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
    mkdirSync(tempDir, { recursive: true });
    return () => {
      if (existsSync(tempDir)) {
        try {
          rmSync(tempDir, { recursive: true, force: true });
        } catch {
          // Ignore
        }
      }
    };
  });

  test('loads a valid flat slots file from Design/.interview/', () => {
    const interviewDir = join(tempDir, 'Design/.interview');
    mkdirSync(interviewDir, { recursive: true });
    writeFileSync(join(interviewDir, 'slots-S1.json'), JSON.stringify({ key_a: 'value a' }));

    const result = loadSlotsFile(tempDir, 'Design/.interview/slots-S1.json');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slots).toEqual({ key_a: 'value a' });
    }
  });

  test('rejects a path outside the workspace with INVALID_SLOTS_FILE', () => {
    const result = loadSlotsFile(tempDir, '../secret-slots.json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason_code).toBe('INVALID_SLOTS_FILE');
    }
  });

  test('rejects a path inside the workspace but outside Design/.interview/ with SLOTS_FILE_OUTSIDE_SCRATCH', () => {
    mkdirSync(join(tempDir, 'docs'), { recursive: true });
    writeFileSync(join(tempDir, 'docs/slots.json'), JSON.stringify({ key_a: 'value a' }));

    const result = loadSlotsFile(tempDir, 'docs/slots.json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason_code).toBe('SLOTS_FILE_OUTSIDE_SCRATCH');
    }
  });

  test('rejects a non-.json file inside Design/.interview/ with SLOTS_FILE_WRONG_EXTENSION', () => {
    const interviewDir = join(tempDir, 'Design/.interview');
    mkdirSync(interviewDir, { recursive: true });
    writeFileSync(join(interviewDir, 'slots-S1.txt'), JSON.stringify({ key_a: 'value a' }));

    const result = loadSlotsFile(tempDir, 'Design/.interview/slots-S1.txt');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason_code).toBe('SLOTS_FILE_WRONG_EXTENSION');
    }
  });

  test('reports SLOTS_FILE_NOT_FOUND for a missing file inside Design/.interview/', () => {
    const result = loadSlotsFile(tempDir, 'Design/.interview/does-not-exist.json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason_code).toBe('SLOTS_FILE_NOT_FOUND');
    }
  });

  test('rejects a slots file whose values are not flat strings', () => {
    const interviewDir = join(tempDir, 'Design/.interview');
    mkdirSync(interviewDir, { recursive: true });
    writeFileSync(join(interviewDir, 'slots-bad.json'), JSON.stringify({ key_a: { nested: true } }));

    const result = loadSlotsFile(tempDir, 'Design/.interview/slots-bad.json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason_code).toBe('INVALID_SLOTS_FILE_SCHEMA');
    }
  });
});

// Symlink creation needs elevated privilege on Windows unless Developer Mode
// is on — probe once and skip rather than silently no-op the assertion or
// flaking CI. Mirrors the same pattern in gateSnapshot.test.ts.
function canCreateSymlinks(): boolean {
  const probeDir = join(tmpdir(), `de-slotsfile-symlink-probe-${Date.now()}`);
  mkdirSync(probeDir, { recursive: true });
  try {
    const target = join(probeDir, 'target.txt');
    writeFileSync(target, 'x');
    symlinkSync(target, join(probeDir, 'link.txt'));
    return true;
  } catch {
    return false;
  } finally {
    rmSync(probeDir, { recursive: true, force: true });
  }
}

describe.skipIf(!canCreateSymlinks())('B3a — symlink escape via Design/.interview/', () => {
  test('rejects a symlink escaping Design/.interview/ to a target outside the workspace', () => {
    const tempDir = join(tmpdir(), `de-test-slotsfile-symlink-${Date.now()}`);
    const interviewDir = join(tempDir, 'Design/.interview');
    mkdirSync(interviewDir, { recursive: true });
    const outsideTarget = join(tmpdir(), `de-slotsfile-outside-${Date.now()}.json`);
    writeFileSync(outsideTarget, JSON.stringify({ secret: 'leak' }));
    symlinkSync(outsideTarget, join(interviewDir, 'slots-link.json'));

    try {
      const result = loadSlotsFile(tempDir, 'Design/.interview/slots-link.json');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason_code).toBe('INVALID_SLOTS_FILE');
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
      rmSync(outsideTarget, { force: true });
    }
  });
});
