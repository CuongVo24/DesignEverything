import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { runCliOperation } from '../../src/adapters/shared/cliOperations.js';
import {
  initExecutionState,
  saveExecutionState,
  synthesizeExecutionPlan,
  calculatePlanDigest,
  calculateDocsDigest,
  loadEmittedDocs,
  emitProjectConventions,
} from '../../src/core/index.js';
import { ProjectProfile } from '../../src/core/schemas/index.js';

// Minimal shapes for the bits of CliResultEnvelope.data / the on-disk plan
// this test reads. cliResult.ts types `data` as Record<string, unknown> at
// the seam boundary (any subcommand can shape it differently); this test
// only needs a narrow, known slice of it.
interface VerifyResultData {
  completed_tasks: string[];
  promoted: boolean;
  promoted_milestones: string[];
  phase: string;
}

interface PlanTask {
  id: string;
  commands: Array<{ id: string }>;
}

interface PlanMilestone {
  id: string;
  tasks: string[];
}

interface ExecutionPlanOnDisk {
  milestones: PlanMilestone[];
  tasks: Record<string, PlanTask>;
}

// RB-05 (ReleaseReadinessPlan.md) — proves the skeleton-to-feature promotion
// wiring end-to-end through the REAL production seam (runCliOperation, the
// exact function adapter/claude-code/cli.mjs calls), not by calling
// promoteExecutionPlan/advanceExecutionState in isolation (those already
// have unit coverage — promoteExecutionPlan.test.ts, advanceExecutionState.test.ts).
// What only an e2e can catch: the auto-promote wiring inside handleVerify
// (cliOperations.ts) actually fires from a real verify call, actually
// writes the promoted plan to disk, and actually leaves the phase at
// ready-to-execute (not ready-to-ship) until the feature milestone is
// reviewed.
//
// T0-T3 skeleton commands and the M4 feature task's verify command are the
// REAL recipe commands (node --version, npm --version, npm init -y, npm
// test) — unmutated. That is only possible on Windows because this batch
// also fixed a real spawn bug found while building this test: npm/pnpm/yarn
// resolve to .cmd shims that spawn(..., {shell:false}) cannot launch on
// Windows (ENOENT regardless of workspace content) — see
// runTaskVerification.ts's WINDOWS_SHELL_SHIMS / runFeatureReview.ts's
// twin. Without that fix, every node-cli/vite-web project's T1/T3/review
// steps would ENOENT-fail forever on Windows, and this e2e could not exist
// without either lying (mutating away the real commands) or skipping the
// platform.
describe('RB-05 E2E: skeleton -> feature promotion', { timeout: 180_000 }, () => {
  let workspace: string;
  let execStatePath: string;
  let execPlanPath: string;

  const profile: ProjectProfile = {
    workspace_kind: 'empty',
    target: 'node-cli',
    runtime: 'node',
    package_manager: 'npm',
    framework: 'none',
    language: 'typescript',
    source_root: 'src',
    manifest_paths: ['package.json', 'tsconfig.json'],
    capabilities: ['node-npm-project'],
    confirmation: { confirmed: true, confirmed_by: 'doctor' },
    evidence: [],
  };

  // Must has to be strong enough that extractMustFeatures + entity/flow
  // matching in synthesizeFeatureContracts produces >=1 M4-* milestone —
  // same fixture shape as promoteExecutionPlan.test.ts.
  const answers = {
    user_vision: 'App to manage recipes',
    S3: "Must: Search recipe. Won't: Social share.",
    user_flow: 'Mở terminal -> gõ lệnh search',
  };

  beforeAll(async () => {
    workspace = mkdtempSync(join(tmpdir(), 'de-e2e-skel2feat-'));
    execStatePath = join(workspace, '.design-everything/execution-state.json');
    execPlanPath = join(workspace, '.design-everything/execution-plan.json');

    mkdirSync(join(workspace, '.design-everything'), { recursive: true });
    mkdirSync(join(workspace, 'docs'), { recursive: true });
    mkdirSync(join(workspace, 'Design/.interview'), { recursive: true });

    // Design docs promoteExecutionPlan needs to ground the feature synthesis in.
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

    // Confirmed profile + real project conventions (production emitter, not
    // hand-authored markdown) so loadProjectConventionsFromCwd resolves the
    // node-cli target the same way a real /build run would.
    writeFileSync(join(workspace, '.design-everything/project-profile.json'), JSON.stringify(profile), 'utf8');
    emitProjectConventions({
      architectureDoc: '',
      constraintsDoc: '',
      profile,
      cwd: workspace,
      dependencies: [],
    });

    writeFileSync(join(workspace, 'Design/.interview/answers.json'), JSON.stringify(answers), 'utf8');

    // Real skeleton plan (no feature contracts yet — docs:[] mirrors
    // promoteExecutionPlan.test.ts's skeletonPlan() helper exactly).
    const { plan } = synthesizeExecutionPlan({ answers, profile, docs: [] });
    writeFileSync(execPlanPath, JSON.stringify(plan, null, 2), 'utf8');

    const emittedDocs = loadEmittedDocs(workspace, execPlanPath);
    let state = initExecutionState();
    state = {
      ...state,
      phase: 'ready-to-execute',
      validated_plan_digest: calculatePlanDigest(plan),
      validated_docs_digest: calculateDocsDigest(emittedDocs),
    };
    saveExecutionState(execStatePath, state);
  });

  afterAll(() => {
    if (existsSync(workspace)) rmSync(workspace, { recursive: true, force: true });
  });

  test('T0-T3 skeleton verify promotes plan to M4-*, stays below ready-to-ship, then review closes to ready-to-ship', async () => {
    // --- T0-discovery: node --version / npm --version (real commands) ---
    let res = await runCliOperation(workspace, ['start', '--task', 'T0-discovery']);
    expect(res.ok).toBe(true);
    res = await runCliOperation(workspace, ['verify', '--task', 'T0-discovery', '--command', 'node-version']);
    expect(res.ok).toBe(true);
    res = await runCliOperation(workspace, ['verify', '--task', 'T0-discovery', '--command', 'pm-version']);
    expect(res.ok).toBe(true);
    expect((res.data as unknown as VerifyResultData).completed_tasks).toContain('T0-discovery');

    // --- T1-scaffold: real `npm init -y`, requires --confirm (RB-02) ---
    res = await runCliOperation(workspace, ['start', '--task', 'T1-scaffold']);
    expect(res.ok).toBe(true);
    res = await runCliOperation(workspace, ['verify', '--task', 'T1-scaffold', '--command', 'init-project', '--confirm']);
    expect(res.ok).toBe(true);
    expect(existsSync(join(workspace, 'package.json'))).toBe(true);

    // npm init -y's default package.json has a failing placeholder test
    // script and no lint script. T3-verify and the later feature/review
    // steps need real, deterministic, passing npm scripts — an agent
    // scaffolding within T1's allowed_paths (package.json) would do the
    // same thing here.
    const pkg = JSON.parse(readFileSync(join(workspace, 'package.json'), 'utf8'));
    pkg.scripts = {
      ...pkg.scripts,
      test: 'node -e "process.exit(0)"',
      lint: 'node -e "process.exit(0)"',
    };
    writeFileSync(join(workspace, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');

    // --- T2-skeleton: entrypoint existence check (TS: no build step) ---
    res = await runCliOperation(workspace, ['start', '--task', 'T2-skeleton']);
    expect(res.ok).toBe(true);
    mkdirSync(join(workspace, 'src'), { recursive: true });
    writeFileSync(join(workspace, 'src/index.ts'), 'export {};\n', 'utf8');
    res = await runCliOperation(workspace, ['verify', '--task', 'T2-skeleton', '--command', 'run-skeleton']);
    expect(res.ok).toBe(true);

    // --- T3-verify: real `npm test` -> triggers auto-promote ---
    res = await runCliOperation(workspace, ['start', '--task', 'T3-verify']);
    expect(res.ok).toBe(true);
    res = await runCliOperation(workspace, ['verify', '--task', 'T3-verify', '--command', 'run-tests']);
    expect(res.ok).toBe(true);
    const verifyData = res.data as unknown as VerifyResultData;
    expect(verifyData.completed_tasks).toContain('T3-verify');
    expect(verifyData.promoted).toBe(true);
    expect(verifyData.promoted_milestones.length).toBeGreaterThanOrEqual(1);
    // The promote wiring's whole point: skeleton complete must NOT mean
    // ready-to-ship until the promoted feature milestone is reviewed.
    expect(verifyData.phase).toBe('ready-to-execute');

    const promotedPlan: ExecutionPlanOnDisk = JSON.parse(readFileSync(execPlanPath, 'utf8'));
    const featureMilestone = promotedPlan.milestones.find((m) => m.id.startsWith('M4-'));
    if (!featureMilestone) throw new Error('Expected an M4-* milestone after T3-verify auto-promote.');
    expect(featureMilestone.tasks.length).toBeGreaterThanOrEqual(1);
    for (const taskId of featureMilestone.tasks) {
      expect(promotedPlan.tasks[taskId]).toBeDefined();
    }
    // Superset guarantee (also covered by promoteExecutionPlan.test.ts, but
    // this proves the CLI wiring didn't lose it on the way to disk).
    for (const skeletonTaskId of ['T0-discovery', 'T1-scaffold', 'T2-skeleton', 'T3-verify']) {
      expect(promotedPlan.tasks[skeletonTaskId]).toBeDefined();
    }

    // --- Build + verify every task of the promoted feature milestone ---
    for (const taskId of featureMilestone.tasks) {
      res = await runCliOperation(workspace, ['start', '--task', taskId]);
      expect(res.ok).toBe(true);
      const task = promotedPlan.tasks[taskId];
      for (const command of task.commands) {
        res = await runCliOperation(workspace, ['verify', '--task', taskId, '--command', command.id, '--confirm']);
        expect(res.ok).toBe(true);
      }
    }

    const stateAfterFeature = JSON.parse(readFileSync(execStatePath, 'utf8'));
    expect(stateAfterFeature.completed_tasks).toEqual(expect.arrayContaining(featureMilestone.tasks));
    // Feature build done, but not reviewed yet -> still not ready-to-ship.
    expect(stateAfterFeature.phase).not.toBe('ready-to-ship');

    // --- Review closes the feature (real `npm test` + `npm run lint`) ---
    res = await runCliOperation(workspace, ['review', '--milestone', featureMilestone.id]);
    expect(res.ok).toBe(true);

    const finalState = JSON.parse(readFileSync(execStatePath, 'utf8'));
    expect(finalState.reviewed_milestones).toContain(featureMilestone.id);
    expect(finalState.open_break_tasks).toEqual([]);
    expect(finalState.phase).toBe('ready-to-ship');
  });
});
