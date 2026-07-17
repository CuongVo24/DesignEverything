import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = join(__dirname, '..');
const manifestPath = join(ENGINE_ROOT, 'test/replay/manifests/replay-manifest.json');
const reportPath = join(ENGINE_ROOT, 'Design/RoadMap/evidence/v4-replay-report.md');

// Load manifest
if (!existsSync(manifestPath)) {
  console.error(`Missing replay manifest at ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const tmpWorkspaceDir = join(tmpdir(), `ds-replay-${Date.now()}`);

console.log(`Setting up replay workspace: ${tmpWorkspaceDir}`);
mkdirSync(tmpWorkspaceDir, { recursive: true });

const results = [];
let replayFailed = false;

try {
  for (const benchmark of manifest.benchmarks) {
    console.log(`Running benchmark: ${benchmark.name}...`);
    const fixtureSrc = join(ENGINE_ROOT, `test/replay/fixtures/${benchmark.name}`);
    const workspace = join(tmpWorkspaceDir, benchmark.name);

    if (existsSync(workspace)) {
      rmSync(workspace, { recursive: true, force: true });
    }
    mkdirSync(workspace, { recursive: true });

    // Copy fixture files
    if (existsSync(fixtureSrc)) {
      cpSync(fixtureSrc, workspace, { recursive: true });
    }

    // Initialize progress.json
    const progressPath = join(workspace, 'progress.json');
    const progress = {
      version: '4.0.0',
      phase: 'ready-to-build',
      branch: benchmark.target === 'vite-web' ? 'web' : 'cli',
      calibrate_mode: 'fast',
      current_step: null,
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
    };
    writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');

    // Create Design/Content structure inside workspace for CLI commands
    const designDir = join(workspace, 'Design/Content/interview-script');
    mkdirSync(designDir, { recursive: true });
    cpSync(join(ENGINE_ROOT, 'Design/Content/interview-script'), designDir, { recursive: true });

    const templatesSrc = join(ENGINE_ROOT, 'Design/Content/doc-templates');
    if (existsSync(templatesSrc)) {
      cpSync(templatesSrc, join(workspace, 'Design/Content/doc-templates'), { recursive: true });
    }

    // 1. Doctor / Profile confirm
    const profileDir = join(workspace, '.design-everything');
    mkdirSync(profileDir, { recursive: true });
    const profile = {
      workspace_kind: 'existing-supported',
      target: benchmark.target,
      runtime: benchmark.target === 'python-cli' ? 'python' : 'node',
      package_manager: benchmark.target === 'python-cli' ? 'pip' : 'npm',
      framework: benchmark.target === 'vite-web' ? 'vite' : 'none',
      language: benchmark.target === 'python-cli' ? 'python' : 'typescript',
      source_root: 'src',
      manifest_paths: benchmark.target === 'python-cli' ? ['requirements.txt'] : ['package.json'],
      capabilities: benchmark.capabilities,
      confirmation: { confirmed: true, confirmed_by: 'doctor' },
      evidence: [],
    };
    writeFileSync(join(profileDir, 'project-profile.json'), JSON.stringify(profile, null, 2), 'utf8');

    // 2. Run CLI emit to generate execution-plan.json
    const cliPath = join(ENGINE_ROOT, 'adapter/claude-code/cli.mjs');
    const emitOut = execSync(`node "${cliPath}" emit`, { cwd: workspace, env: { ...process.env, CLAUDE_PROJECT_DIR: workspace } }).toString();
    console.log(`Emit Output: ${emitOut}`);

    // 3. Run CLI validate
    const validateOut = execSync(`node "${cliPath}" validate`, { cwd: workspace, env: { ...process.env, CLAUDE_PROJECT_DIR: workspace } }).toString();
    console.log(`Validate Output: ${validateOut}`);

    // Verify discovery status
    const statePath = join(profileDir, 'execution-state.json');
    const state = JSON.parse(readFileSync(statePath, 'utf8'));

    console.log(`- Discovery state: ${state.phase} (expected ${benchmark.expected_discovery_status})`);

    // 4. Run verification checks
    for (const check of benchmark.checks) {
      console.log(`  - Checking tool: ${check.tool_name} with input: "${check.command || check.path}"...`);

      // Modify active task in execution state to match check context
      const tempState = JSON.parse(readFileSync(statePath, 'utf8'));
      tempState.phase = 'executing';
      tempState.active_task = check.active_task;
      writeFileSync(statePath, JSON.stringify(tempState, null, 2), 'utf8');

      // Prepare stdin payload for Codex pre-tool-use hook using the SAME wire
      // shape Codex actually sends: Bash/apply_patch carry tool_input.command
      // (apply_patch's command is the patch envelope), while Write/Edit/Read
      // carry a path field.
      let toolInput;
      if (check.tool_name === 'Bash') {
        toolInput = { command: check.command };
      } else if (check.tool_name === 'apply_patch') {
        toolInput = {
          command: `*** Begin Patch\n*** Update File: ${check.path}\n@@\n+// replay change\n*** End Patch\n`,
        };
      } else {
        toolInput = { path: check.path };
      }
      const payload = {
        tool_name: check.tool_name,
        tool_use_id: `replay-${results.length}`,
        tool_input: toolInput,
        cwd: workspace,
        session_id: 'replay-session',
      };

      const preToolUseHook = join(ENGINE_ROOT, 'adapter/codex-plugin/hooks/pre-tool-use.mjs');
      const hookResultStr = execSync(`node "${preToolUseHook}"`, {
        input: JSON.stringify(payload),
        cwd: workspace,
      }).toString('utf8');

      const hookResult = JSON.parse(hookResultStr);
      const decision = hookResult.hookSpecificOutput?.permissionDecision || 'allow';
      const reason = hookResult.hookSpecificOutput?.permissionDecisionReason || '';

      const decisionOk = decision === check.expected_decision;
      console.log(`    -> Result: ${decision} (${decisionOk ? 'OK' : 'FAILED'})`);

      results.push({
        benchmark: benchmark.name,
        tool_name: check.tool_name,
        input: check.command || check.path,
        active_task: check.active_task,
        expected: check.expected_decision,
        actual: decision,
        reason,
        status: decisionOk ? 'pass' : 'fail',
      });
    }
  }

  // Generate Replay report
  console.log(`Generating report at ${reportPath}...`);
  let reportContent = `# Cross-runtime Replay Benchmark Report

Tài liệu này ghi nhận ma trận kết quả chạy thử nghiệm đối chiếu (replay benchmark) giữa hai môi trường Claude Code và Codex Plugin trên các stacks kỹ thuật Node CLI, Vite Web và Python CLI.

## 1. Kết quả chạy thử nghiệm (Replay Matrix)

| Dự án mẫu | Công cụ (Tool) | Tham số đầu vào (Input) | Task hiện tại | Quyết định kỳ vọng | Quyết định thực tế | Kết quả |
|---|---|---|---|---|---|---|
`;

  for (const r of results) {
    reportContent += `| ${r.benchmark} | ${r.tool_name} | \`${r.input}\` | ${r.active_task} | ${r.expected} | ${r.actual} | ${r.status.toUpperCase()} |\n`;
  }

  const failures = results.filter((r) => r.status === 'fail');
  const passCount = results.length - failures.length;

  reportContent += `
## 2. Kết quả tổng hợp

*   Tổng số kiểm tra: ${results.length}. Pass: ${passCount}. Fail: ${failures.length}.
${failures.length === 0 ? '*   Tất cả kiểm tra khớp quyết định kỳ vọng trong ma trận replay.' : `*   **CÓ ${failures.length} kiểm tra KHÔNG khớp** — xem cột Kết quả ở bảng trên.`}

## 3. Phạm vi & Giới hạn (Parity & Gaps)

*   Ma trận trên là **replay quyết định của PreToolUse hook** cho các tool \`Bash\` và \`apply_patch\` mà hook thực sự intercept — KHÔNG phải bằng chứng ngăn chặn tuyệt đối. Các đường tool nằm ngoài PreToolUse (direct file read, network call không qua shell) vẫn là gap đã tài liệu hóa và cần người dùng giám sát qua PostToolUse audit + runner evidence.
*   Trạng thái thực thi được đặt phục vụ replay quyết định của hook; hành trình end-to-end đầy đủ (doctor → validate → start → verify) được kiểm bởi bộ test tích hợp riêng.
`;

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, reportContent, 'utf8');

  if (failures.length > 0) {
    console.error(`Cross-runtime replay FAILED: ${failures.length}/${results.length} checks did not match expected decisions.`);
    replayFailed = true;
  } else {
    console.log(`Cross-runtime replay passed: ${passCount}/${results.length} checks matched.`);
  }
} finally {
  // Cleanup workspace
  console.log(`Cleaning up: ${tmpWorkspaceDir}`);
  rmSync(tmpWorkspaceDir, { recursive: true, force: true });
}

if (replayFailed) {
  process.exit(1);
}
