import { test, expect, describe, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { loadQuestionSlots, SlotProvenanceRecord, loadScript, type Script } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');
const script: Script = loadScript(join(projectRoot, 'Design/Content/interview-script/script.yaml'));

describe('B3a — Answer and slot validation engine contract (loadQuestionSlots)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `de-test-b3a-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
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

  test('loads valid slot provenance record from scratch path', () => {
    const scratchDir = join(tempDir, '.design-everything/scratch/sess1/S0');
    mkdirSync(scratchDir, { recursive: true });

    const slotPayload: SlotProvenanceRecord = {
      value: 'SuperApp',
      provenance: 'interview:S0',
      updated_at: new Date().toISOString(),
    };

    writeFileSync(join(scratchDir, 'slots.json'), JSON.stringify(slotPayload, null, 2));

    const res = loadQuestionSlots(tempDir, script, 'sess1', 'S0', 'slots.json');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.slots.value).toBe('SuperApp');
      expect(res.slots.provenance).toBe('interview:S0');
    }
  });

  test('rejects slots when file is missing', () => {
    const res = loadQuestionSlots(tempDir, script, 'sess1', 'S0', 'non-existent.json');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason_code).toBe('SLOT_FILE_NOT_FOUND');
    }
  });

  test('rejects slots when schema is invalid', () => {
    const scratchDir = join(tempDir, '.design-everything/scratch/sess1/S0');
    mkdirSync(scratchDir, { recursive: true });

    writeFileSync(join(scratchDir, 'invalid-slots.json'), JSON.stringify({ invalid: 'schema' }));

    const res = loadQuestionSlots(tempDir, script, 'sess1', 'S0', 'invalid-slots.json');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason_code).toBe('INVALID_SLOT_SCHEMA');
    }
  });

  test('P6 10.1 — rejects a questionId not declared in script.yaml', () => {
    const scratchDir = join(tempDir, '.design-everything/scratch/sess1/NOT-A-REAL-QUESTION');
    mkdirSync(scratchDir, { recursive: true });
    writeFileSync(
      join(scratchDir, 'slots.json'),
      JSON.stringify({ value: 'x', provenance: 'p', updated_at: new Date().toISOString() })
    );

    const res = loadQuestionSlots(tempDir, script, 'sess1', 'NOT-A-REAL-QUESTION', 'slots.json');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason_code).toBe('QUESTION_NOT_IN_ALLOWLIST');
    }
  });

  test('P6 10.1 — rejects a questionId that reaches into a sibling question directory via ".."', () => {
    // Even though the final resolved path stays inside the workspace (so
    // canonicalizeWorkspacePath's containment check alone would pass it),
    // this must still be denied: it escapes the caller's own
    // session/questionId scratch sandbox, not just the workspace root.
    const scratchDir = join(tempDir, '.design-everything/scratch/sess1/S1');
    mkdirSync(scratchDir, { recursive: true });
    writeFileSync(
      join(scratchDir, 'slots.json'),
      JSON.stringify({ value: 'x', provenance: 'p', updated_at: new Date().toISOString() })
    );

    const res = loadQuestionSlots(tempDir, script, 'sess1', '../S1', 'slots.json');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason_code).toBe('SLOT_PATH_SEGMENT_INVALID');
    }
  });

  test('P6 10.1 — rejects a fileName containing a path separator', () => {
    const res = loadQuestionSlots(tempDir, script, 'sess1', 'S0', '../../secret.json');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason_code).toBe('SLOT_PATH_SEGMENT_INVALID');
    }
  });

  test('P6 10.1 — rejects an unsupported producer_version', () => {
    const scratchDir = join(tempDir, '.design-everything/scratch/sess1/S0');
    mkdirSync(scratchDir, { recursive: true });
    writeFileSync(
      join(scratchDir, 'slots.json'),
      JSON.stringify({
        value: 'x',
        provenance: 'p',
        updated_at: new Date().toISOString(),
        producer_version: '99.0.0',
      })
    );

    const res = loadQuestionSlots(tempDir, script, 'sess1', 'S0', 'slots.json');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason_code).toBe('SLOT_PRODUCER_VERSION_UNSUPPORTED');
    }
  });

  test('P6 10.1 — accepts a known producer_version', () => {
    const scratchDir = join(tempDir, '.design-everything/scratch/sess1/S0');
    mkdirSync(scratchDir, { recursive: true });
    writeFileSync(
      join(scratchDir, 'slots.json'),
      JSON.stringify({
        value: 'x',
        provenance: 'p',
        updated_at: new Date().toISOString(),
        producer_version: '1.0.0',
      })
    );

    const res = loadQuestionSlots(tempDir, script, 'sess1', 'S0', 'slots.json');
    expect(res.ok).toBe(true);
  });
});
