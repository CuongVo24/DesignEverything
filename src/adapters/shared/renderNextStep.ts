import { ExecutionPlanV3, ExecutionState, ProjectProfile } from '../../core/schemas/index.js';

// The only proven-executable CLI entrypoint today. Cards must reference real
// subcommands (status, emit, validate, next, start, verify, repair, amend), not
// an aspirational `npx design-everything` binary that is not published.
const CLI = 'node adapter/claude-code/cli.mjs';

export interface NextStepCard {
  state: 'needs-profile' | 'needs-validation' | 'ready' | 'executing' | 'verifying' | 'repairing' | 'reviewing' | 'blocked' | 'complete' | 'unsupported';
  now: string;
  whyNow: string;
  allowedScope: string[];
  proof: string;
  ifItFails: string;
  enforcement: 'hard' | 'soft' | 'unsupported';
  nextCommand?: string;
  warning?: string;
}

export function renderNextStep(
  plan: ExecutionPlanV3 | null,
  state: ExecutionState | null,
  profile: ProjectProfile | null
): NextStepCard {
  // 0. Check for pending proposed amendments
  if (state && state.amendment_history) {
    const proposed = state.amendment_history.find((am) => am.status === 'proposed');
    if (proposed) {
      return {
        state: 'needs-validation',
        now: `Phê duyệt đề xuất tu chỉnh kế hoạch: ${proposed.id}.`,
        whyNow: `Đề xuất tu chỉnh đang chờ phê duyệt. Lý do: ${proposed.reason_code}. Impact: ${proposed.impact}`,
        allowedScope: [],
        proof: `Đề xuất ${proposed.id} được đổi sang status approved.`,
        ifItFails: 'Người dùng có thể approve hoặc reject đề xuất tu chỉnh này.',
        enforcement: 'hard',
        nextCommand: `node adapter/claude-code/cli.mjs amend approve ${proposed.id}`,
      };
    }
  }

  // 1. Check Profile
  if (!profile || profile.workspace_kind === 'empty' || !profile.confirmation.confirmed) {
    if (profile && (profile.workspace_kind === 'existing-unsupported' || profile.target === 'unsupported')) {
      return {
        state: 'unsupported',
        now: 'Chuyển đổi dự án sang một stack được hỗ trợ (Node CLI, Vite Web hoặc Python CLI).',
        whyNow: 'Thư mục hiện tại sử dụng stack chưa được hỗ trợ (ví dụ: Go, Rust) và không thể tự động sinh kế hoạch.',
        allowedScope: [],
        proof: 'Dự án được cấu hình đúng Marker files được hỗ trợ.',
        ifItFails: 'Khởi tạo package.json (Node/Vite) hoặc requirements.txt (Python) trong thư mục.',
        enforcement: 'unsupported',
        warning: 'WARNING: Stack hiện tại của dự án chưa được hệ thống hỗ trợ.',
      };
    }

    return {
      state: 'needs-profile',
      now: 'Xác nhận cấu hình dự án (project profile) qua bước doctor của build skill.',
      whyNow: 'Hệ thống chưa nhận diện hoặc chưa được xác nhận cấu hình stack của thư mục làm việc.',
      allowedScope: [],
      proof: 'Tệp project-profile.json tồn tại và có confirmed = true.',
      ifItFails: 'Trả lời các câu hỏi cấu hình (target, package manager) để sinh project-profile.json đã xác nhận.',
      enforcement: 'hard',
    };
  }

  // 2. Check Validation & Plan Existence
  if (!plan || !state || state.phase === 'plan-validating' || plan.discovery_status === 'blocked') {
    return {
      state: 'needs-validation',
      now: 'Chạy lệnh validate để phê duyệt kế hoạch thực thi.',
      whyNow: 'Kế hoạch thực thi chi tiết (execution-plan.json) chưa được sinh hoặc cấu hình project profile vừa có thay đổi.',
      allowedScope: ['.design-everything/**'],
      proof: 'Tệp execution-plan.json tồn tại và vượt qua kiểm tra tính toàn vẹn.',
      ifItFails: 'Khắc phục xung đột trong file cấu hình và chạy lại lệnh validate.',
      enforcement: 'hard',
      nextCommand: `${CLI} validate`,
    };
  }

  // 3. Phase: Blocked
  if (state.phase === 'blocked') {
    return {
      state: 'blocked',
      now: 'Khắc phục nguyên nhân bị chặn được chỉ định.',
      whyNow: `Trạng thái thực thi bị chặn do: ${state.block_reason || 'Không rõ nguyên nhân'}.`,
      allowedScope: [],
      proof: 'Chạy lại lệnh validate để gỡ bỏ trạng thái chặn.',
      ifItFails: 'Kiểm tra lại cấu hình thư mục dự án và các tệp tin manifest.',
      enforcement: 'hard',
      warning: `WARNING: Quy trình thực thi đang BỊ CHẶN: ${state.block_reason}`,
    };
  }

  // 4. Phase: Ready to execute
  if (state.phase === 'ready-to-execute') {
    return {
      state: 'ready',
      now: 'Khởi chạy task kiểm thử môi trường T0-discovery.',
      whyNow: 'Kế hoạch đã hợp lệ, cần kiểm tra runtime môi trường cục bộ trước khi phát triển mã nguồn.',
      allowedScope: [],
      proof: 'Task T0-discovery hoàn thành và tạo ra log evidence.',
      ifItFails: 'Kiểm tra phiên bản cài đặt Node.js/npm hoặc python/pip trên máy.',
      enforcement: 'hard',
      nextCommand: `${CLI} start T0-discovery`,
    };
  }

  // 5. Phase: Executing
  if (state.phase === 'executing') {
    const activeTask = state.active_task || 'T1-scaffold';
    const task = plan.tasks[activeTask];
    const allowed = task?.allowed_paths || [];
    const cmds = task?.commands.map((c) => c.argv.join(' ')).join(', ') || 'Không';

    return {
      state: 'executing',
      now: `Viết mã nguồn để hoàn thành mục tiêu cho task ${activeTask}.`,
      whyNow: `Task ${activeTask} đang hoạt động. Cần hoàn thành intent: "${task?.intent || ''}".`,
      allowedScope: allowed,
      proof: `Chạy lệnh kiểm chứng sau: ${cmds}`,
      ifItFails: 'Sửa mã nguồn cục bộ trong allowed scope và chạy lại lệnh kiểm chứng, không được chuyển task.',
      enforcement: 'soft',
    };
  }

  // 6. Phase: Verifying
  if (state.phase === 'verifying') {
    const activeTask = state.active_task || 'T1-scaffold';
    const task = plan.tasks[activeTask];
    const cmds = task?.commands.map((c) => c.argv.join(' ')).join(', ') || 'Không';

    return {
      state: 'verifying',
      now: `Chạy lệnh kiểm chứng và nộp bằng chứng cho task ${activeTask}.`,
      whyNow: `Xác thực chất lượng cho task ${activeTask} trước khi khóa trạng thái chuyển bước.`,
      allowedScope: [],
      proof: `Lệnh kiểm chứng: ${cmds}`,
      ifItFails: 'Nếu lệnh thất bại, trạng thái sẽ tự động chuyển sang repairing.',
      enforcement: 'hard',
      nextCommand: `${CLI} verify ${activeTask}`,
    };
  }

  // 7. Phase: Repairing
  if (state.phase === 'repairing') {
    const activeTask = state.active_task || 'T1-scaffold';
    const task = plan.tasks[activeTask];
    const allowed = task?.allowed_paths || [];
    const cmds = task?.commands.map((c) => c.argv.join(' ')).join(', ') || 'Không';

    return {
      state: 'repairing',
      now: `Sửa lỗi mã nguồn (repair) cho task ${activeTask}.`,
      whyNow: `Kiểm chứng cho task ${activeTask} thất bại. Cần sửa lỗi ngay lập tức để bảo vệ tính đóng kín (fail-closed).`,
      allowedScope: allowed,
      proof: `Chạy thành công lệnh kiểm chứng: ${cmds}`,
      ifItFails: 'Lựa chọn các cách khắc phục an toàn: 1. Retry verified command, 2. Repair active task, 3. Propose amendment.',
      enforcement: 'hard',
    };
  }

  // 7b. Phase: Reviewing (B17a — feature-done gate qua review/break-task)
  if (state.phase === 'reviewing') {
    const milestone = state.active_milestone || 'feature hiện tại';
    const openBreaks = state.open_break_tasks || [];
    if (openBreaks.length > 0) {
      return {
        state: 'reviewing',
        now: `Xử lý ${openBreaks.length} break-task của ${milestone} trước khi đóng feature.`,
        whyNow: `Manager-check phát hiện output của ${milestone} chưa sạch; feature CHƯA được coi là done (fail-closed) tới khi các break-task xong.`,
        allowedScope: openBreaks,
        proof: `Mọi break-task (${openBreaks.join(', ')}) verify pass và review được đóng.`,
        ifItFails: 'Sửa đúng điểm bẩn trong break-task; không nhảy sang feature kế khi review chưa đóng.',
        enforcement: 'hard',
        nextCommand: `${CLI} start ${openBreaks[0]}`,
      };
    }
    return {
      state: 'reviewing',
      now: `Chạy manager-check cho ${milestone} rồi đóng review.`,
      whyNow: `Mọi task build của ${milestone} đã xong; cần review lint/test/diff trước khi mở feature kế.`,
      allowedScope: [],
      proof: `Review đóng: ${milestone} vào reviewed_milestones, không phát sinh break-task chưa xử lý.`,
      ifItFails: 'Nếu review phát hiện bẩn, hệ thống sinh break-task và giữ feature ở trạng thái chưa done.',
      enforcement: 'hard',
      nextCommand: `${CLI} review ${milestone}`,
    };
  }

  // 8. Phase: Complete / Ready to ship
  return {
    state: 'complete',
    now: 'Hoàn tất dự án và sẵn sàng bàn giao (ready-to-ship).',
    whyNow: 'Tất cả các task thuộc kế hoạch đều đã được kiểm chứng và ghi nhận bằng chứng thành công.',
    allowedScope: [],
    proof: 'Hệ thống ghi nhận toàn bộ milestone đã hoàn thành.',
    ifItFails: 'Chạy lại toàn bộ test suite để đảm bảo không xảy ra regression.',
    enforcement: 'soft',
  };
}

export function renderNextStepMarkdown(card: NextStepCard, mode: 'deep' | 'fast' = 'fast'): string {
  const lines: string[] = [];

  lines.push('============================================================');
  lines.push(`👉 NEXT STEP: ${card.now}`);
  lines.push('============================================================');

  if (mode === 'deep') {
    lines.push(`🤔 Why now (Chi tiết): ${card.whyNow} (Đảm bảo tính tuần tự, quản lý rủi ro và Must-have requirements được ưu tiên hàng đầu theo quy trình).`);
  } else {
    lines.push(`🤔 Why now: ${card.whyNow}`);
  }

  lines.push(`📂 Allowed scope: ${card.allowedScope.length > 0 ? card.allowedScope.join(', ') : 'Không (Chỉ đọc/Khảo sát)'}`);
  lines.push(`✅ Proof: ${card.proof}`);

  if (mode === 'deep') {
    lines.push(`❌ If it fails (Remediation): ${card.ifItFails} (Tránh sửa đổi lan man ngoài allowed scope; nếu bế tắc, hãy thảo luận hoặc bổ sung sửa đổi kế hoạch).`);
  } else {
    lines.push(`❌ If it fails: ${card.ifItFails}`);
  }

  lines.push(`🛡️ Enforcement: ${card.enforcement.toUpperCase()}`);

  if (card.nextCommand) {
    lines.push(`💻 Command: \`${card.nextCommand}\``);
  }

  if (card.warning) {
    lines.push(`⚠️ Warning: ${card.warning}`);
  }

  lines.push('============================================================');

  return lines.join('\n');
}
