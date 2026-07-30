import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadScript } from '../../src/core/loadScript.js';
import { commitStep } from '../../src/core/advanceState.js';
import { issueTurnCapability } from '../../src/core/turnCapability.js';
import { validateAnswer } from '../../src/core/validateAnswer.js';
import { renderNextStep } from '../../src/adapters/shared/renderNextStep.js';
import { initExecutionState } from '../../src/core/advanceExecutionState.js';
import type { Progress, ProjectProfile, Script } from '../../src/core/schemas/index.js';

const REPO_ROOT = join(__dirname, '../..');
const SCRIPT_PATH = join(REPO_ROOT, 'Design/Content/interview-script/script.yaml');

/** Issues a real capability for progress.current_step then commits it in one call. */
function commitWithCapability(
  progress: Progress,
  script: Script,
  opts: { branchChoice?: string } = {}
): Progress {
  if (progress.current_step === null) {
    throw new Error('commitWithCapability: no active current_step to commit');
  }
  const issued = issueTurnCapability(progress.state_revision || 0, {
    sessionId: progress.session_id || 'default-session',
    operationKind: 'interview',
    questionId: progress.current_step,
  });
  const withCap: Progress = { ...progress, pending_turn_capability: issued.capability };
  return commitStep(withCap, script, { capabilityToken: issued.token, branchChoice: opts.branchChoice });
}

describe('B5c — Newbie Journey Across 4 Shapes (Web, Mobile, CLI, Hybrid)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `de-journey-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('NJ-01 — should order questions dynamically from runtime catalog for all 4 shapes without hardcoded lists', () => {
    const script = loadScript(SCRIPT_PATH);
    const shapes = ['web', 'mobile', 'cli', 'hybrid'];

    for (const shape of shapes) {
      let progress: Progress = {
        version: '4.0.0',
        session_id: 'sess-nj-01',
        state_revision: 0,
        phase: 'interview',
        branch: null,
        calibrate_mode: 'fast',
        current_step: 'CAL0',
        answered: [],
        emitted_docs: [],
        gates_passed: [],
        pending_turn_capability: null,
        last_user_turn_id: null,
        answered_len_at_last_turn: 0,
        updated_at: new Date().toISOString(),
      };

      const visitedQuestions: string[] = [];

      while (progress.current_step !== null) {
        const stepId = progress.current_step;
        visitedQuestions.push(stepId);

        // Verify question exists in catalog script
        const qDef = script.questions.find((q) => q.id === stepId);
        expect(qDef).toBeDefined();

        progress = commitWithCapability(progress, script, {
          branchChoice: stepId === 'S7' ? shape : undefined,
        });
      }

      expect(visitedQuestions.length).toBeGreaterThan(5);
      expect(progress.phase).toBe('docs-emitted');
    }
  });

  it('NJ-02 — should walk through hybrid shape and include questions from both web and mobile subsets', () => {
    const script = loadScript(SCRIPT_PATH);
    const hybridFixturePath = join(REPO_ROOT, 'test/fixtures/journeys/hybrid-newbie.json');
    const fixture = JSON.parse(readFileSync(hybridFixturePath, 'utf8'));

    let progress: Progress = {
      version: '4.0.0',
      session_id: 'sess-hybrid',
      state_revision: 0,
      phase: 'interview',
      branch: null,
      calibrate_mode: 'fast',
      current_step: 'CAL0',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      pending_turn_capability: null,
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
    };

    const answeredList: string[] = [];

    while (progress.current_step !== null) {
      const stepId = progress.current_step;
      answeredList.push(stepId);

      progress = commitWithCapability(progress, script, {
        branchChoice: stepId === 'S7' ? fixture.shape : undefined,
      });
    }

    // Must include both W-series (Web) and M-series (Mobile) questions
    const hasWebQuestions = answeredList.some((q) => q.startsWith('W'));
    const hasMobileQuestions = answeredList.some((q) => q.startsWith('M'));

    expect(hasWebQuestions).toBe(true);
    expect(hasMobileQuestions).toBe(true);
  });

  it('NJ-03 — should maintain identical state invariants between deep and fast calibration modes', () => {
    const script = loadScript(SCRIPT_PATH);

    const runJourney = (calMode: 'deep' | 'fast') => {
      let progress: Progress = {
        version: '4.0.0',
        session_id: `sess-${calMode}`,
        state_revision: 0,
        phase: 'interview',
        branch: null,
        calibrate_mode: calMode,
        current_step: 'CAL0',
        answered: [],
        emitted_docs: [],
        gates_passed: [],
        pending_turn_capability: null,
        last_user_turn_id: null,
        answered_len_at_last_turn: 0,
        updated_at: new Date().toISOString(),
      };

      const history: string[] = [];

      while (progress.current_step !== null) {
        const step = progress.current_step;
        history.push(step);
        progress = commitWithCapability(progress, script, {
          branchChoice: step === 'S7' ? 'web' : undefined,
        });
      }

      return { history, finalRevision: progress.state_revision, finalPhase: progress.phase };
    };

    const deepRes = runJourney('deep');
    const fastRes = runJourney('fast');

    // Invariants must match 100%
    expect(deepRes.history).toEqual(fastRes.history);
    expect(deepRes.finalRevision).toEqual(fastRes.finalRevision);
    expect(deepRes.finalPhase).toEqual(fastRes.finalPhase);
  });

  it('NJ-04 — should render post-emit transcript instructing user to run validate/build before writing code', () => {
    const script = loadScript(SCRIPT_PATH);

    let progress: Progress = {
      version: '4.0.0',
      session_id: 'sess-post-emit',
      state_revision: 0,
      phase: 'interview',
      branch: null,
      calibrate_mode: 'fast',
      current_step: 'CAL0',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      pending_turn_capability: null,
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
    };

    while (progress.current_step !== null) {
      const step = progress.current_step;
      progress = commitWithCapability(progress, script, {
        branchChoice: step === 'S7' ? 'web' : undefined,
      });
    }

    // Render post-emit next step suggestion — docs-emitted hands off to a
    // real ExecutionState at plan-validating (renderNextStep's signature is
    // (plan, state, profile, deepenPending), not (progress, script, locale)).
    progress.phase = 'docs-emitted';
    const profile: ProjectProfile = {
      workspace_kind: 'empty',
      target: 'vite-web',
      runtime: 'node',
      package_manager: 'npm',
      framework: 'vite',
      language: 'typescript',
      source_root: 'src',
      manifest_paths: ['package.json'],
      capabilities: ['node-npm-project'],
      confirmation: { confirmed: true, confirmed_by: 'user' },
      evidence: [],
    };
    const execState = initExecutionState();
    const nextStepInfo = renderNextStep(null, execState, profile);

    // Guidance must instruct validate or build
    expect(nextStepInfo).toBeDefined();
    const rawText = nextStepInfo.now + ' ' + (nextStepInfo.nextCommand || '');
    expect(rawText).toMatch(/validate|build/i);
  });

  it('NJ-05 — should flag sparse/generic answers with needs_user_ack or validation warning', () => {
    const script = loadScript(SCRIPT_PATH);

    // Generic persona "moi nguoi" for S2
    const s2Def = script.questions.find((q) => q.id === 'S2')!;
    const valS2 = validateAnswer(s2Def.answer_contract, 'moi nguoi');
    expect(valS2.outcome === 'needs_user_ack' || valS2.outcome === 'invalid').toBe(true);

    // Placeholder "todo" for S3
    const s3Def = script.questions.find((q) => q.id === 'S3')!;
    const valS3 = validateAnswer(s3Def.answer_contract, 'todo');
    expect(valS3.outcome).toBe('invalid');
  });
});
