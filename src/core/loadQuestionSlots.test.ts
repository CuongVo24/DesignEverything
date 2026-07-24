import { test, expect, describe, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadQuestionSlots, SlotProvenanceRecord } from './index.js';

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

    const res = loadQuestionSlots(tempDir, 'sess1', 'S0', 'slots.json');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.slots.value).toBe('SuperApp');
      expect(res.slots.provenance).toBe('interview:S0');
    }
  });

  test('rejects slots when file is missing', () => {
    const res = loadQuestionSlots(tempDir, 'sess1', 'S0', 'non-existent.json');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason_code).toBe('SLOT_FILE_NOT_FOUND');
    }
  });

  test('rejects slots when schema is invalid', () => {
    const scratchDir = join(tempDir, '.design-everything/scratch/sess1/S0');
    mkdirSync(scratchDir, { recursive: true });

    writeFileSync(join(scratchDir, 'invalid-slots.json'), JSON.stringify({ invalid: 'schema' }));

    const res = loadQuestionSlots(tempDir, 'sess1', 'S0', 'invalid-slots.json');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason_code).toBe('INVALID_SLOT_SCHEMA');
    }
  });
});
