import { z } from 'zod';

export const cliResultEnvelopeSchema = z.object({
  ok: z.boolean(),
  operation: z.string(),
  reason_code: z.string(),
  severity: z.enum(['info', 'warning', 'error']).default('info'),
  message: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  next_command: z.string().optional(),
  runtime_version: z.string().default('6.0.0'),
});
export type CliResultEnvelope = z.infer<typeof cliResultEnvelopeSchema>;

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
    code.includes('DENIED')
  ) {
    return 2;
  }

  if (
    code.includes('CORRUPT') ||
    code.includes('BROKEN') ||
    code.includes('MISSING') ||
    code.includes('HEALTH') ||
    code.includes('UNINIT')
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
