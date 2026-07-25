import { test, expect, describe, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { acquireLock, releaseLock, LOCK_REL_PATH } from './interviewStore.js';

// P2.2b — lock ownership hardening. Pins: nonce-based release (no
// unconditional delete), a live owner is never reclaimed by TTL alone, and a
// definitively-dead owner is reclaimed immediately without waiting for TTL.
describe('P2.2b — interview lock ownership', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `de-lock-owner-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
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

  test('releaseLock does nothing if the nonce does not match the current owner', () => {
    const nonce = acquireLock(tempDir);
    const lockPath = join(tempDir, LOCK_REL_PATH);
    expect(existsSync(lockPath)).toBe(true);

    releaseLock(tempDir, 'a-completely-different-nonce');
    expect(existsSync(lockPath)).toBe(true); // still held — wrong nonce didn't delete it

    releaseLock(tempDir, nonce);
    expect(existsSync(lockPath)).toBe(false); // correct nonce releases it
  });

  test('releaseLock is a no-op if the lock was already reclaimed by a new owner', () => {
    const firstNonce = acquireLock(tempDir);
    const lockPath = join(tempDir, LOCK_REL_PATH);

    // Simulate the first owner's lock being reclaimed as stale (dead PID)
    // and re-issued to a second owner while the first is still executing.
    rmSync(lockPath);
    const secondNonce = acquireLock(tempDir);
    expect(secondNonce).not.toBe(firstNonce);

    // First owner's belated release must NOT delete the second owner's lock.
    releaseLock(tempDir, firstNonce);
    expect(existsSync(lockPath)).toBe(true);

    const record = JSON.parse(readFileSync(lockPath, 'utf8'));
    expect(record.nonce).toBe(secondNonce);

    releaseLock(tempDir, secondNonce);
    expect(existsSync(lockPath)).toBe(false);
  });

  test('a lock held by a live process is never reclaimed by TTL alone', () => {
    // Our own process PID is definitely alive for the duration of this test.
    const nonce = acquireLock(tempDir);
    const lockPath = join(tempDir, LOCK_REL_PATH);

    // Backdate the lock file's mtime far past the stale-fallback bound —
    // TTL age alone must not be sufficient to reclaim a live owner's lock.
    const farPast = new Date(Date.now() - 10 * 60 * 1000);
    utimesSync(lockPath, farPast, farPast);

    let timedOut = false;
    try {
      acquireLock(tempDir, { timeoutMs: 300 });
    } catch (err: unknown) {
      timedOut = /LOCK_TIMEOUT/.test((err as Error).message);
    }
    expect(timedOut).toBe(true);
    expect(existsSync(lockPath)).toBe(true); // our own still-live lock survives

    releaseLock(tempDir, nonce);
  });

  test('a lock whose owner PID is definitively dead is reclaimed immediately, not after TTL', () => {
    const lockPath = join(tempDir, LOCK_REL_PATH);
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    // A PID astronomically unlikely to be alive, freshly timestamped (so a
    // TTL-only policy would still consider it live/fresh).
    writeFileSync(
      lockPath,
      JSON.stringify({
        nonce: 'dead-owner-nonce',
        pid: 999999,
        session_id: null,
        acquired_at: new Date().toISOString(),
        target: 'irrelevant',
      })
    );

    const start = Date.now();
    const nonce = acquireLock(tempDir, { timeoutMs: 5000 });
    const elapsed = Date.now() - start;

    // Reclaimed on liveness, not the ~30s TTL fallback.
    expect(elapsed).toBeLessThan(5000);
    expect(nonce).not.toBe('dead-owner-nonce');

    releaseLock(tempDir, nonce);
  });
});
