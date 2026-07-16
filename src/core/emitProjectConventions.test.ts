import { test, expect, describe } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { emitProjectConventions, loadProjectConventions } from './emitProjectConventions.js';
import { ProjectProfile } from './schemas/index.js';

describe('emitProjectConventions & loadProjectConventions', () => {
  const mockProfile: ProjectProfile = {
    workspace_kind: 'empty',
    target: 'node-cli',
    runtime: 'node',
    package_manager: 'npm',
    framework: 'none',
    language: 'typescript',
    source_root: 'src',
    manifest_paths: ['package.json'],
    capabilities: ['node-npm-project'],
    confirmation: { confirmed: true },
    evidence: [],
  };

  const tempDir = path.join(process.cwd(), 'temp-conventions-test');

  test('should emit and load project conventions correctly', () => {
    // Clear temp dir if exists
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const writtenPaths = emitProjectConventions({
      architectureDoc: 'arch',
      constraintsDoc: 'constraints',
      profile: mockProfile,
      cwd: tempDir,
    });

    expect(writtenPaths.length).toBe(4);
    expect(writtenPaths.some((p) => p.includes('tech-stack.md'))).toBe(true);
    expect(writtenPaths.some((p) => p.includes('allowed-paths.md'))).toBe(true);

    const conventions = loadProjectConventions(path.join(tempDir, 'docs', 'conventions'));
    expect(conventions.tech_stack.target).toBe('node-cli');
    expect(conventions.tech_stack.language).toBe('typescript');
    expect(conventions.tech_stack.runtime).toBe('node');
    expect(conventions.allowed_paths).toContain('package.json');
    expect(conventions.allowed_paths).toContain('src/**/*.ts');

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
