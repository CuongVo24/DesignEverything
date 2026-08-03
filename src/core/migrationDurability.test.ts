import { test, expect, describe, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadInterviewStore, initializeInterviewStore, CANONICAL_STORE_REL_PATH } from './interviewStore.js';
import { migrateInterviewStore } from './migrateInterviewStore.js';

// P2.2b — migration durability: never mask corruption behind a false
// no-op, never silently discard unparsable legacy data, immutable/unique
// backups, and legacy artifacts survive migration (only stop being
// authoritative).
describe('P2.2b — migration durability', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `de-migrate-durability-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
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

  function legacyProgress(overrides: Record<string, unknown> = {}) {
    return {
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
      ...overrides,
    };
  }

  test('migrates the legacy ready-to-build phase once into canonical ready-for-validation', () => {
    writeFileSync(
      join(tempDir, 'progress.json'),
      JSON.stringify(legacyProgress({ phase: 'ready-to-build', current_step: null }), null, 2)
    );

    expect(migrateInterviewStore(tempDir)).toBe('migrated');
    expect(loadInterviewStore(tempDir).payload.progress.phase).toBe('ready-for-validation');
    // The legacy file remains an auditable input; only the canonical store is
    // allowed to carry the new phase name.
    expect(JSON.parse(readFileSync(join(tempDir, 'progress.json'), 'utf8')).phase).toBe('ready-to-build');
  });

  test('an existing canonical store is schema/checksum-validated before being declared already-current, never masked as a false no-op', () => {
    initializeInterviewStore(tempDir);
    const canonicalPath = join(tempDir, CANONICAL_STORE_REL_PATH);
    writeFileSync(canonicalPath, '{ not valid json');

    expect(() => migrateInterviewStore(tempDir)).toThrow(/MIGRATION_BLOCKED_CANONICAL_CORRUPT/);
  });

  test('a legacy progress.json that fails to parse is a structured blocking error, never silently treated as no-legacy', () => {
    writeFileSync(join(tempDir, 'progress.json'), '{ not valid json at all');

    expect(() => migrateInterviewStore(tempDir)).toThrow(/MIGRATION_BLOCKED_LEGACY_CORRUPT/);
    // Must NOT have fabricated a canonical store from this.
    expect(existsSync(join(tempDir, CANONICAL_STORE_REL_PATH))).toBe(false);
  });

  test('a legacy progress.json that fails schema validation is a structured blocking error, never silently treated as no-legacy', () => {
    writeFileSync(join(tempDir, 'progress.json'), JSON.stringify({ totally: 'not a progress object' }));

    expect(() => migrateInterviewStore(tempDir)).toThrow(/MIGRATION_BLOCKED_LEGACY_CORRUPT/);
    expect(existsSync(join(tempDir, CANONICAL_STORE_REL_PATH))).toBe(false);
  });

  test('a legacy answers.json that is not a JSON object is a structured blocking error, never silently discarded', () => {
    writeFileSync(join(tempDir, 'progress.json'), JSON.stringify(legacyProgress()));
    mkdirSync(join(tempDir, 'Design/.interview'), { recursive: true });
    writeFileSync(join(tempDir, 'Design/.interview/answers.json'), JSON.stringify(['not', 'an', 'object']));

    expect(() => migrateInterviewStore(tempDir)).toThrow(/MIGRATION_BLOCKED_LEGACY_CORRUPT/);
    expect(existsSync(join(tempDir, CANONICAL_STORE_REL_PATH))).toBe(false);
  });

  test('backups are immutable and uniquely named — rerunning migration after a manual reset never overwrites an earlier backup', () => {
    writeFileSync(join(tempDir, 'progress.json'), JSON.stringify(legacyProgress()));
    migrateInterviewStore(tempDir);

    const backupsDir = join(tempDir, '.design-everything/backups');
    const firstBackups = readdirSync(backupsDir);
    expect(firstBackups.length).toBe(1);

    // Simulate a reset back to "canonical missing, legacy still present" and
    // migrate again — must produce a SECOND, distinctly-named backup, never
    // reuse/overwrite the first.
    rmSync(join(tempDir, CANONICAL_STORE_REL_PATH));
    migrateInterviewStore(tempDir);

    const secondBackups = readdirSync(backupsDir);
    expect(secondBackups.length).toBe(2);
    expect(new Set(secondBackups).size).toBe(2); // distinct names
  });

  test('legacy progress.json and answers.json are never deleted by migration — they just stop being authoritative', () => {
    writeFileSync(join(tempDir, 'progress.json'), JSON.stringify(legacyProgress()));
    mkdirSync(join(tempDir, 'Design/.interview'), { recursive: true });
    writeFileSync(join(tempDir, 'Design/.interview/answers.json'), JSON.stringify({ S0: 'Vision' }));

    migrateInterviewStore(tempDir);

    expect(existsSync(join(tempDir, 'progress.json'))).toBe(true);
    expect(existsSync(join(tempDir, 'Design/.interview/answers.json'))).toBe(true);

    const envelope = loadInterviewStore(tempDir);
    expect(envelope.payload.progress.branch).toBe('web');
  });

  test('two concurrent migrations racing do not corrupt the canonical store — one wins, the other observes already-current or a clean re-check', () => {
    writeFileSync(join(tempDir, 'progress.json'), JSON.stringify(legacyProgress()));

    // Sequential stand-in for concurrency (both would serialize on the
    // workspace lock in a real race): the second call must be a clean
    // already-current, not a corrupted/duplicated write.
    const first = migrateInterviewStore(tempDir);
    const second = migrateInterviewStore(tempDir);

    expect(first).toBe('migrated');
    expect(second).toBe('already-current');

    const envelope = loadInterviewStore(tempDir);
    expect(envelope.payload.progress.branch).toBe('web');
    expect(envelope.state_revision).toBe(0);
  });
});
