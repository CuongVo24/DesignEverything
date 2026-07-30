import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'child_process';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { loadArtifactCatalog } from '../../src/core/loadArtifactCatalog.js';

const REPO_ROOT = join(__dirname, '../..');

interface PackedFile {
  path: string;
}

let packedFiles: string[];

/** Every regular file under `dir` (relative to REPO_ROOT, forward-slashed) —
 * the live filesystem, not a hand-typed list, so a new file added to either
 * directory is automatically required to be packed without anyone
 * remembering to update this test. */
function listFilesRecursive(dir: string): string[] {
  const abs = join(REPO_ROOT, dir);
  const out: string[] = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const relPath = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(relPath));
    } else {
      out.push(relPath);
    }
  }
  return out;
}

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

  it('includes the package.json main/exports entrypoint, and both actually exist on disk', () => {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
    const stripLeadingDotSlash = (p: string) => p.replace(/^\.\//, '');
    const main = stripLeadingDotSlash(pkg.main);
    const exportsPath = stripLeadingDotSlash(pkg.exports);
    expect(packedFiles).toContain(main);
    expect(packedFiles).toContain(exportsPath);
    expect(existsSync(join(REPO_ROOT, main))).toBe(true);
    expect(existsSync(join(REPO_ROOT, exportsPath))).toBe(true);
  });

  it('includes the self-contained esbuild runtime bundle and its entry source, and both actually exist on disk', () => {
    expect(packedFiles).toContain('dist/bundle/runtime.mjs');
    expect(packedFiles).toContain('dist/runtimeBundleEntry.js');
    expect(existsSync(join(REPO_ROOT, 'dist/bundle/runtime.mjs'))).toBe(true);
    expect(existsSync(join(REPO_ROOT, 'dist/runtimeBundleEntry.js'))).toBe(true);
  });

  it('includes both adapter installers and their hook wrappers, and every hook file that actually exists on disk', () => {
    expect(packedFiles).toContain('adapter/claude-code/install.mjs');
    expect(packedFiles).toContain('adapter/claude-code/cli.mjs');
    expect(packedFiles).toContain('adapter/codex-plugin/install.mjs');
    expect(packedFiles).toContain('adapter/codex-plugin/cli.mjs');

    // .test.mjs hook-test files (e.g. resolve-cli-invocation.test.mjs,
    // pre-tool-use.wrapper.test.ts) live alongside the real hooks but are
    // deliberately excluded from the tarball — see 'never ships test files'.
    const isTestFile = (f: string) => f.includes('.test.');
    for (const hookFile of listFilesRecursive('adapter/claude-code/hooks').filter((f) => !isTestFile(f))) {
      expect(packedFiles).toContain(hookFile);
    }
    for (const hookFile of listFilesRecursive('adapter/codex-plugin/hooks').filter((f) => !isTestFile(f))) {
      expect(packedFiles).toContain(hookFile);
    }
  });

  it('includes every real interview-script and doc-templates file (enumerated from disk, not hand-typed), plus the artifact catalog itself', () => {
    expect(packedFiles).toContain('Design/Content/artifact-catalog.yaml');
    expect(existsSync(join(REPO_ROOT, 'Design/Content/artifact-catalog.yaml'))).toBe(true);

    const interviewScriptFiles = listFilesRecursive('Design/Content/interview-script');
    const docTemplateFiles = listFilesRecursive('Design/Content/doc-templates');
    // A directory listing of zero would make every `expect` below vacuously
    // pass — assert there's actually something to enumerate.
    expect(interviewScriptFiles.length).toBeGreaterThan(0);
    expect(docTemplateFiles.length).toBeGreaterThan(0);

    for (const file of [...interviewScriptFiles, ...docTemplateFiles]) {
      expect(packedFiles).toContain(file);
    }
  });

  it('the artifact catalog itself loads and every tier-1 (fixed-path, non-pattern) doc artifact it declares has a real, packed template', () => {
    // Only tier-1 fixed-path artifacts are cross-checked here: some `kind:
    // doc` artifacts (e.g. design/glossary.md) are assembled programmatically
    // by a dedicated render*.ts function rather than read from a
    // doc-templates/ file at all, so their catalog path has no corresponding
    // template filename to derive — asserting one would be testing an
    // assumption about the system that isn't true, not a real invariant.
    const catalog = loadArtifactCatalog(join(REPO_ROOT, 'Design/Content/artifact-catalog.yaml'));
    const tier1DocPaths = catalog.artifacts
      .filter((a) => a.kind === 'doc' && a.ownership === 'managed' && a.tier === 1 && a.path)
      .map((a) => a.path!);
    expect(tier1DocPaths.length).toBeGreaterThan(0);

    for (const docPath of tier1DocPaths) {
      const templateName = docPath.replace(/^docs\//, '');
      const templatePath = `Design/Content/doc-templates/${templateName}`;
      expect(packedFiles).toContain(templatePath);
      expect(existsSync(join(REPO_ROOT, templatePath))).toBe(true);
    }
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
