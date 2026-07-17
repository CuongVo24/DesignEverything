import { expect, test, describe } from 'vitest';
import { parseDeadlineWeeks, planWeeklySchedule, renderWeeklySchedule } from './planWeeklySchedule.js';

describe('parseDeadlineWeeks', () => {
  test('đọc được deadline nói tường minh', () => {
    expect(parseDeadlineWeeks('Solo, 3 tuần, web')).toBe(3);
    expect(parseDeadlineWeeks('deadline 2 tháng, ngân sách free-tier')).toBe(8);
    expect(parseDeadlineWeeks('có 10 ngày thôi')).toBe(2);
    expect(parseDeadlineWeeks('làm trong ba tháng')).toBe(12);
    expect(parseDeadlineWeeks('hai tuần nữa phải xong')).toBe(2);
  });

  test('phủ định không bị đọc nhầm thành deadline', () => {
    expect(parseDeadlineWeeks('Solo, không deadline cứng, ưu tiên free-tier.')).toBeNull();
    expect(parseDeadlineWeeks('chưa có deadline')).toBeNull();
    expect(parseDeadlineWeeks('deadline mềm')).toBeNull();
  });

  test('mơ hồ thì trả null thay vì đoán', () => {
    expect(parseDeadlineWeeks('làm khi nào xong thì xong')).toBeNull();
    expect(parseDeadlineWeeks('')).toBeNull();
    expect(parseDeadlineWeeks('sớm nhất có thể')).toBeNull();
  });

  test('ưu tiên đơn vị tuần khi câu nhắc cả tuần và tháng', () => {
    expect(parseDeadlineWeeks('trong 6 tuần, tức khoảng 2 tháng')).toBe(6);
  });
});

describe('planWeeklySchedule', () => {
  const musts = ['M0 — Khung xương biết đi', 'Đăng nhập', 'Thêm sách', 'Xem danh sách'];

  test('không deadline → không sinh lịch', () => {
    const s = planWeeklySchedule({ timelineText: 'không deadline cứng', milestones: musts });
    expect(s.has_deadline).toBe(false);
    expect(s.rows).toHaveLength(0);
  });

  test('lịch rộng rãi: chia đều và chừa tuần đệm cuối', () => {
    const s = planWeeklySchedule({ timelineText: '9 tuần', milestones: musts });

    expect(s.has_deadline).toBe(true);
    expect(s.total_weeks).toBe(9);
    expect(s.warning).toBeNull();
    // 4 milestone + 1 dòng đệm
    expect(s.rows).toHaveLength(5);
    expect(s.rows[0].milestone).toBe('M0 — Khung xương biết đi');
    expect(s.rows[s.rows.length - 1].week).toBe('Tuần 9');
    expect(s.rows[s.rows.length - 1].milestone).toContain('Đệm');
  });

  test('dư tuần thì dồn cho milestone đầu (dựng nền luôn lâu hơn dự tính)', () => {
    // 8 tuần → 7 tuần dùng được cho 4 milestone: 2,2,2,1
    const s = planWeeklySchedule({ timelineText: '8 tuần', milestones: musts });
    expect(s.rows[0].week).toBe('Tuần 1–2');
    expect(s.rows[1].week).toBe('Tuần 3–4');
    expect(s.rows[2].week).toBe('Tuần 5–6');
    expect(s.rows[3].week).toBe('Tuần 7');
  });

  test('lịch không đủ chỗ → cảnh báo thẳng, không lặng lẽ nhồi', () => {
    const many = ['M0', 'A', 'B', 'C', 'D', 'E', 'F'];
    const s = planWeeklySchedule({ timelineText: '3 tuần', milestones: many });

    expect(s.has_deadline).toBe(true);
    expect(s.warning).toBeTruthy();
    expect(s.warning).toContain('cắt bớt Must');
    expect(s.warning).toContain('KHÔNG phải cam kết an toàn');
    // Vẫn xếp hết milestone, không nuốt mất cái nào.
    const scheduled = s.rows.filter((r) => !r.milestone.startsWith('Đệm'));
    expect(scheduled).toHaveLength(many.length);
  });

  test('deadline quá ngắn (dưới 3 tuần) thì không chừa đệm', () => {
    const s = planWeeklySchedule({ timelineText: '2 tuần', milestones: ['M0', 'A'] });
    expect(s.rows).toHaveLength(2);
    expect(s.rows.some((r) => r.milestone.startsWith('Đệm'))).toBe(false);
  });

  test('không có milestone thì không sinh lịch rỗng', () => {
    const s = planWeeklySchedule({ timelineText: '5 tuần', milestones: [] });
    expect(s.has_deadline).toBe(false);
    expect(s.rows).toHaveLength(0);
  });
});

describe('renderWeeklySchedule', () => {
  test('không deadline: giải thích vì sao không có lịch, chỉ đường bổ sung', () => {
    const md = renderWeeklySchedule(planWeeklySchedule({ timelineText: 'chưa có deadline', milestones: ['M0'] }));
    expect(md).toContain('thứ tự phụ thuộc');
    expect(md).toContain('06-constraints.md');
    expect(md).not.toContain('| Tuần |');
  });

  test('có deadline: render bảng tuần kèm nhắc đây là ước lượng', () => {
    const md = renderWeeklySchedule(
      planWeeklySchedule({ timelineText: '6 tuần', milestones: ['M0 — Khung xương', 'Đăng nhập'] })
    );
    expect(md).toContain('**6 tuần**');
    expect(md).toContain('| Tuần | Milestone |');
    expect(md).toContain('không phải cam kết');
    expect(md).toContain('Đăng nhập');
  });

  test('cảnh báo lịch chật được in nổi bật trong doc', () => {
    const md = renderWeeklySchedule(
      planWeeklySchedule({ timelineText: '2 tuần', milestones: ['M0', 'A', 'B', 'C', 'D'] })
    );
    expect(md).toContain('> **Cảnh báo:**');
  });
});
