import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { synthesizeExecutionPlan } from './synthesizeExecutionPlan.js';
import { ProjectProfile } from './schemas/index.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, rmSync } from 'fs';

describe('synthesizeExecutionPlan Engine', () => {
  let testWorkspace: string;

  beforeAll(() => {
    testWorkspace = mkdtempSync(join(tmpdir(), 'plan-synthesis-test-'));
  });

  afterAll(() => {
    rmSync(testWorkspace, { recursive: true, force: true });
  });

  test('should generate blocked plan for unsupported profile', () => {
    const profile: ProjectProfile = {
      workspace_kind: 'existing-unsupported',
      target: 'unsupported',
      runtime: null,
      package_manager: null,
      framework: null,
      language: null,
      source_root: null,
      manifest_paths: [],
      capabilities: [],
      confirmation: { confirmed: false },
      evidence: [],
    };

    const { plan, blocked } = synthesizeExecutionPlan({
      answers: {},
      profile,
      docs: [],
    });

    expect(blocked).toBe(true);
    expect(plan.discovery_status).toBe('blocked');
    expect(plan.tasks['T0-discovery']).toBeDefined();
    expect(plan.tasks['T0-discovery'].commands).toHaveLength(0);
  });

  test('should generate blocked plan for unconfirmed profile', () => {
    const profile: ProjectProfile = {
      workspace_kind: 'empty',
      target: 'node-cli',
      runtime: 'node',
      package_manager: null,
      framework: 'none',
      language: 'typescript',
      source_root: 'src',
      manifest_paths: [],
      capabilities: [],
      confirmation: { confirmed: false },
      evidence: [],
    };

    const { plan, blocked } = synthesizeExecutionPlan({
      answers: {},
      profile,
      docs: [],
    });

    expect(blocked).toBe(true);
    expect(plan.discovery_status).toBe('blocked');
  });

  test('should synthesize valid plan for confirmed Node CLI npm profile', () => {
    const profile: ProjectProfile = {
      workspace_kind: 'existing-supported',
      target: 'node-cli',
      runtime: 'node',
      package_manager: 'npm',
      framework: 'none',
      language: 'typescript',
      source_root: 'src',
      manifest_paths: ['package.json'],
      capabilities: ['node-npm-project', 'typescript-lang'],
      confirmation: { confirmed: true, confirmed_by: 'doctor' },
      evidence: [],
    };

    const { plan, blocked } = synthesizeExecutionPlan({
      answers: {},
      profile,
      docs: [],
    });

    expect(blocked).toBe(false);
    expect(plan.discovery_status).toBe('pass');
    expect(plan.tasks['T0-discovery']).toBeDefined();
    expect(plan.tasks['T1-scaffold'].allowed_paths).toContain('package.json');
    expect(plan.tasks['T1-scaffold'].allowed_paths).toContain('tsconfig.json');
    // TS skeleton proves the entrypoint exists (no dist build step in this plan);
    // the manifest/test-script wiring is owned by T1-scaffold, not T2.
    expect(plan.tasks['T2-skeleton'].commands[0].argv.join(' ')).toContain('src/index.ts');
    expect(plan.tasks['T2-skeleton'].allowed_paths).not.toContain('package.json');
    expect(plan.tasks['T3-verify'].commands[0].argv).toEqual(['npm', 'test']);
  });

  test('should synthesize valid plan for confirmed Vite Web pnpm profile', () => {
    const profile: ProjectProfile = {
      workspace_kind: 'existing-supported',
      target: 'vite-web',
      runtime: 'node',
      package_manager: 'pnpm',
      framework: 'vite',
      language: 'typescript',
      source_root: 'src',
      manifest_paths: ['package.json'],
      capabilities: ['node-npm-project', 'vite-bundler', 'typescript-lang'],
      confirmation: { confirmed: true, confirmed_by: 'doctor' },
      evidence: [],
    };

    const { plan, blocked } = synthesizeExecutionPlan({
      answers: {},
      profile,
      docs: [],
    });

    expect(blocked).toBe(false);
    expect(plan.tasks['T1-scaffold'].allowed_paths).toContain('vite.config.ts');
    expect(plan.tasks['T3-verify'].commands[0].argv).toEqual(['pnpm', 'run', 'build']);
  });

  test('should synthesize valid plan for confirmed Python CLI pip profile', () => {
    const profile: ProjectProfile = {
      workspace_kind: 'existing-supported',
      target: 'python-cli',
      runtime: 'python',
      package_manager: 'pip',
      framework: 'none',
      language: 'python',
      source_root: 'src',
      manifest_paths: ['requirements.txt'],
      capabilities: ['python-venv-project'],
      confirmation: { confirmed: true, confirmed_by: 'doctor' },
      evidence: [],
    };

    const { plan, blocked } = synthesizeExecutionPlan({
      answers: {},
      profile,
      docs: [],
    });

    expect(blocked).toBe(false);
    expect(plan.tasks['T1-scaffold'].allowed_paths).toContain('requirements.txt');
    expect(plan.tasks['T2-skeleton'].commands[0].argv).toEqual(['python', 'src/main.py']);
    expect(plan.tasks['T3-verify'].commands[0].argv).toEqual(['pytest']);
  });
});
