import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, writeFileSync, mkdirSync, readFileSync, realpathSync } from 'fs';
import { join, dirname, relative, resolve } from 'path';
import { recordEvidence } from './advanceExecutionState.js';
import { ExecutionState, EvidenceRecord } from './schemas/index.js';
import { ExecutionPlanV3 } from './schemas/executionPlan.js';

function isPathSafe(workspace: string, relativeOrAbsolutePath: string): boolean {
  const resolvedWorkspace = resolve(workspace);
  const resolvedPath = resolve(resolvedWorkspace, relativeOrAbsolutePath);

  const rel = relative(resolvedWorkspace, resolvedPath);
  if (rel.startsWith('..')) {
    return false;
  }

  try {
    const realPath = realpathSync(resolvedPath);
    const realRel = relative(resolvedWorkspace, realPath);
    if (realRel.startsWith('..')) {
      return false;
    }
  } catch {
    try {
      const parentDir = dirname(resolvedPath);
      const realParent = realpathSync(parentDir);
      const realParentRel = relative(resolvedWorkspace, realParent);
      if (realParentRel.startsWith('..')) {
        return false;
      }
    } catch {
      const parentDir = dirname(resolvedPath);
      const parentRel = relative(resolvedWorkspace, parentDir);
      if (parentRel.startsWith('..')) {
        return false;
      }
    }
  }
  return true;
}

export function runTaskVerification(input: {
  workspace: string;
  plan: ExecutionPlanV3;
  state: ExecutionState;
  task_id: string;
  command_id: string;
}): Promise<ExecutionState> {
  return new Promise((res, rej) => {
    const { workspace, plan, state, task_id, command_id } = input;

    if (state.active_task !== task_id) {
      return rej(new Error(`Task ${task_id} is not the active task in execution state`));
    }

    const task = plan.tasks[task_id];
    if (!task) {
      return rej(new Error(`Task ${task_id} not found in execution plan`));
    }

    const cmd = task.commands.find((c) => c.id === command_id);
    if (!cmd) {
      return rej(new Error(`Command ${command_id} not found in task ${task_id}`));
    }

    const runCwd = cmd.cwd ? resolve(workspace, cmd.cwd) : workspace;
    if (!isPathSafe(workspace, runCwd)) {
      return rej(new Error(`Security error: CWD path traversal detected or out of workspace`));
    }

    const recordTimestamp = new Date().toISOString();
    const argv = cmd.argv;
    if (!argv || argv.length === 0) {
      return rej(new Error(`Command argv is empty`));
    }

    const child = spawn(argv[0], argv.slice(1), {
      cwd: runCwd,
      env: { ...process.env },
      shell: false,
    });

    let stdoutData = '';
    let stderrData = '';

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderrData += data.toString();
      });
    }

    child.on('close', (code) => {
      const exitCode = code ?? -1;

      const evidenceDir = join(workspace, '.design-everything/evidence', task_id);
      mkdirSync(evidenceDir, { recursive: true });

      const stdoutLogPath = join(evidenceDir, `${command_id}.stdout.log`);
      const stderrLogPath = join(evidenceDir, `${command_id}.stderr.log`);
      writeFileSync(stdoutLogPath, stdoutData, 'utf8');
      writeFileSync(stderrLogPath, stderrData, 'utf8');

      let isPassed = false;
      const expected = cmd.expected;
      if (expected.kind === 'exit-code-zero') {
        isPassed = (exitCode === 0);
      } else if (expected.kind === 'output-includes') {
        isPassed = (exitCode === 0) && (stdoutData.includes(expected.value || '') || stderrData.includes(expected.value || ''));
      } else if (expected.kind === 'file-exists') {
        if (exitCode === 0 && expected.value) {
          const filePath = resolve(workspace, expected.value);
          if (isPathSafe(workspace, filePath) && existsSync(filePath)) {
            isPassed = true;
          }
        }
      }

      const otherCommands = task.commands.filter((c) => c.id !== command_id);
      const allOthersPassed = otherCommands.every((c) =>
        state.evidence.some((e) => e.task_id === task_id && e.command_id === c.id && e.exit_code === 0)
      );
      const isCompletingCommand = isPassed && allOthersPassed;

      const artifactDigests: Record<string, string> = {};
      let artifactsOk = true;

      for (const artifact of task.evidence_required || []) {
        const filePath = resolve(workspace, artifact);
        if (!isPathSafe(workspace, filePath)) {
          artifactsOk = false;
          break;
        }
        if (!existsSync(filePath)) {
          if (isCompletingCommand) {
            artifactsOk = false;
          }
        } else {
          try {
            const content = readFileSync(filePath);
            const hash = createHash('sha256').update(content).digest('hex');
            artifactDigests[artifact] = hash;
          } catch {
            artifactsOk = false;
          }
        }
      }

      const finalExitCode = (isPassed && artifactsOk) ? 0 : (exitCode !== 0 ? exitCode : 1);

      const stdoutSha256 = createHash('sha256').update(stdoutData).digest('hex');
      const stderrSha256 = createHash('sha256').update(stderrData).digest('hex');

      const record: EvidenceRecord = {
        task_id,
        command_id,
        argv,
        cwd: cmd.cwd || null,
        exit_code: finalExitCode,
        stdout_sha256: stdoutSha256,
        stderr_sha256: stderrSha256,
        artifact_digests: artifactDigests,
        captured_at: recordTimestamp,
        source: 'runner',
      };

      try {
        const nextState = recordEvidence(state, record, plan);
        res(nextState);
      } catch (err) {
        rej(err);
      }
    });

    child.on('error', (err) => {
      const evidenceDir = join(workspace, '.design-everything/evidence', task_id);
      mkdirSync(evidenceDir, { recursive: true });
      const stderrLogPath = join(evidenceDir, `${command_id}.stderr.log`);
      writeFileSync(stderrLogPath, err.message, 'utf8');

      const record: EvidenceRecord = {
        task_id,
        command_id,
        argv,
        cwd: cmd.cwd || null,
        exit_code: 127,
        stdout_sha256: createHash('sha256').update('').digest('hex'),
        stderr_sha256: createHash('sha256').update(err.message).digest('hex'),
        artifact_digests: {},
        captured_at: recordTimestamp,
        source: 'runner',
      };

      try {
        const nextState = recordEvidence(state, record, plan);
        res(nextState);
      } catch (e) {
        rej(e);
      }
    });
  });
}
