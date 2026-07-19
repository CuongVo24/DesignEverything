import { expect, test, describe, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { promoteExecutionPlan } from './promoteExecutionPlan.js';
import { synthesizeExecutionPlan } from './synthesizeExecutionPlan.js';
import { ExecutionState, ProjectProfile } from './schemas/index.js';

describe('promoteExecutionPlan (RB-05)', () => {
  let workspace: string;

  const profile: ProjectProfile = {
    workspace_kind: 'empty',
    target: 'node-cli',
    runtime: 'node',
    package_manager: 'npm',
    framework: 'none',
    language: 'typescript',
    source_root: 'src',
    manifest_paths: ['package.json'],
    capabilities: ['node-npm-project'],
    confirmation: { confirmed: true, confirmed_by: 'doctor' },
    evidence: [],
  };

  const answers = {
    user_vision: 'App to manage recipes',
    S3: "Must: Search recipe. Won't: Social share.",
    user_flow: 'Mở terminal -> gõ lệnh search',
  };

  const skeletonState: ExecutionState = {
    version: '3.0.0',
    phase: 'ready-to-execute',
    active_task: null,
    active_milestone: null,
    completed_tasks: ['T0-discovery', 'T1-scaffold', 'T2-skeleton', 'T3-verify'],
    evidence: [],
    block_reason: null,
    validated_plan_digest: 'digest',
    validated_docs_digest: 'digest',
    validation_result_digest: 'digest',
    plan_revision: 1,
    amendment_history: [],
    open_break_tasks: [],
    reviewed_milestones: [],
    updated_at: new Date().toISOString(),
  };

  const skeletonPlan = () => synthesizeExecutionPlan({ answers, profile, docs: [] }).plan;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'promote-plan-test-'));
    mkdirSync(join(workspace, '.design-everything'), { recursive: true });
    writeFileSync(join(workspace, '.design-everything/project-profile.json'), JSON.stringify(profile), 'utf8');
    mkdirSync(join(workspace, 'docs'), { recursive: true });
    writeFileSync(
      join(workspace, 'docs/03-data-model.md'),
      '## Thực Thể Chính\nUser, Recipe\n\n## Quan Hệ Giữa Các Thực Thể\nUser has many Recipes\n',
      'utf8'
    );
    writeFileSync(
      join(workspace, 'docs/04-flows.md'),
      '## Luồng Điển Hình\nMở terminal -> gõ lệnh search -> xem công thức\n',
      'utf8'
    );
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  test('produces a superset: skeleton milestones/tasks unchanged, M4-* appended', () => {
    const current = skeletonPlan();
    const promoted = promoteExecutionPlan({ workspace, answers, currentPlan: current, state: skeletonState });

    for (const milestone of current.milestones) {
      expect(promoted.milestones.map((m) => m.id)).toContain(milestone.id);
    }
    for (const taskId of ['T0-discovery', 'T1-scaffold', 'T2-skeleton', 'T3-verify']) {
      expect(promoted.tasks[taskId]).toEqual(current.tasks[taskId]);
    }
    const featureMilestones = promoted.milestones.filter((m) => m.id.startsWith('M4-'));
    expect(featureMilestones.length).toBeGreaterThanOrEqual(1);
    for (const milestone of featureMilestones) {
      for (const taskId of milestone.tasks) expect(promoted.tasks[taskId]).toBeDefined();
    }
  });

  test('is idempotent: promoting a plan that already has M4-* returns it unchanged', () => {
    const current = skeletonPlan();
    const promoted = promoteExecutionPlan({ workspace, answers, currentPlan: current, state: skeletonState });
    const again = promoteExecutionPlan({ workspace, answers, currentPlan: promoted, state: skeletonState });
    expect(again).toBe(promoted);
  });

  test('fails closed before T3-verify has passed', () => {
    const earlyState = { ...skeletonState, completed_tasks: ['T0-discovery'] };
    expect(() =>
      promoteExecutionPlan({ workspace, answers, currentPlan: skeletonPlan(), state: earlyState })
    ).toThrow(/T3-verify/);
  });

  test('fails closed when the confirmed project profile is missing', () => {
    rmSync(join(workspace, '.design-everything/project-profile.json'), { force: true });
    expect(() =>
      promoteExecutionPlan({ workspace, answers, currentPlan: skeletonPlan(), state: skeletonState })
    ).toThrow(/profile/);
  });

  test('fails closed when synthesis produces zero feature contracts', () => {
    const emptyAnswers = { user_vision: 'App with no musts' };
    expect(() =>
      promoteExecutionPlan({
        workspace,
        answers: emptyAnswers,
        currentPlan: synthesizeExecutionPlan({ answers: emptyAnswers, profile, docs: [] }).plan,
        state: skeletonState,
      })
    ).toThrow(/zero feature contracts/);
  });
});
