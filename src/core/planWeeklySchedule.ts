export interface WeeklyScheduleRow {
  /** Nhãn tuần người đọc được, VD 'Tuần 1' hoặc 'Tuần 2–3'. */
  week: string;
  milestone: string;
}

export interface WeeklySchedule {
  has_deadline: boolean;
  total_weeks: number | null;
  rows: WeeklyScheduleRow[];
  /** Deadline không đủ chỗ cho Must-list → cảnh báo thay vì lặng lẽ nhồi. */
  warning: string | null;
}

const WORD_NUMBERS: Record<string, number> = {
  một: 1,
  hai: 2,
  ba: 3,
  bốn: 4,
  năm: 5,
  sáu: 6,
  bảy: 7,
  tám: 8,
  chín: 9,
  mười: 10,
};

/** 'ba tháng' | '3 tháng' → 3 */
function readNumber(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase();
  const digits = trimmed.match(/^(\d+)$/);
  if (digits) return Number(digits[1]);
  return WORD_NUMBERS[trimmed] ?? null;
}

/**
 * Đọc deadline từ câu trả lời S6 (ngôn ngữ đời thường). Chỉ nhận khoảng thời
 * gian nói TƯỜNG MINH; mơ hồ thì trả null.
 *
 * Cố tình bảo thủ: đoán bừa một deadline rồi in ra thành lịch là tệ hơn không
 * có lịch — người mới sẽ tin con số mình vừa bịa. Đúng nguyên tắc "thà gắn cờ
 * nghi ngờ, không âm thầm bảo chứng".
 */
export function parseDeadlineWeeks(timelineText: string): number | null {
  const text = (timelineText || '').toLowerCase();
  if (!text.trim()) return null;

  // Phủ định đi trước: "không deadline cứng" có chứa chữ deadline nhưng nghĩa ngược.
  if (/(không|ko|chưa|chẳng)\s+(có\s+)?(deadline|hạn|thời hạn)/.test(text)) return null;
  if (/deadline\s+(mềm|linh hoạt|không cứng)/.test(text)) return null;

  const number = '(\\d+|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)';

  const weekMatch = text.match(new RegExp(`${number}\\s*tuần`));
  if (weekMatch) {
    const n = readNumber(weekMatch[1]);
    if (n && n > 0) return n;
  }

  const monthMatch = text.match(new RegExp(`${number}\\s*tháng`));
  if (monthMatch) {
    const n = readNumber(monthMatch[1]);
    // Quy ước 4 tuần/tháng — đủ dùng cho lịch MVP, không cần lịch dương thật.
    if (n && n > 0) return n * 4;
  }

  const dayMatch = text.match(new RegExp(`${number}\\s*ngày`));
  if (dayMatch) {
    const n = readNumber(dayMatch[1]);
    if (n && n > 0) return Math.max(1, Math.ceil(n / 7));
  }

  return null;
}

function weekLabel(start: number, end: number): string {
  return start === end ? `Tuần ${start}` : `Tuần ${start}–${end}`;
}

/**
 * Cắt danh sách milestone theo thứ tự phụ thuộc thành lịch tuần, dựa trên
 * deadline người dùng khai ở S6.
 *
 * Không có deadline → không sinh lịch (has_deadline=false). Thứ tự phụ thuộc
 * vẫn là nguồn sự thật; lịch chỉ là lớp phủ giúp giữ nhịp.
 */
export function planWeeklySchedule(input: {
  timelineText: string;
  milestones: string[];
}): WeeklySchedule {
  const totalWeeks = parseDeadlineWeeks(input.timelineText);
  const milestones = input.milestones.filter((m) => m.trim().length > 0);

  if (totalWeeks === null || milestones.length === 0) {
    return { has_deadline: false, total_weeks: totalWeeks, rows: [], warning: null };
  }

  // Tuần cuối để dành cho vá lỗi + phát hành. Lịch không chừa đệm là lịch trượt.
  const buffer = totalWeeks >= 3 ? 1 : 0;
  const available = totalWeeks - buffer;

  const rows: WeeklyScheduleRow[] = [];
  let warning: string | null = null;

  if (milestones.length > available) {
    // Deadline không đủ chỗ: nói thẳng thay vì nhồi cho vừa.
    warning =
      `Deadline khoảng ${totalWeeks} tuần nhưng có ${milestones.length} milestone bắt buộc — ` +
      `trung bình dưới một tuần cho mỗi milestone. Hoặc cắt bớt Must trong 02-scope.md ` +
      `xuống ${available} mục, hoặc chấp nhận lùi hạn. Lịch dưới đây là phương án nhồi sát ` +
      `nhất có thể, KHÔNG phải cam kết an toàn.`;

    for (let i = 0; i < milestones.length; i++) {
      const week = Math.min(available, Math.floor((i * available) / milestones.length) + 1);
      rows.push({ week: weekLabel(week, week), milestone: milestones[i] });
    }
  } else {
    // Chia đều; dư thì dồn cho các milestone ĐẦU — dựng môi trường và khung
    // xương luôn ngốn hơn dự tính, còn milestone sau đã có đà.
    const base = Math.floor(available / milestones.length);
    const extra = available % milestones.length;

    let cursor = 1;
    for (let i = 0; i < milestones.length; i++) {
      const span = base + (i < extra ? 1 : 0);
      const start = cursor;
      const end = cursor + span - 1;
      rows.push({ week: weekLabel(start, end), milestone: milestones[i] });
      cursor = end + 1;
    }
  }

  if (buffer > 0) {
    rows.push({
      week: weekLabel(totalWeeks, totalWeeks),
      milestone: 'Đệm: sửa lỗi còn lại, chạy lại flow chính, chuẩn bị phát hành.',
    });
  }

  return { has_deadline: true, total_weeks: totalWeeks, rows, warning };
}

/** Bảng markdown cho mục "Lịch Theo Tuần" của 08-build-plan.md. */
export function renderWeeklySchedule(schedule: WeeklySchedule): string {
  if (!schedule.has_deadline) {
    return (
      'Bạn chưa khai một deadline cụ thể ở `06-constraints.md`, nên kế hoạch này đi theo ' +
      '**thứ tự phụ thuộc** chứ không theo lịch: làm xong milestone trước rồi mới sang milestone sau. ' +
      'Khi nào có hạn thật, cập nhật ràng buộc thời gian rồi chạy lại `emit` để engine cắt lịch tuần.'
    );
  }

  const lines: string[] = [];
  lines.push(
    `Deadline bạn khai ở \`06-constraints.md\` quy ra khoảng **${schedule.total_weeks} tuần**. ` +
      'Lịch dưới đây là ước lượng để giữ nhịp, không phải cam kết — thứ tự phụ thuộc mới là ' +
      'nguồn sự thật. Trượt một tuần thì dồn lịch, đừng bỏ Done-when.'
  );
  lines.push('');

  if (schedule.warning) {
    lines.push(`> **Cảnh báo:** ${schedule.warning}`);
    lines.push('');
  }

  lines.push('| Tuần | Milestone |');
  lines.push('|---|---|');
  for (const row of schedule.rows) {
    lines.push(`| ${row.week} | ${row.milestone} |`);
  }

  return lines.join('\n');
}
