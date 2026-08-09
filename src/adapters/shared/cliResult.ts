import { z } from 'zod';
import { RUNTIME_VERSION } from '../../version.js';

export const cliResultEnvelopeSchema = z.object({
  ok: z.boolean(),
  operation: z.string(),
  reason_code: z.string(),
  severity: z.enum(['info', 'warning', 'error']).default('info'),
  message: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  next_command: z.string().optional(),
  runtime_version: z.string().default(RUNTIME_VERSION),
});
export type CliResultEnvelope = z.infer<typeof cliResultEnvelopeSchema>;

// Redacts an uncaught error's raw message before it reaches CLI stdout/stderr.
// err.message from Node's fs/module errors routinely embeds the full local
// filesystem path (which on Windows/macOS/Linux includes the OS username),
// and a rethrown error's message sometimes has a stack trace appended. Only
// the first line is kept and only path-shaped substrings are stripped —
// this is deliberately not a general secret scanner.
export function redactInternalError(rawMessage: string): string {
  const firstLine = String(rawMessage ?? '').split(/\r?\n/)[0];
  return firstLine
    .replace(/[A-Za-z]:[\\/][^\s'"]+/g, '<path>')
    .replace(/\/(?:home|Users|root)\/[^\s'"]+/g, '<path>');
}

export function exitCodeFor(result: CliResultEnvelope): number {
  if (result.ok) {
    return 0;
  }

  const code = result.reason_code || '';

  if (
    code.includes('USAGE') ||
    code.includes('ARGUMENT') ||
    code.includes('UNKNOWN_SUBCOMMAND') ||
    code.includes('INVALID_INPUT')
  ) {
    return 1;
  }

  if (
    code.includes('VALIDATION') ||
    code.includes('GATE_CLOSED') ||
    code.includes('PLAN_VALIDATION') ||
    code.includes('POLICY') ||
    code.includes('DENIED') ||
    // A1-04 (Wave A1) — ANSWER_NEEDS_USER_ACK (interviewApplicationServices.ts)
    // is a real user-actionable refusal (show the warning, get consent,
    // retry with --ack-token), not an internal engine failure. Matched by
    // the specific 'NEEDS_USER_ACK' substring rather than a bare 'ACK' —
    // 'ACK' alone would also match unrelated future codes like a
    // hypothetical 'PACKAGE_*' or 'TRACK_*'.
    code.includes('NEEDS_USER_ACK')
  ) {
    return 2;
  }

  if (
    code.includes('CORRUPT') ||
    code.includes('BROKEN') ||
    code.includes('MISSING') ||
    code.includes('HEALTH') ||
    code.includes('UNINIT') ||
    code.includes('TAMPERED')
  ) {
    return 3;
  }

  if (
    code.includes('DUPLICATE') ||
    code.includes('CONFLICT') ||
    code.includes('LOCKED') ||
    code.includes('ALREADY')
  ) {
    return 4;
  }

  return 5;
}
