import { expect, test, describe, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, cpSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { handleStatus } from './status.js';
import { initializeInterviewStore, transactInterviewStore } from '../../../core/interviewStore.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../../../..');

/**
 * H4 — status.ts's `data.questionCard`/`nextStepCard` had zero unit test
 * coverage before this file: every existing test that touches `status`
 * exercises it through the full CLI process (integration tests) without
 * asserting on the shape of what it returns for a mid-interview workspace.
 * That gap is exactly how the underlying bug (nextStepCard hardcoded to
 * 'needs-profile', no ask/options/recommendation ever surfaced) went
 * unnoticed — a real session's very first `status` call, right after
 * `init`, got nothing to work with.
 */
describe('H4 — handleStatus mid-interview question card', () => {
  let workspace: string;

  afterEach(() => {
    if (workspace && existsSync(workspace)) {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  function seedWorkspaceWithScript(): string {
    const ws = mkdtempSync(join(tmpdir(), 'de-status-h4-'));
    const scriptDir = join(ws, 'Design/Content/interview-script');
    mkdirSync(scriptDir, { recursive: true });
    cpSync(join(REPO_ROOT, 'Design/Content/interview-script'), scriptDir, { recursive: true });
    return ws;
  }

  test('a fresh interview at CAL0 returns a full questionCard matching script.yaml (ask, options, recommendation)', () => {
    workspace = seedWorkspaceWithScript();
    initializeInterviewStore(workspace);

    const result = handleStatus(workspace);
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const card = data.questionCard as Record<string, unknown>;

    expect(card).not.toBeNull();
    expect(card.id).toBe('CAL0');
    expect(card.ask).toContain('Chào mừng');
    const interaction = card.interaction as Record<string, unknown>;
    expect(interaction.kind).toBe('static');
    const recommendation = interaction.recommendation as Record<string, unknown>;
    // CAL0's script.yaml recommendation is `{mode: fixed, value: fast}` — a
    // status call must reflect that exactly, not let the caller guess.
    expect(recommendation).toEqual({ mode: 'fixed', value: 'fast' });

    const nextStepCard = data.nextStepCard as Record<string, unknown>;
    expect(nextStepCard.state).toBe('interview');
    expect(nextStepCard.now).toContain('CAL0');
  });

  test('mid-interview past CAL0 returns the card for the actual current_step, not a stale/generic one', () => {
    workspace = seedWorkspaceWithScript();
    const base = initializeInterviewStore(workspace).payload.progress;
    transactInterviewStore(workspace, 0, (env) => ({
      ...env,
      payload: {
        ...env.payload,
        progress: { ...base, phase: 'interview', current_step: 'S1', answered: ['CAL0', 'S0'] },
        answers: { CAL0: 'fast', S0: 'A CLI that plays free music from YouTube.' },
      },
    }));

    const result = handleStatus(workspace);
    const data = result.data as Record<string, unknown>;
    const card = data.questionCard as Record<string, unknown>;
    expect(card.id).toBe('S1');
    // S1 is option_hints-driven and synthesizes from S0's committed answer.
    const interaction = card.interaction as Record<string, unknown>;
    expect(interaction.kind).toBe('hints');
    const sources = interaction.sources as Array<Record<string, unknown>>;
    expect(sources.find((s) => s.id === 'S0')?.value).toBe('A CLI that plays free music from YouTube.');
  });

  test('degrades to questionCard: null (not a thrown error) when script.yaml is missing', () => {
    workspace = mkdtempSync(join(tmpdir(), 'de-status-h4-noscript-'));
    initializeInterviewStore(workspace);

    const result = handleStatus(workspace);
    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.questionCard).toBeNull();
  });
});
