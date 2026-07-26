import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';

const REPO_ROOT = join(__dirname, '../../..');
const CODEX_INSTALLER = join(REPO_ROOT, 'adapter/codex-plugin/install.mjs');
const POST_TOOL_HOOK = join(REPO_ROOT, 'adapter/codex-plugin/hooks/post-tool-use.mjs');

describe('Codex post-tool-use.mjs — shared canonical path matcher (no homegrown matchGlob)', () => {
  let tmpDir: string;

  beforeEach(() => {
    // Ensure the codex plugin has a built dist/ so the hook can resolve
    // matchesPathPattern from the compiled core, mirroring how the real
    // installed runtime works (see codex-parity.test.ts).
    execFileSync('node', [CODEX_INSTALLER], { encoding: 'utf8' });

    tmpDir = join(tmpdir(), `de-codex-post-tool-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    execFileSync('git', ['init', '-q'], { cwd: tmpDir });
    execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: tmpDir });
    execFileSync('git', ['config', 'user.name', 'test'], { cwd: tmpDir });

    mkdirSync(join(tmpDir, '.design-everything'), { recursive: true });
    writeFileSync(
      join(tmpDir, '.design-everything/execution-state.json'),
      JSON.stringify({ phase: 'executing', active_task: 'T1' }, null, 2)
    );
    writeFileSync(
      join(tmpDir, '.design-everything/execution-plan.json'),
      JSON.stringify(
        { tasks: { T1: { id: 'T1', allowed_paths: ['src/a.b/**'], commands: [] } } },
        null,
        2
      )
    );

    // `git status --porcelain` summarizes a wholly-untracked directory as a
    // single "dirname/" line rather than recursing into it. Pre-track the
    // parent directories with a placeholder so the later new file inside
    // shows up as its own porcelain line and actually exercises the glob
    // matcher against a real per-file path, not a directory summary.
    mkdirSync(join(tmpDir, 'src/aXb'), { recursive: true });
    mkdirSync(join(tmpDir, 'src/a.b'), { recursive: true });
    writeFileSync(join(tmpDir, 'src/aXb/.gitkeep'), '');
    writeFileSync(join(tmpDir, 'src/a.b/.gitkeep'), '');
    execFileSync('git', ['add', '-A'], { cwd: tmpDir });
    execFileSync('git', ['commit', '-q', '-m', 'seed'], { cwd: tmpDir });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('blocks state when a modified file merely looks like the allowed_paths glob via a regex metacharacter (e.g. "." treated literally, not as any-char)', () => {
    // allowed_paths is 'src/a.b/**' (literal dot). A homegrown matcher that
    // does not escape '.' would treat it as "any character" and incorrectly
    // let 'src/aXb/file.ts' slip through undetected as in-scope.
    writeFileSync(join(tmpDir, 'src/aXb/file.ts'), 'export {};');

    const payload = JSON.stringify({ cwd: tmpDir, tool_name: 'Write', tool_use_id: 'abc' });
    execFileSync('node', [POST_TOOL_HOOK], { input: payload, encoding: 'utf8' });

    const state = JSON.parse(
      readFileSync(join(tmpDir, '.design-everything/execution-state.json'), 'utf8')
    );
    expect(state.phase).toBe('blocked');
  });

  it('does not block when the modified file is genuinely inside allowed_paths', () => {
    writeFileSync(join(tmpDir, 'src/a.b/file.ts'), 'export {};');

    const payload = JSON.stringify({ cwd: tmpDir, tool_name: 'Write', tool_use_id: 'abc' });
    execFileSync('node', [POST_TOOL_HOOK], { input: payload, encoding: 'utf8' });

    const state = JSON.parse(
      readFileSync(join(tmpDir, '.design-everything/execution-state.json'), 'utf8')
    );
    expect(state.phase).toBe('executing');
  });
});
