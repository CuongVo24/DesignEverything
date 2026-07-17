import { spawn } from 'child_process';
import { resolve } from 'path';
import { ProjectConventions, VerificationCommand } from './schemas/index.js';
import type { ReviewSignal } from './reviewFeatureOutput.js';

export interface FeatureReviewCommands {
  lint: string[] | null;
  test: string[];
}

/**
 * Lệnh lint/test suy từ stack đã khóa trong conventions. Engine tự chạy chúng —
 * agent KHÔNG được tự khai "lint sạch, test xanh" (D36: tín hiệu review phải do
 * runner thu, không phải do người/agent tường thuật).
 */
export function reviewCommandsFor(conventions: ProjectConventions): FeatureReviewCommands {
  const target = conventions.tech_stack.target;
  if (target === 'python-cli') {
    return { lint: null, test: ['pytest'] };
  }
  // node-cli, vite-web và mặc định: npm scripts.
  return { lint: ['npm', 'run', 'lint'], test: ['npm', 'test'] };
}

interface CommandOutcome {
  ok: boolean;
  /** Dòng đáng chú ý rút từ output, dùng làm mô tả break-task. */
  issues: string[];
}

function runCommand(argv: string[], cwd: string): Promise<CommandOutcome> {
  return new Promise((res) => {
    const child = spawn(argv[0], argv.slice(1), { cwd, env: { ...process.env }, shell: false });

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => (stdout += d.toString()));
    child.stderr?.on('data', (d) => (stderr += d.toString()));

    child.on('close', (code) => {
      res({ ok: code === 0, issues: code === 0 ? [] : extractIssues(stdout + '\n' + stderr) });
    });

    // Lệnh không tồn tại (chưa cài script) → coi là KHÔNG sạch, không phải sạch.
    // Fail-closed: thiếu tín hiệu không bao giờ được diễn giải thành tín hiệu tốt.
    child.on('error', (err) => {
      res({ ok: false, issues: [`Không chạy được \`${argv.join(' ')}\`: ${err.message}`] });
    });
  });
}

/** Rút vài dòng lỗi có nghĩa từ output thô để làm mô tả break-task. */
export function extractIssues(output: string, limit = 5): string[] {
  const lines = output
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => /error|fail|✕|×|✗|warn/i.test(l))
    .filter((l) => !/^\s*$/.test(l));

  const unique = [...new Set(lines)];
  return unique.slice(0, limit);
}

export interface RunFeatureReviewInput {
  workspace: string;
  featureMilestone: string;
  /** File feature đã đụng — lấy từ allowed_paths của các task thuộc milestone. */
  changedPaths: string[];
  conventions: ProjectConventions;
  conventionsRef: string;
}

/**
 * Chạy lint/test thật của feature vừa xong rồi gói thành ReviewSignal cho
 * reviewFeatureOutput. Đây là ranh giới giữa "máy quan sát" và "máy phán xử":
 * hàm này chỉ quan sát, không tự quyết feature pass hay fail.
 */
export async function runFeatureReview(input: RunFeatureReviewInput): Promise<ReviewSignal> {
  const cwd = resolve(input.workspace);
  const cmds = reviewCommandsFor(input.conventions);

  const testOutcome = await runCommand(cmds.test, cwd);
  const lintOutcome = cmds.lint
    ? await runCommand(cmds.lint, cwd)
    : { ok: true, issues: [] as string[] };

  const verification: VerificationCommand[] = [
    { id: 'review-test', argv: cmds.test, expected: { kind: 'exit-code-zero' } },
  ];
  if (cmds.lint) {
    verification.push({ id: 'review-lint', argv: cmds.lint, expected: { kind: 'exit-code-zero' } });
  }

  return {
    featureMilestone: input.featureMilestone,
    changedPaths: input.changedPaths,
    lint: lintOutcome,
    test: testOutcome,
    verification,
    conventionsRef: input.conventionsRef,
  };
}
