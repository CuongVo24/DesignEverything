import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const shapesPath = join(__dirname, '../../../Design/Content/interview-script/shapes.yaml');
let validBranchIds = ['web', 'mobile', 'hybrid', 'cli'];
if (existsSync(shapesPath)) {
  try {
    const fileContent = readFileSync(shapesPath, 'utf8');
    const registry = YAML.parse(fileContent);
    if (registry && Array.isArray(registry.shapes)) {
      validBranchIds = registry.shapes.map((s: any) => s.id);
    }
  } catch {
    // Ignore and use fallback
  }
}

export const progressSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  phase: z.enum(['interview', 'docs-emitted', 'ready-to-build']),
  branch: z.string().nullable().refine(
    (val) => val === null || validBranchIds.includes(val),
    {
      message: `branch must be null or one of the valid shapes registry branches: ${validBranchIds.join(', ')}`
    }
  ),
  current_step: z.string().nullable(),
  answered: z.array(z.string()),
  emitted_docs: z.array(z.string()),
  gates_passed: z.array(z.string()),
  last_user_turn_id: z.string().nullable(),
  answered_len_at_last_turn: z.number().int().min(0),
  updated_at: z.string().datetime(),
  calibrate_mode: z.enum(['deep', 'fast']).nullable().default(null),
});
