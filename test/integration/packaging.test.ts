import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(__dirname, '../..');

interface PackedFile {
  path: string;
}

let packedFiles: string[];

describe('npm pack — the published tarball ships every runtime asset a fresh install needs, nothing stale', () => {
  beforeAll(() => {
    // shell:true is required for npm's .cmd shim to spawn on Windows via
    // execFileSync; safe here since every argument is a static literal, not
    // untrusted input.
    const raw = execFileSync('npm', ['pack', '--dry-run', '--json'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      shell: true,
    });
    const data = JSON.parse(raw);
    packedFiles = (data[0].files as PackedFile[]).map((f) => f.path.replace(/\\/g, '/'));
  });

  it('includes the package.json main/exports entrypoint', () => {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
    const stripLeadingDotSlash = (p: string) => p.replace(/^\.\//, '');
    expect(packedFiles).toContain(stripLeadingDotSlash(pkg.main));
    expect(packedFiles).toContain(stripLeadingDotSlash(pkg.exports));
  });

  it('includes the self-contained esbuild runtime bundle and its entry source', () => {
    expect(packedFiles).toContain('dist/bundle/runtime.mjs');
    expect(packedFiles).toContain('dist/runtimeBundleEntry.js');
  });

  it('includes both adapter installers and their hook wrappers', () => {
    expect(packedFiles).toContain('adapter/claude-code/install.mjs');
    expect(packedFiles).toContain('adapter/claude-code/cli.mjs');
    expect(packedFiles.some((f) => f.startsWith('adapter/claude-code/hooks/'))).toBe(true);
    expect(packedFiles).toContain('adapter/codex-plugin/install.mjs');
    expect(packedFiles.some((f) => f.startsWith('adapter/codex-plugin/hooks/'))).toBe(true);
  });

  it('includes the interview-script/catalog/doc-templates content assets both installers stage', () => {
    expect(packedFiles).toContain('Design/Content/artifact-catalog.yaml');
    expect(packedFiles.some((f) => f.startsWith('Design/Content/interview-script/'))).toBe(true);
    expect(packedFiles.some((f) => f.startsWith('Design/Content/doc-templates/'))).toBe(true);
  });

  it('never ships a leftover bundled dist/ or node_modules/ inside adapter/codex-plugin (the old self-containment bug)', () => {
    const stale = packedFiles.filter(
      (f) => f.startsWith('adapter/codex-plugin/dist/') || f.startsWith('adapter/codex-plugin/node_modules/')
    );
    expect(stale).toEqual([]);
  });

  it('never ships test files', () => {
    expect(packedFiles.some((f) => f.includes('.test.'))).toBe(false);
  });

  it('does not list a stale "dist/adapter" entry in package.json files (tsc never emits it)', () => {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
    expect(pkg.files).not.toContain('dist/adapter');
  });
});
