import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { progressSchema, type Progress } from './schemas/index.js';
import { loadInterviewStore, transactInterviewStore } from './interviewStore.js';

export function loadProgress(path: string): Progress {
  // If path is progress.json in workspace or progress.json does not exist, try loading canonical store
  const workspaceRoot = dirname(path);
  const canonicalPath = join(workspaceRoot, '.design-everything/interview-state.json');

  if (existsSync(canonicalPath) || existsSync(join(workspaceRoot, 'Design/.interview/answers.json'))) {
    try {
      const envelope = loadInterviewStore(workspaceRoot);
      return envelope.payload.progress;
    } catch {
      // Fallback if canonical read fails
    }
  }

  let fileContent: string;
  try {
    fileContent = readFileSync(path, 'utf8');
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        version: '7.0.0',
        phase: 'interview',
        session_id: `session-${Date.now()}`,
        state_revision: 0,
        branch: null,
        current_step: 'CAL0',
        answered: [],
        emitted_docs: [],
        gates_passed: [],
        pending_turn_capability: null,
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

  const workspaceRoot = dirname(path);
  const canonicalPath = join(workspaceRoot, '.design-everything/interview-state.json');

  if (existsSync(canonicalPath)) {
    try {
      transactInterviewStore(workspaceRoot, null, (envelope) => ({
        ...envelope,
        payload: {
          ...envelope.payload,
          progress: p,
        },
      }));
    } catch {
      // Fallback write
      writeFileSync(path, JSON.stringify(p, null, 2), 'utf8');
    }
  } else {
    try {
      writeFileSync(path, JSON.stringify(p, null, 2), 'utf8');
    } catch (error: unknown) {
      throw new Error(`Failed to write progress file at ${path}: ${(error as Error).message}`);
    }
  }
}
