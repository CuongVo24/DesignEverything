import { ExecutionPlanV3, ExecutionState, ProjectProfile } from '../../core/schemas/index.js';
import { TARGET_LOCAL_CLI_COMMAND } from '../../version.js';

// The only proven-executable CLI entrypoint today. Cards must reference real
// subcommands — the ones with a case in cliOperations.ts's dispatcher (status,
// init, commit, undo, validate, build, repair, emit, next, start, verify,
// review, deepen) — not an aspirational `npx design-everything` binary that
// is not published, and not `amend`, which has no dispatcher case (see §0
// below). The invariant is enforced by renderNextStep.test.ts against
// CLI_COMMAND_SURFACE, so this list cannot silently drift again.
const CLI = TARGET_LOCAL_CLI_COMMAND;

export interface NextStepCard {
  // H4 — 'interview' added: cliOps/status.ts builds this state directly
  // (not through renderNextStep, which has no notion of interview progress/
  // script) whenever the canonical store is mid-interview. See status.ts's
  // "H4" comment for why this couldn't stay the pre-existing renderNextStep
  // call (it was invoked with a hardcoded `profile: null`, which always
  // produced 'needs-profile' regardless of actual interview state).
  state: 'needs-profile' | 'needs-validation' | 'ready' | 'executing' | 'verifying' | 'repairing' | 'reviewing' | 'blocked' | 'complete' | 'unsupported' | 'deepen' | 'interview';
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
  profile: ProjectProfile | null,
  // B21a: module deepen đã opt-in nhưng chưa emit. Card mềm, KHÔNG hiện khi không opt-in.
  deepenPending: string[] = []
): NextStepCard {
  // 0. Check for pending proposed amendments.
  //
  // B14b (controlled_amendment_recovery) is WAITING_FOR_APPROVAL and its engine
  // (src/core/planAmendment.ts) has no production caller: nothing proposes an
  // amendment, and cliOperations.ts's dispatcher has no `amend` case. This card
  // therefore must NOT emit a nextCommand — it used to print
  // `amend approve <id>`, which the dispatcher answered with
  // UNKNOWN_SUBCOMMAND, i.e. it taught the user a command that cannot run.
  // Until B14b is approved and wired, the honest card is "a proposal is sitting
  // in state and only a human can resolve it". Gap tracked as R21 in
  // Design/ContractForAI/Core/v1-fix-bugs/finding-coverage-matrix.md.
  if (state && state.amendment_history) {
    const proposed = state.amendment_history.find((am) => am.status === 'proposed');
    if (proposed) {
      return {
        state: 'needs-validation',
        now: `Quyết định thủ công về đề xuất tu chỉnh kế hoạch ${proposed.id} — CHƯA có lệnh CLI để approve/reject.`,
        whyNow: `Đề xuất tu chỉnh đang ở status "proposed". Lý do: ${proposed.reason_code}. Impact: ${proposed.impact}`,
        allowedScope: [],
        proof: `Đề xuất ${proposed.id} rời khỏi status "proposed" (approved hoặc rejected) trong .design-everything/execution-state.json.`,
        ifItFails:
          'Đường dẫn tu chỉnh có kiểm soát (B14b) chưa được nối vào CLI: không có lệnh "amend". ' +
          'Người dùng phải tự quyết định và tự sửa execution-state.json, hoặc bỏ đề xuất rồi chạy validate lại.',
        enforcement: 'hard',
        warning:
          'WARNING: Có đề xuất tu chỉnh đang chờ nhưng runtime chưa có lệnh amend. ' +
          'Không có agent nào được tự áp dụng đề xuất này thay cho phê duyệt của người dùng.',
      };
    }
  }

  // 0b. Card mềm deepen (B21a): nhắc hoàn tất module tầng 2 đã opt-in nhưng chưa
  // emit. Chỉ hiện khi KHÔNG đang thực thi/blocked (execution ưu tiên; lúc đó
  // deepen được nhắc qua evaluatePreAction.deepen_pending). KHÔNG bao giờ hiện khi
  // deepenPending rỗng (chưa opt-in gì).
  const busyPhases = ['executing', 'verifying', 'repairing', 'reviewing', 'blocked'];
  if (deepenPending.length > 0 && !(state && busyPhases.includes(state.phase))) {
    return {
      state: 'deepen',
      now: `Hoàn tất (tuỳ chọn) module thiết kế chi tiết đã bật: ${deepenPending.join(', ')}.`,
      whyNow: 'Bạn đã opt-in module deepen nhưng chưa emit. Đây là bước TUỲ CHỌN, không chặn luồng chính.',
      allowedScope: ['docs/design/**'],
      proof: 'File docs/design/ của module được sinh; deepen-state ghi emitted_at.',
      ifItFails: `Trả lời nốt câu DS còn thiếu (deepen --module ${deepenPending[0]} --next) rồi emit lại.`,
      enforcement: 'soft',
      nextCommand: `${CLI} deepen --module ${deepenPending[0]} --emit`,
    };
  }

  // 1. Check Profile
  if (!profile || !profile.confirmation?.confirmed || (profile.workspace_kind === 'empty' && !profile.target)) {
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
      now: 'Xác nhận cấu hình dự án: trả lời target/package manager khi build skill hỏi để sinh project-profile.json có confirmed = true.',
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
    const block = state.block_reason;
    const detail = block?.detail ?? 'Không rõ nguyên nhân';
    const nextCmd = block?.recoverable_by ?? `${CLI} repair`;
    const allowedScope = block?.remediation.paths ?? [];

    return {
      state: 'blocked',
      now: `Khắc phục lỗi (${block?.reason_code ?? 'BLOCKED'}): ${detail}`,
      whyNow: `Trạng thái thực thi bị chặn do: ${detail}.`,
      allowedScope,
      proof: `Chạy lệnh ${nextCmd} để gỡ bỏ trạng thái chặn.`,
      ifItFails: 'Kiểm tra lại cấu hình thư mục dự án và các tệp tin manifest.',
      enforcement: 'hard',
      nextCommand: nextCmd,
      warning: `WARNING: Quy trình thực thi đang BỊ CHẶN: ${detail}`,
    };
  }

  // 4. Phase: Ready to execute
  if (state.phase === 'ready-to-execute') {
    // After plan promotion the skeleton tasks are already completed; the card
    // must point at the first task without evidence (e.g. the first M4-*
    // feature task), not unconditionally back to T0-discovery.
    const orderedTaskIds = plan.milestones.flatMap((milestone) => milestone.tasks);
    const nextTaskId =
      orderedTaskIds.find((taskId) => !state.completed_tasks.includes(taskId)) ?? 'T0-discovery';
    const isDiscovery = nextTaskId === 'T0-discovery';
    return {
      state: 'ready',
      now: isDiscovery
        ? 'Khởi chạy task kiểm thử môi trường T0-discovery.'
        : `Khởi chạy task kế tiếp trong kế hoạch: ${nextTaskId}.`,
      whyNow: isDiscovery
        ? 'Kế hoạch đã hợp lệ, cần kiểm tra runtime môi trường cục bộ trước khi phát triển mã nguồn.'
        : 'Các task trước đã hoàn thành và có evidence; task kế tiếp trong kế hoạch đã sẵn sàng.',
      allowedScope: [],
      proof: `Task ${nextTaskId} hoàn thành và tạo ra log evidence.`,
      ifItFails: isDiscovery
        ? 'Kiểm tra phiên bản cài đặt Node.js/npm hoặc python/pip trên máy.'
        : 'Đọc Task Card của task này và kiểm tra preconditions trước khi chạy lại.',
      enforcement: 'hard',
      nextCommand: `${CLI} start --task ${nextTaskId}`,
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
      nextCommand: (() => {
        const command = task?.commands.find(
          (candidate) => !state.evidence.some(
            (e) => e.task_id === activeTask && e.command_id === candidate.id && e.exit_code === 0
          )
        ) ?? task?.commands[0];
        const commandId = command?.id ?? '<command_id>';
        const confirmationHint = command?.requires_user_confirmation
          ? ' (cần người dùng đồng ý → thêm --confirm)'
          : '';
        return `${CLI} verify --task ${activeTask} --command ${commandId}${confirmationHint}`;
      })(),
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
        nextCommand: `${CLI} start --task ${openBreaks[0]}`,
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
      nextCommand: `${CLI} review --milestone ${milestone}`,
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
