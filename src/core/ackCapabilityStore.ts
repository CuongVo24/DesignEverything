import fs from 'fs';
import { join, dirname } from 'path';
import { ackCapabilityStoreSchema, type AckCapabilityRecord } from './schemas/ackCapability.js';

/**
 * Split out of ackCapability.ts to keep both files under the repo's
 * 200-line hand-authored limit (v1-fix-bugs/README.md's release gate).
 * Pure file I/O for the ack-challenge store — no verification logic here.
 */

export const ACK_STORE_REL_PATH = '.design-everything/ack-challenges.json';
export const ACK_CONSUMED_DIR_REL_PATH = '.design-everything/ack-challenges-consumed';

function storePath(workspaceRoot: string): string {
  return join(workspaceRoot, ACK_STORE_REL_PATH);
}

export function readAckStore(workspaceRoot: string): AckCapabilityRecord[] {
  const path = storePath(workspaceRoot);
  if (!fs.existsSync(path)) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch {
    return []; // Corrupt store — treat as empty rather than crash the caller.
  }
  const result = ackCapabilityStoreSchema.safeParse(parsed);
  return result.success ? result.data : [];
}

/**
 * Write-temp-then-rename, matching interviewStore.ts's writeEnvelopeAtomic
 * idiom: never leaves a half-written store file behind. Not fsync'd —
 * challenge tokens are short-lived (default TTL 30 min) and losing an
 * unconsumed one on a crash just means the caller re-triggers the warning
 * and gets a fresh token, not silent data loss.
 */
export function writeAckStoreAtomic(workspaceRoot: string, records: AckCapabilityRecord[]): void {
  const path = storePath(workspaceRoot);
  const dir = dirname(path);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${path}.tmp.${Date.now()}.${Math.floor(Math.random() * 10000)}`;
  fs.writeFileSync(tmpPath, JSON.stringify(records, null, 2), 'utf8');
  fs.renameSync(tmpPath, path);
}
