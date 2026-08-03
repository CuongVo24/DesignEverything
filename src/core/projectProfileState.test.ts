import { test, expect, describe, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { classifyProjectProfileState, saveProjectProfile } from './projectProfileState.js';
import type { ProjectProfile } from './schemas/index.js';

const validProfile: ProjectProfile = {
  workspace_kind: 'empty',
  target: 'node-cli',
  runtime: 'node',
  package_manager: 'npm',
  framework: 'none',
  language: 'typescript',
  source_root: 'src',
  manifest_paths: [],
  capabilities: [],
  confirmation: { confirmed: true },
  evidence: [],
};

describe('P4.2/R03 (X15) — classifyProjectProfileState distinguishes missing from corrupt', () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('reports "missing" when no project-profile.json exists at all', () => {
    tempDir = join(tmpdir(), `de-profile-state-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
    mkdirSync(tempDir, { recursive: true });

    expect(classifyProjectProfileState(tempDir)).toEqual({ status: 'missing' });
  });

  test('reports "ok" for a valid project-profile.json', () => {
    tempDir = join(tmpdir(), `de-profile-state-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
    mkdirSync(tempDir, { recursive: true });
    saveProjectProfile(tempDir, validProfile);

    expect(classifyProjectProfileState(tempDir)).toEqual({ status: 'ok' });
  });

  test('reports "corrupt" (not "missing") for unparseable JSON — the exact distinction X15 was about', () => {
    tempDir = join(tmpdir(), `de-profile-state-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    writeFileSync(join(tempDir, '.design-everything/project-profile.json'), '{ not valid json', 'utf8');

    const result = classifyProjectProfileState(tempDir);
    expect(result.status).toBe('corrupt');
  });

  test('reports "corrupt" for JSON that fails schema validation', () => {
    tempDir = join(tmpdir(), `de-profile-state-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
    mkdirSync(join(tempDir, '.design-everything'), { recursive: true });
    writeFileSync(
      join(tempDir, '.design-everything/project-profile.json'),
      JSON.stringify({ workspace_kind: 'not-a-real-kind' }),
      'utf8'
    );

    const result = classifyProjectProfileState(tempDir);
    expect(result.status).toBe('corrupt');
  });
});
