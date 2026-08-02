import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { progressSchema, type Progress } from './schemas/index.js';
import { loadInterviewStore } from './interviewStore.js';

export function loadProgress(path: string): Progress {
  const workspaceRoot = dirname(path);
  const canonicalPath = join(workspaceRoot, '.design-everything/interview-state.json');

  let fileContent: string;
  try {
    fileContent = readFileSync(path, 'utf8');
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      if (existsSync(canonicalPath) || existsSync(join(workspaceRoot, 'Design/.interview/answers.json'))) {
        // A canonical store or legacy answers marker proves this workspace is
        // already involved. Never turn a corrupt/missing managed store into a
        // fresh interview: callers must receive the typed store error and use
        // the recovery path instead.
        const envelope = loadInterviewStore(workspaceRoot);
        return envelope.payload.progress;
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

/**
 * Legacy-only writer (P2.2a §5.4): writes progress.json and nothing else.
 * No longer mirrors into the canonical store — that mirror used to call
 * transactInterviewStore with expectedRevision=null (a CAS bypass explicitly
 * forbidden by P2.2a) and swallowed the transaction error on failure, which
 * could silently desync the legacy projection from canonical state. Canonical
 * writes now happen exclusively through issuePromptCapability/
 * commitInterviewAnswer with a real expected revision. Production adapters
 * and Core policy must not call this — it exists only for migration/legacy
 * fixtures.
 */
export function saveProgress(path: string, p: Progress): void {
  const parsed = progressSchema.safeParse(p);
  if (!parsed.success) {
    throw new Error(`Cannot save invalid progress state: ${JSON.stringify(parsed.error.format())}`);
  }

  const workspaceRoot = dirname(path);
  try {
    mkdirSync(workspaceRoot, { recursive: true });
    writeFileSync(path, JSON.stringify(p, null, 2), 'utf8');
  } catch (error: unknown) {
    throw new Error(`Failed to write progress file at ${path}: ${(error as Error).message}`);
  }
}
