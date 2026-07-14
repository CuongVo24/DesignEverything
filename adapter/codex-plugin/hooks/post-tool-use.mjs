import { readFileSync, existsSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url)); // eslint-disable-line @typescript-eslint/no-unused-vars

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

    const matchGlob = (p, glob) => {
      const normP = p.replace(/\\/g, '/');
      const normG = glob.replace(/\\/g, '/');
      if (normP === normG || normP.startsWith(normG + '/')) return true;
      try {
        const rStr = normG.replace(/\*\*\//g, '(?:.*/)?').replace(/\*/g, '[^/]*');
        return new RegExp(`^${rStr}$`).test(normP);
      } catch {
        return false;
      }
    };

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
      return !allowedPaths.some((allowedGlob) => matchGlob(file, allowedGlob));
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
