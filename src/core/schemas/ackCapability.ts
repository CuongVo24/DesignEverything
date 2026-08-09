import { z } from 'zod';
import { createHash } from 'crypto';

/**
 * A1-01 (Wave A1, 8.1.0 rollout — Design/RoadMap/MasterSequencingPlan.md) —
 * capability token for overrideable "needs_user_ack" warnings. Mirrors
 * turnCapabilityRecordSchema's shape (src/core/schemas/state.ts /
 * turnCapability.ts) deliberately: same layered verify failure modes, same
 * single-use-by-status discipline. See the G0 interface note at
 * Design/ContractForAI/Core/v1-fix-bugs/B3/b3b-g0-interface-note.md for why
 * this exists and what it does NOT cover (derived-recipe provenance is a
 * deterministic reject, never ack-able — see that note §0).
 */
export const ackCapabilityRecordSchema = z.object({
  token_hash: z.string(),
  workspace_root: z.string(),
  session_id: z.string(),
  warning_digest: z.string(),
  interview_state_revision: z.number().int().min(0),
  input_digest: z.string(),
  generation_id: z.string().nullable(),
  issued_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  consumed_at: z.string().datetime().nullable(),
  status: z.enum(['active', 'consumed', 'invalidated', 'expired']),
  nonce: z.string(),
});

export type AckCapabilityRecord = z.infer<typeof ackCapabilityRecordSchema>;

export const ackCapabilityStoreSchema = z.array(ackCapabilityRecordSchema);

export interface AckWarningInput {
  id: string;
  message: string;
}

/** Canonical digest of a warning set — sorted so field order never matters. */
export function computeWarningDigest(warnings: AckWarningInput[]): string {
  const sorted = [...warnings]
    .map((w) => ({ id: w.id, message: w.message }))
    .sort((a, b) => (a.id === b.id ? a.message.localeCompare(b.message) : a.id.localeCompare(b.id)));
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
}
