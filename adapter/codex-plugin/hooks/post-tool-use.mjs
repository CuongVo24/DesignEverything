import { readFileSync, existsSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveCorePath() {
  const roots = [
    process.env.CLAUDE_PLUGIN_ROOT,
    process.env.PLUGIN_ROOT,
    resolve(__dirname, '..'),
  ].filter(Boolean);

  const candidates = [];
  for (const root of roots) {
    candidates.push(join(root, 'core', 'index.js'));
    candidates.push(join(root, 'dist', 'src', 'core', 'index.js'));
    candidates.push(join(root, 'dist', 'core', 'index.js'));
  }
  candidates.push(resolve(__dirname, '../../../dist/src/core/index.js'));
  candidates.push(resolve(__dirname, '../../../dist/core/index.js'));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function main() {
  try {
    const inputStr = readFileSync(0, 'utf8');
    if (!inputStr) {
      return;
    }
    const payload = JSON.parse(inputStr);
    const workspace = payload.cwd || process.cwd();

    console.warn(`[Audit Log] Tool execution completed: ${payload.tool_name} (ID: ${payload.tool_use_id})`);

    const statePath = join(workspace, '.design-everything/execution-state.json');
    if (!existsSync(statePath)) {
      return;
    }

    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    if (!state.active_task || state.phase === 'blocked') {
      return;
    }

    const planPath = join(workspace, '.design-everything/execution-plan.json');
    if (!existsSync(planPath)) {
      return;
    }

    const plan = JSON.parse(readFileSync(planPath, 'utf8'));
    const activeTask = plan.tasks?.[state.active_task];
    if (!activeTask) {
      return;
    }

    const allowedPaths = activeTask.allowed_paths || [];

    const corePath = resolveCorePath();
    if (!corePath) {
      console.error('[Audit Error] DesignEverything core runtime was not found next to the plugin; cannot verify allowed_paths for this audit pass.');
      return;
    }
    const { matchesPathPattern } = await import(pathToFileURL(corePath).href);

    let modifiedFiles = [];
    try {
      const gitOut = execSync('git status --porcelain', { cwd: workspace, encoding: 'utf8' });
      modifiedFiles = gitOut
        .split('\n')
        .map((line) => line.slice(3).trim())
        .filter((f) => f.length > 0);
    } catch {
      // ignore
    }

    const unexpectedFiles = modifiedFiles.filter((file) => {
      if (file.startsWith('.design-everything/') || file === 'progress.json' || file.startsWith('docs/') || file.startsWith('Design/')) {
        return false;
      }
      const normFile = file.replace(/\\/g, '/');
      return !allowedPaths.some((allowedGlob) => matchesPathPattern(normFile, allowedGlob));
    });

    if (unexpectedFiles.length > 0) {
      state.phase = 'blocked';
      state.block_reason = `Phát hiện sửa đổi tệp ngoài phạm vi cho phép: ${unexpectedFiles.join(', ')}`;
      writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
      console.warn(`[Audit Warning] State blocked due to unexpected changes to: ${unexpectedFiles.join(', ')}`);
    }
  } catch (error) {
    console.error(`PostToolUse hook error: ${error.message}`);
  }
}

main();
