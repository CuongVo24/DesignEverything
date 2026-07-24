import { test, expect, describe, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadInterviewStore,
  transactInterviewStore,
  computePayloadChecksum,
  CANONICAL_STORE_REL_PATH,
} from './interviewStore.js';
import { migrateInterviewStore } from './migrateInterviewStore.js';

describe('B1b — Atomic interview persistence', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `de-test-b1b-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
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

  test('migrateInterviewStore creates a fresh envelope when no legacy files exist', () => {
    const res = migrateInterviewStore(tempDir);
    expect(res).toBe('fresh');

    const envelope = loadInterviewStore(tempDir);
    expect(envelope.schema_version).toBe('7.0.0');
    expect(envelope.state_revision).toBe(0);
    expect(envelope.payload.progress.current_step).toBe('S0');
    expect(envelope.checksum).toBe(computePayloadChecksum(envelope.payload));
  });

  test('migrateInterviewStore migrates legacy progress.json and answers.json with backup', () => {
    const legacyProgress = {
      version: '0.1.0',
      phase: 'interview',
      branch: 'web',
      current_step: 'S3',
      answered: ['S0', 'S1', 'S2'],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: 't-123',
      answered_len_at_last_turn: 3,
      updated_at: new Date().toISOString(),
      calibrate_mode: 'deep',
    };
    writeFileSync(join(tempDir, 'progress.json'), JSON.stringify(legacyProgress, null, 2));

    mkdirSync(join(tempDir, 'Design/.interview'), { recursive: true });
    const legacyAnswers = { S0: 'Vision Text', S1: 'Problem Text' };
    writeFileSync(join(tempDir, 'Design/.interview/answers.json'), JSON.stringify(legacyAnswers, null, 2));

    const res = migrateInterviewStore(tempDir);
    expect(res).toBe('migrated');

    const envelope = loadInterviewStore(tempDir);
    expect(envelope.payload.progress.branch).toBe('web');
    expect(envelope.payload.answers).toEqual(legacyAnswers);

    // Backup verified
    const backupBase = join(tempDir, '.design-everything/backups');
    expect(existsSync(backupBase)).toBe(true);
  });

  test('transactInterviewStore increments revision, computes checksum, and writes atomically', () => {
    migrateInterviewStore(tempDir);
    const initial = loadInterviewStore(tempDir);
    expect(initial.state_revision).toBe(0);

    const updated = transactInterviewStore(tempDir, 0, (env) => {
      env.payload.answers['S0'] = 'Updated Vision';
      env.payload.progress.answered.push('S0');
      return env;
    });

    expect(updated.state_revision).toBe(1);
    expect(updated.payload.answers['S0']).toBe('Updated Vision');
    expect(updated.checksum).toBe(computePayloadChecksum(updated.payload));

    const reloaded = loadInterviewStore(tempDir);
    expect(reloaded.state_revision).toBe(1);
    expect(reloaded.payload.answers['S0']).toBe('Updated Vision');
  });

  test('transactInterviewStore rejects revision conflict (CAS failure)', () => {
    migrateInterviewStore(tempDir);

    expect(() =>
      transactInterviewStore(tempDir, 999, (env) => env)
    ).toThrow(/REVISION_CONFLICT/);
  });

  test('loadInterviewStore rejects corrupt or tampered canonical files (checksum mismatch)', () => {
    migrateInterviewStore(tempDir);
    const canonicalPath = join(tempDir, CANONICAL_STORE_REL_PATH);
    const raw = JSON.parse(readFileSync(canonicalPath, 'utf8'));

    // Tamper payload without updating checksum
    raw.payload.answers['TAMPERED'] = 'BAD DATA';
    writeFileSync(canonicalPath, JSON.stringify(raw, null, 2));

    expect(() => loadInterviewStore(tempDir)).toThrow(/CHECKSUM_MISMATCH/);
  });
});
