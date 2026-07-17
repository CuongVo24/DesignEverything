import { Contract, ExecutionState } from './schemas/index.js';

export interface BreakTaskDocInput {
  featureMilestone: string;
  breakTasks: Contract[];
  state: ExecutionState;
  /** Ngày review — mặc định hôm nay. Truyền vào để test deterministic. */
  today?: string;
}

export interface BreakTaskIndexEntry {
  featureMilestone: string;
  file: string;
  total: number;
  open: number;
}

function statusOf(task: Contract, state: ExecutionState): { label: string; done: boolean } {
  const done = state.completed_tasks.includes(task.id);
  return { label: done ? 'ĐÃ XONG' : 'CÒN MỞ', done };
}

function kindOf(task: Contract): 'fix' | 'polish' | 'khác' {
  if (task.id.includes('-fix-')) return 'fix';
  if (task.id.includes('-polish-')) return 'polish';
  return 'khác';
}

/**
 * Một feature-milestone → một file break-task người-đọc-được.
 *
 * Break-task vốn chỉ là ID trong execution state: máy đọc được, người thì không.
 * File này là chỗ trả lời "feature đó review ra cái gì, đã sửa gì" — thứ mà
 * người vào dự án sau cần, và cũng là thứ giữ cho fail-closed có nghĩa với
 * người thật: nhìn là biết còn nợ gì trước khi feature được coi là xong.
 */
export function renderBreakTaskDoc(input: BreakTaskDocInput): string {
  const { featureMilestone, breakTasks, state } = input;
  const today = input.today ?? new Date().toISOString().slice(0, 10);

  const lines: string[] = [];
  lines.push(`# Break-task — ${featureMilestone}`);
  lines.push('');
  lines.push('## Tại sao cần file này');
  lines.push(
    'Sau khi mọi task build của một feature pass, engine chạy lint/test thật một lần nữa. ' +
      'Chỗ nào bẩn thì thành **break-task**: `fix_*` là bug thật, `polish_*` là nợ kỹ thuật. ' +
      'Feature CHƯA được coi là xong khi còn break-task mở — đó là fail-closed. ' +
      'File này ghi lại chuyện đó bằng ngôn ngữ người đọc được, để sau này nhìn lại còn biết ' +
      'feature này từng vấp ở đâu và đã sửa bằng cách nào.'
  );
  lines.push('');
  lines.push(`Review chạy ngày ${today}.`);
  lines.push('');

  if (breakTasks.length === 0) {
    lines.push('## Kết Quả Review');
    lines.push('');
    lines.push(
      'Lint và test của feature này đều sạch — không sinh break-task nào. ' +
        'Feature được đóng review và tính là xong.'
    );
    lines.push('');
    return lines.join('\n');
  }

  const open = breakTasks.filter((t) => !statusOf(t, state).done);
  lines.push('## Kết Quả Review');
  lines.push('');
  lines.push(`| Chỉ số | Giá trị |`);
  lines.push('|---|---|');
  lines.push(`| Break-task sinh ra | ${breakTasks.length} |`);
  lines.push(`| Còn mở | ${open.length} |`);
  lines.push(
    `| Feature đã đóng review chưa | ${state.reviewed_milestones.includes(featureMilestone) ? 'Rồi' : 'CHƯA — còn nợ break-task'} |`
  );
  lines.push('');

  lines.push('## Danh Sách Break-task');
  lines.push('');
  for (const task of breakTasks) {
    const status = statusOf(task, state);
    lines.push(`### [${status.label}] \`${task.id}\` (${kindOf(task)})`);
    lines.push('');
    lines.push(`**Việc cần làm:** ${task.micro_task}`);
    lines.push('');

    if (task.checklist.length > 0) {
      lines.push('**Xong khi:**');
      for (const item of task.checklist) {
        lines.push(`- [${status.done ? 'x' : ' '}] ${item}`);
      }
      lines.push('');
    }

    if (task.scope.in.length > 0) {
      lines.push(`**Chỉ được sửa trong:** ${task.scope.in.map((p) => `\`${p}\``).join(', ')}`);
      lines.push('');
    }

    if (task.verification.length > 0) {
      lines.push('**Lệnh kiểm chứng:**');
      for (const cmd of task.verification) {
        lines.push(`- \`${cmd.argv.join(' ')}\` (mong đợi: ${cmd.expected.kind}${cmd.expected.value ? ` ${cmd.expected.value}` : ''})`);
      }
      lines.push('');
    }

    lines.push(`**Khóa quy ước:** \`${task.conventions_ref}\``);
    lines.push('');
  }

  return lines.join('\n');
}

/** Mục lục cho thư mục break-tasks — cửa vào khi muốn xem toàn cảnh nợ kỹ thuật. */
export function renderBreakTaskIndex(input: { entries: BreakTaskIndexEntry[] }): string {
  const lines: string[] = [];
  lines.push('# Break-task — Mục Lục');
  lines.push('');
  lines.push('## Tại sao cần file này');
  lines.push(
    'Mỗi feature sau khi build xong đều bị review một lần bằng lint/test thật. ' +
      'Thư mục này gom lại toàn bộ những gì review bắt được, theo từng feature. ' +
      'Đọc bảng dưới để biết dự án đang nợ những gì — còn feature nào chưa đóng review ' +
      'thì chưa được mở feature mới.'
  );
  lines.push('');

  if (input.entries.length === 0) {
    lines.push('Chưa có feature nào được review.');
    lines.push('');
    return lines.join('\n');
  }

  lines.push('| Feature | Break-task | Còn mở | Chi tiết |');
  lines.push('|---|---|---|---|');
  for (const e of input.entries) {
    lines.push(`| ${e.featureMilestone} | ${e.total} | ${e.open} | [\`${e.file}\`](${e.file}) |`);
  }
  lines.push('');

  const totalOpen = input.entries.reduce((sum, e) => sum + e.open, 0);
  lines.push(
    totalOpen === 0
      ? 'Không còn break-task nào mở.'
      : `Còn **${totalOpen}** break-task mở. Làm xong hết thì feature tương ứng mới được đóng review.`
  );
  lines.push('');

  return lines.join('\n');
}

/** Tên file chuẩn cho một feature-milestone trong docs/break-tasks/. */
export function breakTaskFileName(featureMilestone: string): string {
  return `${featureMilestone}.md`;
}
