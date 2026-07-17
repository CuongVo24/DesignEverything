import { expect, test, describe } from 'vitest';
import { renderBreakTaskDoc, renderBreakTaskIndex, breakTaskFileName } from './renderBreakTasks.js';
import { initExecutionState } from './advanceExecutionState.js';
import { Contract, ExecutionState } from './schemas/index.js';

function breakTask(over: Partial<Contract> = {}): Contract {
  return {
    id: 'C-login-fix-failing-tests',
    feature_milestone: 'M4-login',
    layer: 'app',
    micro_task: 'Sửa test fail của feature login: auth.test.ts > rejects bad password',
    scope: { in: ['src/auth/login.ts'], out: [] },
    checklist: ['Test pass: auth.test.ts > rejects bad password'],
    interfaces: [{ path: 'src/auth/login.ts', change: 'MODIFY', signature: null, est_lines: 40 }],
    risks: [],
    verification: [{ id: 'cmd-test', argv: ['npm', 'test'], expected: { kind: 'exit-code-zero' } }],
    status: 'WAITING_FOR_APPROVAL',
    conventions_ref: 'docs/conventions/',
    derived_from: { must_id: 'M4-login', entity_ids: [], flow_id: null },
    ...over,
  };
}

function stateWith(over: Partial<ExecutionState> = {}): ExecutionState {
  return { ...initExecutionState(), ...over };
}

describe('renderBreakTaskDoc', () => {
  test('review sạch: nói rõ không có break-task, feature được đóng', () => {
    const md = renderBreakTaskDoc({
      featureMilestone: 'M4-login',
      breakTasks: [],
      state: stateWith({ reviewed_milestones: ['M4-login'] }),
      today: '2026-07-17',
    });

    expect(md).toContain('# Break-task — M4-login');
    expect(md).toContain('## Tại sao cần file này');
    expect(md).toContain('đều sạch');
    expect(md).toContain('Review chạy ngày 2026-07-17');
  });

  test('break-task còn mở hiện rõ trạng thái và feature chưa được coi là xong', () => {
    const md = renderBreakTaskDoc({
      featureMilestone: 'M4-login',
      breakTasks: [breakTask()],
      state: stateWith({ open_break_tasks: ['C-login-fix-failing-tests'] }),
      today: '2026-07-17',
    });

    expect(md).toContain('| Break-task sinh ra | 1 |');
    expect(md).toContain('| Còn mở | 1 |');
    expect(md).toContain('CHƯA — còn nợ break-task');
    expect(md).toContain('### [CÒN MỞ] `C-login-fix-failing-tests` (fix)');
    expect(md).toContain('- [ ] Test pass: auth.test.ts > rejects bad password');
  });

  test('break-task đã xong thì tick checklist và đổi nhãn', () => {
    const md = renderBreakTaskDoc({
      featureMilestone: 'M4-login',
      breakTasks: [breakTask()],
      state: stateWith({
        completed_tasks: ['C-login-fix-failing-tests'],
        reviewed_milestones: ['M4-login'],
      }),
      today: '2026-07-17',
    });

    expect(md).toContain('### [ĐÃ XONG] `C-login-fix-failing-tests` (fix)');
    expect(md).toContain('- [x] Test pass');
    expect(md).toContain('| Còn mở | 0 |');
    expect(md).toContain('| Feature đã đóng review chưa | Rồi |');
  });

  test('phân biệt fix và polish theo id', () => {
    const md = renderBreakTaskDoc({
      featureMilestone: 'M4-login',
      breakTasks: [
        breakTask(),
        breakTask({ id: 'C-login-polish-lint', micro_task: 'Dọn nợ kỹ thuật: unused import' }),
      ],
      state: stateWith({}),
      today: '2026-07-17',
    });

    expect(md).toContain('`C-login-fix-failing-tests` (fix)');
    expect(md).toContain('`C-login-polish-lint` (polish)');
    expect(md).toContain('| Break-task sinh ra | 2 |');
  });

  test('nêu rõ phạm vi file được sửa và lệnh kiểm chứng', () => {
    const md = renderBreakTaskDoc({
      featureMilestone: 'M4-login',
      breakTasks: [breakTask()],
      state: stateWith({}),
      today: '2026-07-17',
    });

    expect(md).toContain('**Chỉ được sửa trong:** `src/auth/login.ts`');
    expect(md).toContain('`npm test` (mong đợi: exit-code-zero)');
    expect(md).toContain('**Khóa quy ước:** `docs/conventions/`');
  });
});

describe('renderBreakTaskIndex', () => {
  test('chưa review feature nào', () => {
    const md = renderBreakTaskIndex({ entries: [] });
    expect(md).toContain('Chưa có feature nào được review.');
  });

  test('gom số nợ còn lại của toàn dự án', () => {
    const md = renderBreakTaskIndex({
      entries: [
        { featureMilestone: 'M4-login', file: 'M4-login.md', total: 2, open: 1 },
        { featureMilestone: 'M4-search', file: 'M4-search.md', total: 1, open: 0 },
      ],
    });

    expect(md).toContain('| M4-login | 2 | 1 | [`M4-login.md`](M4-login.md) |');
    expect(md).toContain('| M4-search | 1 | 0 |');
    expect(md).toContain('Còn **1** break-task mở');
  });

  test('sạch hết thì nói rõ không còn nợ', () => {
    const md = renderBreakTaskIndex({
      entries: [{ featureMilestone: 'M4-login', file: 'M4-login.md', total: 2, open: 0 }],
    });
    expect(md).toContain('Không còn break-task nào mở.');
  });
});

describe('breakTaskFileName', () => {
  test('tên file theo feature-milestone', () => {
    expect(breakTaskFileName('M4-login')).toBe('M4-login.md');
  });
});
