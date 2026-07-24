import { z } from 'zod';

export const healthStatusSchema = z.enum(['uninvolved', 'healthy', 'broken', 'warning']);
export type HealthStatus = z.infer<typeof healthStatusSchema>;

export const healthIssueSchema = z.object({
  severity: z.enum(['error', 'warning']),
  reason_code: z.string(),
  artifact: z.string(),
  detail: z.string(),
  safe_next_command: z.string(),
  can_auto_repair: z.boolean(),
});
export type HealthIssue = z.infer<typeof healthIssueSchema>;

export const healthReportSchema = z.object({
  status: healthStatusSchema,
  issues: z.array(healthIssueSchema),
  checked_at: z.string().datetime(),
});
export type HealthReport = z.infer<typeof healthReportSchema>;
