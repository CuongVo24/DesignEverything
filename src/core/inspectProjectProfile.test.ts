import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { inspectProjectProfile } from './inspectProjectProfile.js';
import {
  calculateProfileDigest,
  loadProjectProfile,
  saveProjectProfile,
} from './projectProfileState.js';

describe('ProjectProfile Doctor & Inspection Engine', () => {
  let testWorkspace: string;

  beforeAll(() => {
    testWorkspace = mkdtempSync(join(tmpdir(), 'project-profile-test-'));
  });

  afterAll(() => {
    rmSync(testWorkspace, { recursive: true, force: true });
  });

  test('should detect empty workspace and generate initial questions', () => {
    const { profile, questions } = inspectProjectProfile(testWorkspace);
    expect(profile.workspace_kind).toBe('empty');
    expect(profile.target).toBeNull();
    expect(profile.confirmation.confirmed).toBe(false);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0].id).toBe('target');
  });

  test('should resolve empty workspace with user answers', () => {
    const { profile, questions } = inspectProjectProfile(testWorkspace, {
      target: 'node-cli',
      packageManager: 'pnpm',
    });
    expect(profile.workspace_kind).toBe('empty');
    expect(profile.target).toBe('node-cli');
    expect(profile.package_manager).toBe('pnpm');
    expect(profile.confirmation.confirmed).toBe(true);
    expect(questions).toHaveLength(0);
  });

  test('should detect Node CLI workspace with package.json', () => {
    const nodeWorkspace = mkdtempSync(join(tmpdir(), 'node-cli-test-'));
    writeFileSync(
      join(nodeWorkspace, 'package.json'),
      JSON.stringify({ name: 'test-node-app' }),
      'utf8'
    );
    writeFileSync(join(nodeWorkspace, 'package-lock.json'), '{}', 'utf8');

    const { profile, questions } = inspectProjectProfile(nodeWorkspace);
    expect(profile.workspace_kind).toBe('existing-supported');
    expect(profile.target).toBe('node-cli');
    expect(profile.package_manager).toBe('npm');
    expect(profile.confirmation.confirmed).toBe(true);
    expect(questions).toHaveLength(0);

    rmSync(nodeWorkspace, { recursive: true, force: true });
  });

  test('should detect Vite Web workspace with package.json containing vite config', () => {
    const viteWorkspace = mkdtempSync(join(tmpdir(), 'vite-web-test-'));
    writeFileSync(
      join(viteWorkspace, 'package.json'),
      JSON.stringify({
        name: 'test-vite-app',
        dependencies: { vite: '^5.0.0' },
      }),
      'utf8'
    );
    writeFileSync(join(viteWorkspace, 'pnpm-lock.yaml'), '', 'utf8');

    const { profile, questions } = inspectProjectProfile(viteWorkspace);
    expect(profile.workspace_kind).toBe('existing-supported');
    expect(profile.target).toBe('vite-web');
    expect(profile.package_manager).toBe('pnpm');
    expect(profile.confirmation.confirmed).toBe(true);
    expect(questions).toHaveLength(0);

    rmSync(viteWorkspace, { recursive: true, force: true });
  });

  test('should detect Python CLI workspace', () => {
    const pyWorkspace = mkdtempSync(join(tmpdir(), 'python-cli-test-'));
    writeFileSync(join(pyWorkspace, 'requirements.txt'), 'numpy', 'utf8');

    const { profile } = inspectProjectProfile(pyWorkspace);
    expect(profile.workspace_kind).toBe('existing-supported');
    expect(profile.target).toBe('python-cli');
    expect(profile.package_manager).toBe('pip');
    expect(profile.language).toBe('python');

    rmSync(pyWorkspace, { recursive: true, force: true });
  });

  test('should ask question for conflicting lockfiles', () => {
    const conflictWorkspace = mkdtempSync(join(tmpdir(), 'conflict-test-'));
    writeFileSync(
      join(conflictWorkspace, 'package.json'),
      JSON.stringify({ name: 'conflict-app' }),
      'utf8'
    );
    writeFileSync(join(conflictWorkspace, 'package-lock.json'), '{}', 'utf8');
    writeFileSync(join(conflictWorkspace, 'pnpm-lock.yaml'), '', 'utf8');

    const { profile, questions } = inspectProjectProfile(conflictWorkspace);
    expect(profile.confirmation.confirmed).toBe(false);
    expect(questions).toHaveLength(1);
    expect(questions[0].id).toBe('packageManager');

    rmSync(conflictWorkspace, { recursive: true, force: true });
  });

  test('should detect Cargo.toml as existing-unsupported workspace', () => {
    const rustWorkspace = mkdtempSync(join(tmpdir(), 'rust-test-'));
    writeFileSync(join(rustWorkspace, 'Cargo.toml'), '[package]', 'utf8');

    const { profile } = inspectProjectProfile(rustWorkspace);
    expect(profile.workspace_kind).toBe('existing-unsupported');
    expect(profile.target).toBe('unsupported');
    expect(profile.confirmation.confirmed).toBe(false);

    rmSync(rustWorkspace, { recursive: true, force: true });
  });

  test('should calculate digest, redact secrets, and save project profile', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'state-test-'));
    mkdirSync(join(workspace, '.design-everything'), { recursive: true });

    const rawProfile = {
      workspace_kind: 'existing-supported' as const,
      target: 'node-cli' as const,
      runtime: 'node',
      package_manager: 'npm' as const,
      framework: 'none' as const,
      language: 'typescript' as const,
      source_root: 'src',
      manifest_paths: ['package.json'],
      capabilities: ['node-npm-project'],
      confirmation: { confirmed: true, confirmed_by: 'doctor' },
      evidence: [
        {
          name: 'package.json',
          path: 'C:\\Users\\admin\\AppData\\Local\\Temp\\package.json', // absolute path containing secrets
          observed_at: new Date().toISOString(),
          confidence: 1.0,
        },
      ],
    };

    saveProjectProfile(workspace, rawProfile);

    const loaded = loadProjectProfile(workspace);
    expect(loaded).toBeDefined();
    expect(loaded!.evidence[0].path).toBe('package.json'); // redacted path to filename

    const digest = calculateProfileDigest(loaded!);
    expect(digest).toBeTypeOf('string');
    expect(digest.length).toBe(64);

    rmSync(workspace, { recursive: true, force: true });
  });

  test('profile digest change should invalidate plan and reset state to plan-validating', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'invalidate-test-'));
    const dsDir = join(workspace, '.design-everything');
    mkdirSync(dsDir, { recursive: true });

    // 1. Setup execution plan & state
    const planPath = join(dsDir, 'execution-plan.json');
    const statePath = join(dsDir, 'execution-state.json');
    writeFileSync(planPath, '{}', 'utf8');
    writeFileSync(
      statePath,
      JSON.stringify(
        {
          phase: 'ready-to-execute',
          active_task: null,
          validated_plan_digest: 'some-digest',
        },
        null,
        2
      ),
      'utf8'
    );

    const profile1 = {
      workspace_kind: 'empty' as const,
      target: null,
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

    // Save initial profile
    saveProjectProfile(workspace, profile1);

    // Save modified profile (digest changes)
    const profile2 = {
      ...profile1,
      workspace_kind: 'existing-supported' as const,
      target: 'node-cli' as const,
    };
    saveProjectProfile(workspace, profile2);

    // Assert plan is deleted and state is reset
    expect(existsSync(planPath)).toBe(false);
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    expect(state.phase).toBe('plan-validating');
    expect(state.validated_plan_digest).toBe('');

    rmSync(workspace, { recursive: true, force: true });
  });
});
