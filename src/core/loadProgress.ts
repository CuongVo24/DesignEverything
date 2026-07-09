import { readFileSync, writeFileSync } from 'fs';
import { progressSchema, type Progress } from './schemas/index.js';

export function loadProgress(path: string): Progress {
  let fileContent: string;
  try {
    fileContent = readFileSync(path, 'utf8');
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        version: '0.1.0',
        phase: 'interview',
        branch: null,
        current_step: 'CAL0',
        answered: [],
        emitted_docs: [],
        gates_passed: [],
        last_user_turn_id: null,
        answered_len_at_last_turn: 0,
        updated_at: new Date().toISOString(),
        calibrate_mode: null,
      };
    }
    throw new Error(`Failed to read progress file at ${path}: ${(error as Error).message}`);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(fileContent);
  } catch (error: unknown) {
    throw new Error(`Failed to parse JSON at ${path}: ${(error as Error).message}`);
  }

  const parsed = progressSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error(
      `Invalid progress schema at ${path}: ${JSON.stringify(parsed.error.format())}`
    );
  }

  return parsed.data;
}

export function saveProgress(path: string, p: Progress): void {
  const parsed = progressSchema.safeParse(p);
  if (!parsed.success) {
    throw new Error(`Cannot save invalid progress state: ${JSON.stringify(parsed.error.format())}`);
  }

  try {
    writeFileSync(path, JSON.stringify(p, null, 2), 'utf8');
  } catch (error: unknown) {
    throw new Error(`Failed to write progress file at ${path}: ${(error as Error).message}`);
  }
}
