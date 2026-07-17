import { ExecutionState, EvidenceRecord } from './schemas/index.js';
import { ExecutionPlanV3 } from './schemas/executionPlan.js';

export interface RenderProgressLogInput {
  plan: ExecutionPlanV3;
  state: ExecutionState;
}

interface LogEntry {
  record: EvidenceRecord;
  taskIntent: string;
  milestone: string;
  passed: boolean;
}

/** '2026-07-17T12:30:05.123Z' → '2026-07-17' */
function datePart(iso: string): string {
  return iso.slice(0, 10);
}

/** '2026-07-17T12:30:05.123Z' → '12:30' */
function timePart(iso: string): string {
  return iso.slice(11, 16);
}

function evidenceLogPath(record: EvidenceRecord): string {
  return `.design-everything/evidence/${record.task_id}/${record.command_id}.stdout.log`;
}

/**
 * Nhật ký tiến độ dạng người-đọc-được, dựng lại từ evidence trong execution
 * state. Là PROJECTION thuần: mỗi lần verify xong render lại toàn bộ file từ
 * state, không append — một nguồn sự thật (execution-state.json), không có
 * đường cho log và state lệch nhau.
 *
 * Evidence chỉ trả lời "máy đã chứng minh gì"; file này trả lời câu người thật
 * hỏi khi quay lại sau vài tuần: hôm đó làm gì, vấp ở đâu, sửa bao nhiêu lần.
 */
export function renderProgressLog(input: RenderProgressLogInput): string {
  const { plan, state } = input;

  const entries: LogEntry[] = state.evidence.map((record) => {
    const task = plan.tasks[record.task_id];
    return {
      record,
      taskIntent: task?.intent ?? '(task không còn trong plan hiện tại)',
      milestone: task?.milestone ?? '—',
      passed: record.exit_code === 0,
    };
  });

  const totalTasks = Object.keys(plan.tasks).length;
  const doneTasks = state.completed_tasks.length;
  const failures = entries.filter((e) => !e.passed);

  const lines: string[] = [];

  lines.push('# Nhật Ký Tiến Độ (Progress Log)');
  lines.push('');
  lines.push('## Tại sao cần file này');
  lines.push(
    'File này tự sinh từ bằng chứng (evidence) mà engine ghi lại mỗi lần một task được ' +
      'kiểm chứng — không ai viết tay, nên không nói dối được. Nó trả lời câu hỏi mà bạn ' +
      '(hoặc người vào dự án sau) sẽ hỏi khi quay lại sau vài tuần: đã làm được tới đâu, ' +
      'hôm đó chạy lệnh gì để chứng minh nó chạy thật, và đã vấp ở chỗ nào. ' +
      '`09-execution-plan.md` nói **sẽ** làm gì; file này ghi **đã** làm gì.'
  );
  lines.push('');

  lines.push('## Tóm Tắt');
  lines.push('');
  lines.push('| Chỉ số | Giá trị |');
  lines.push('|---|---|');
  lines.push(`| Trạng thái hiện tại | \`${state.phase}\` |`);
  lines.push(`| Task đã xong | ${doneTasks}/${totalTasks} |`);
  lines.push(`| Milestone đã review xong | ${state.reviewed_milestones.length > 0 ? state.reviewed_milestones.join(', ') : '—'} |`);
  lines.push(`| Lần kiểm chứng đã chạy | ${entries.length} |`);
  lines.push(`| Số lần vấp (verify fail) | ${failures.length} |`);
  lines.push(`| Task đang mở | ${state.active_task ?? '—'} |`);
  if (state.block_reason) {
    lines.push(`| Đang bị chặn vì | ${state.block_reason} |`);
  }
  lines.push(`| Cập nhật lúc | ${state.updated_at} |`);
  lines.push('');

  lines.push('## Dòng Thời Gian');
  lines.push('');
  if (entries.length === 0) {
    lines.push('Chưa có lần kiểm chứng nào. Chạy task đầu tiên trong `09-execution-plan.md` để bắt đầu.');
    lines.push('');
  } else {
    lines.push('> Giờ ghi theo UTC, đúng như lúc engine bắt được bằng chứng.');
    lines.push('');

    // Nhóm theo ngày, giữ nguyên thứ tự evidence được ghi (đã là thứ tự thời gian).
    const byDate = new Map<string, LogEntry[]>();
    for (const entry of entries) {
      const day = datePart(entry.record.captured_at);
      const bucket = byDate.get(day);
      if (bucket) {
        bucket.push(entry);
      } else {
        byDate.set(day, [entry]);
      }
    }

    for (const [day, dayEntries] of byDate) {
      lines.push(`### ${day}`);
      lines.push('');
      for (const entry of dayEntries) {
        const { record } = entry;
        const mark = entry.passed ? 'PASS' : `FAIL (exit ${record.exit_code})`;
        lines.push(
          `- **${timePart(record.captured_at)} — \`${record.task_id}\`** (${entry.milestone}): ${entry.taskIntent}`
        );
        lines.push(
          `  - \`${record.argv.join(' ')}\` → **${mark}** · log: [\`${record.command_id}.stdout.log\`](${evidenceLogPath(record)})`
        );
        const artifacts = Object.keys(record.artifact_digests);
        if (artifacts.length > 0) {
          lines.push(`  - Sản phẩm đã băm để chống sửa trộm: ${artifacts.map((a) => `\`${a}\``).join(', ')}`);
        }
      }
      lines.push('');
    }
  }

  lines.push('## Những Lần Vấp');
  lines.push('');
  if (failures.length === 0) {
    lines.push('Chưa có lần verify nào fail. (Không có nghĩa là code không có lỗi — chỉ nghĩa là mọi lệnh kiểm chứng đã khai báo đều pass.)');
  } else {
    lines.push(
      'Mỗi dòng dưới đây là một lần lệnh kiểm chứng không đạt. Vấp không phải thất bại — ' +
        'đây là chỗ đắt nhất để học, và là thứ người vào dự án sau cần biết để không giẫm lại.'
    );
    lines.push('');
    lines.push('| Lúc | Task | Lệnh | Exit | Log lỗi |');
    lines.push('|---|---|---|---|---|');
    for (const entry of failures) {
      const { record } = entry;
      const stderrPath = `.design-everything/evidence/${record.task_id}/${record.command_id}.stderr.log`;
      lines.push(
        `| ${datePart(record.captured_at)} ${timePart(record.captured_at)} | \`${record.task_id}\` | \`${record.argv.join(' ')}\` | ${record.exit_code} | [\`${record.command_id}.stderr.log\`](${stderrPath}) |`
      );
    }
  }
  lines.push('');

  lines.push('## Task Đã Xong');
  lines.push('');
  if (state.completed_tasks.length === 0) {
    lines.push('Chưa có task nào hoàn tất.');
  } else {
    for (const taskId of state.completed_tasks) {
      const task = plan.tasks[taskId];
      lines.push(`- \`${taskId}\` — ${task?.intent ?? '(không còn trong plan hiện tại)'}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}
