import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { progressSchema, type Progress } from './schemas/index.js';
import { loadInterviewStore, transactInterviewStore } from './interviewStore.js';

export function loadProgress(path: string): Progress {
  const workspaceRoot = dirname(path);
  const canonicalPath = join(workspaceRoot, '.design-everything/interview-state.json');

  let fileContent: string;
  try {
    fileContent = readFileSync(path, 'utf8');
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      if (existsSync(canonicalPath) || existsSync(join(workspaceRoot, 'Design/.interview/answers.json'))) {
        try {
          const envelope = loadInterviewStore(workspaceRoot);
          return envelope.payload.progress;
        } catch {
          // Fallback if canonical read fails
        }
      }
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
      // Mirror into the canonical store as a best-effort debug projection.
      // Must be a deep clone: transactInterviewStore stamps its own
      // (independently-incrementing) revision onto payload.progress in
      // place, and aliasing `p` here let that stamp silently overwrite the
      // caller's real progress object — desyncing state_revision from the
      // capability that had just been issued against it (found while wiring
      // B1a's mandatory capability check end-to-end; see plan-v1-fix.md R02).
      transactInterviewStore(workspaceRoot, null, (envelope) => ({
        ...envelope,
        payload: {
          ...envelope.payload,
          progress: structuredClone(p),
        },
      }));
    } catch {
      // Fallback write
    }
  }

  try {
    mkdirSync(workspaceRoot, { recursive: true });
    writeFileSync(path, JSON.stringify(p, null, 2), 'utf8');
  } catch (error: unknown) {
    throw new Error(`Failed to write progress file at ${path}: ${(error as Error).message}`);
  }
}
