import { test, expect, describe, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadInterviewStore,
  transactInterviewStore,
  computePayloadChecksum,
  initializeInterviewStore,
  cleanupOrphanTempFiles,
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

  test('migrateInterviewStore never fabricates state when no legacy files exist (P2.2a)', () => {
    const res = migrateInterviewStore(tempDir);
    expect(res).toBe('no-legacy');
    expect(existsSync(join(tempDir, CANONICAL_STORE_REL_PATH))).toBe(false);
  });

  test('initializeInterviewStore is the sole path that creates fresh state from nothing', () => {
    const envelope = initializeInterviewStore(tempDir);
    expect(envelope.schema_version).toBe('7.0.0');
    expect(envelope.state_revision).toBe(0);
    expect(envelope.payload.progress.current_step).toBe('CAL0');
    expect(envelope.checksum).toBe(computePayloadChecksum(envelope.payload));

    const reloaded = loadInterviewStore(tempDir);
    expect(reloaded.state_revision).toBe(0);
  });

  test('initializeInterviewStore refuses to run when a canonical store already exists', () => {
    initializeInterviewStore(tempDir);
    expect(() => initializeInterviewStore(tempDir)).toThrow(/STORE_ALREADY_EXISTS/);
  });

  test('initializeInterviewStore refuses to run when legacy state exists (must migrate instead)', () => {
    writeFileSync(
      join(tempDir, 'progress.json'),
      JSON.stringify({ version: '0.1.0', phase: 'interview', current_step: 'S1' })
    );
    expect(() => initializeInterviewStore(tempDir)).toThrow(/MIGRATION_REQUIRED/);
  });

  test('loadInterviewStore throws typed STORE_MISSING for a truly uninvolved workspace, not a fabricated fresh store', () => {
    expect(() => loadInterviewStore(tempDir)).toThrow(/STORE_MISSING/);
    expect(existsSync(join(tempDir, CANONICAL_STORE_REL_PATH))).toBe(false);
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
    initializeInterviewStore(tempDir);
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
    initializeInterviewStore(tempDir);

    expect(() =>
      transactInterviewStore(tempDir, 999, (env) => env)
    ).toThrow(/REVISION_CONFLICT/);
  });

  test('loadInterviewStore rejects corrupt or tampered canonical files (checksum mismatch)', () => {
    initializeInterviewStore(tempDir);
    const canonicalPath = join(tempDir, CANONICAL_STORE_REL_PATH);
    const raw = JSON.parse(readFileSync(canonicalPath, 'utf8'));

    // Tamper payload without updating checksum
    raw.payload.answers['TAMPERED'] = 'BAD DATA';
    writeFileSync(canonicalPath, JSON.stringify(raw, null, 2));

    expect(() => loadInterviewStore(tempDir)).toThrow(/CHECKSUM_MISMATCH/);
  });

  // R19/P2.2b — orphan temp-file cleanup
  test('cleanupOrphanTempFiles removes leftover <canonical>.tmp.* files from a crashed writer', () => {
    initializeInterviewStore(tempDir);
    const canonicalPath = join(tempDir, CANONICAL_STORE_REL_PATH);
    const orphanPath = `${canonicalPath}.tmp.1700000000000.1234`;
    writeFileSync(orphanPath, '{ incomplete write left behind by a crashed process');
    expect(existsSync(orphanPath)).toBe(true);

    cleanupOrphanTempFiles(tempDir);

    expect(existsSync(orphanPath)).toBe(false);
    // Canonical store itself must be untouched.
    expect(loadInterviewStore(tempDir).state_revision).toBe(0);
  });

  test('cleanupOrphanTempFiles is idempotent on a missing/empty directory', () => {
    expect(() => cleanupOrphanTempFiles(tempDir)).not.toThrow();
  });

  test('transactInterviewStore self-heals by removing an orphaned temp file from a prior crash', () => {
    initializeInterviewStore(tempDir);
    const canonicalPath = join(tempDir, CANONICAL_STORE_REL_PATH);
    const orphanPath = `${canonicalPath}.tmp.1700000000000.5678`;
    writeFileSync(orphanPath, 'stale partial write');

    transactInterviewStore(tempDir, 0, (env) => env);

    expect(existsSync(orphanPath)).toBe(false);
  });

  // P2.2a §5 — migration conflict guards
  test('migrateInterviewStore fails closed when answers.json has data but progress.json is missing', () => {
    mkdirSync(join(tempDir, 'Design/.interview'), { recursive: true });
    writeFileSync(join(tempDir, 'Design/.interview/answers.json'), JSON.stringify({ S0: 'Vision Text' }));

    expect(() => migrateInterviewStore(tempDir)).toThrow(/MIGRATION_BLOCKED_ANSWERS_WITHOUT_PROGRESS/);
    expect(existsSync(join(tempDir, CANONICAL_STORE_REL_PATH))).toBe(false);
  });

  test('migrateInterviewStore treats an empty answers.json object as no-legacy, not a conflict', () => {
    mkdirSync(join(tempDir, 'Design/.interview'), { recursive: true });
    writeFileSync(join(tempDir, 'Design/.interview/answers.json'), JSON.stringify({}));

    const res = migrateInterviewStore(tempDir);
    expect(res).toBe('no-legacy');
  });

  test('migrateInterviewStore fails closed when progress.json and answers.json share no overlapping steps', () => {
    const legacyProgress = {
      version: '0.1.0',
      phase: 'interview',
      branch: 'web',
      current_step: 'S3',
      answered: ['S0', 'S1', 'S2'],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: null,
      answered_len_at_last_turn: 3,
      updated_at: new Date().toISOString(),
      calibrate_mode: 'deep',
    };
    writeFileSync(join(tempDir, 'progress.json'), JSON.stringify(legacyProgress));

    // Disjoint keys — looks like an answers.json from an unrelated session.
    mkdirSync(join(tempDir, 'Design/.interview'), { recursive: true });
    writeFileSync(join(tempDir, 'Design/.interview/answers.json'), JSON.stringify({ M1: 'Mobile platform text' }));

    expect(() => migrateInterviewStore(tempDir)).toThrow(/MIGRATION_BLOCKED_LEGACY_CONFLICT/);
    expect(existsSync(join(tempDir, CANONICAL_STORE_REL_PATH))).toBe(false);
  });

  test('migrateInterviewStore proceeds when progress.json and answers.json partially overlap', () => {
    const legacyProgress = {
      version: '0.1.0',
      phase: 'interview',
      branch: 'web',
      current_step: 'S3',
      answered: ['S0', 'S1', 'S2'],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: null,
      answered_len_at_last_turn: 3,
      updated_at: new Date().toISOString(),
      calibrate_mode: 'deep',
    };
    writeFileSync(join(tempDir, 'progress.json'), JSON.stringify(legacyProgress));

    // Partial overlap (S0 matches) plus one extra key — not a conflict.
    mkdirSync(join(tempDir, 'Design/.interview'), { recursive: true });
    writeFileSync(
      join(tempDir, 'Design/.interview/answers.json'),
      JSON.stringify({ S0: 'Vision Text', EXTRA: 'stray key' })
    );

    const res = migrateInterviewStore(tempDir);
    expect(res).toBe('migrated');
  });
});
