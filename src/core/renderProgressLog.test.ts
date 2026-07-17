import { expect, test, describe } from 'vitest';
import { renderProgressLog } from './renderProgressLog.js';
import { initExecutionState } from './advanceExecutionState.js';
import { ExecutionPlanV3 } from './schemas/executionPlan.js';
import { ExecutionState, EvidenceRecord } from './schemas/index.js';

const plan: ExecutionPlanV3 = {
  metadata: { version: '4.0.0', updated_at: '2026-07-17T00:00:00.000Z' },
  trace_links: [],
  risks: [],
  milestones: [
    { id: 'M0-discovery', title: 'Discovery', tasks: ['T0-discovery'] },
    { id: 'M1-scaffold', title: 'Scaffold', tasks: ['T1-scaffold'] },
  ],
  tasks: {
    'T0-discovery': {
      id: 'T0-discovery',
      type: 'spike',
      milestone: 'M0-discovery',
      intent: 'Kiểm tra runtime Node và package manager.',
      depends_on: [],
      allowed_paths: [],
      preconditions: [],
      commands: [{ id: 'cmd-node', argv: ['node', '--version'], expected: { kind: 'exit-code-zero' } }],
      expected_result: 'pass',
      evidence_required: ['cmd-node'],
      failure_policy: 'debug',
      requires_capability: null,
    },
    'T1-scaffold': {
      id: 'T1-scaffold',
      type: 'scaffold',
      milestone: 'M1-scaffold',
      intent: 'Khởi tạo manifest dự án.',
      depends_on: ['T0-discovery'],
      allowed_paths: ['package.json'],
      preconditions: [],
      commands: [{ id: 'cmd-init', argv: ['npm', 'init', '-y'], expected: { kind: 'file-exists', value: 'package.json' } }],
      expected_result: 'pass',
      evidence_required: ['package.json'],
      failure_policy: 'debug',
      requires_capability: null,
    },
  },
  capabilities_evidence: [],
  discovery_status: 'pass',
};

function evidence(over: Partial<EvidenceRecord>): EvidenceRecord {
  return {
    task_id: 'T0-discovery',
    command_id: 'cmd-node',
    argv: ['node', '--version'],
    cwd: null,
    exit_code: 0,
    stdout_sha256: 'a'.repeat(64),
    stderr_sha256: 'b'.repeat(64),
    artifact_digests: {},
    captured_at: '2026-07-17T12:30:05.000Z',
    source: 'runner',
    ...over,
  };
}

function stateWith(over: Partial<ExecutionState>): ExecutionState {
  return { ...initExecutionState(), ...over };
}

describe('renderProgressLog', () => {
  test('trạng thái trống: nói rõ chưa có gì thay vì bịa tiến độ', () => {
    const md = renderProgressLog({ plan, state: stateWith({}) });

    expect(md).toContain('# Nhật Ký Tiến Độ');
    expect(md).toContain('## Tại sao cần file này');
    expect(md).toContain('Chưa có lần kiểm chứng nào');
    expect(md).toContain('| Task đã xong | 0/2 |');
    expect(md).toContain('Chưa có task nào hoàn tất.');
  });

  test('ghi lại lần verify pass kèm đường dẫn log và intent của task', () => {
    const state = stateWith({
      phase: 'ready-to-execute',
      completed_tasks: ['T0-discovery'],
      evidence: [evidence({})],
    });

    const md = renderProgressLog({ plan, state });

    expect(md).toContain('### 2026-07-17');
    expect(md).toContain('12:30');
    expect(md).toContain('T0-discovery');
    expect(md).toContain('Kiểm tra runtime Node và package manager.');
    expect(md).toContain('M0-discovery');
    expect(md).toContain('`node --version` → **PASS**');
    expect(md).toContain('.design-everything/evidence/T0-discovery/cmd-node.stdout.log');
    expect(md).toContain('| Task đã xong | 1/2 |');
    expect(md).toContain('| Số lần vấp (verify fail) | 0 |');
  });

  test('lần fail xuất hiện ở Những Lần Vấp kèm exit code và log stderr', () => {
    const state = stateWith({
      phase: 'repairing',
      active_task: 'T1-scaffold',
      block_reason: 'Task verification command failed with exit code 1.',
      evidence: [
        evidence({}),
        evidence({
          task_id: 'T1-scaffold',
          command_id: 'cmd-init',
          argv: ['npm', 'init', '-y'],
          exit_code: 1,
          captured_at: '2026-07-18T09:15:00.000Z',
        }),
      ],
    });

    const md = renderProgressLog({ plan, state });

    expect(md).toContain('| Số lần vấp (verify fail) | 1 |');
    expect(md).toContain('**FAIL (exit 1)**');
    expect(md).toContain('.design-everything/evidence/T1-scaffold/cmd-init.stderr.log');
    expect(md).toContain('| Đang bị chặn vì | Task verification command failed with exit code 1. |');
    // Lần pass không bị lôi vào bảng vấp.
    expect(md).not.toContain('| 2026-07-17 12:30 | `T0-discovery` |');
  });

  test('gom evidence theo ngày, mỗi ngày một mục', () => {
    const state = stateWith({
      evidence: [
        evidence({ captured_at: '2026-07-17T12:30:00.000Z' }),
        evidence({ command_id: 'cmd-node-2', captured_at: '2026-07-17T14:00:00.000Z' }),
        evidence({ task_id: 'T1-scaffold', command_id: 'cmd-init', captured_at: '2026-07-18T09:15:00.000Z' }),
      ],
    });

    const md = renderProgressLog({ plan, state });

    expect(md.match(/### 2026-07-17/g)).toHaveLength(1);
    expect(md.match(/### 2026-07-18/g)).toHaveLength(1);
    expect(md.indexOf('### 2026-07-17')).toBeLessThan(md.indexOf('### 2026-07-18'));
  });

  test('artifact digest được nêu tên; task lạ không làm vỡ render', () => {
    const state = stateWith({
      completed_tasks: ['T-ghost'],
      evidence: [
        evidence({
          task_id: 'T-ghost',
          artifact_digests: { 'package.json': 'c'.repeat(64) },
        }),
      ],
    });

    const md = renderProgressLog({ plan, state });

    expect(md).toContain('`package.json`');
    expect(md).toContain('(task không còn trong plan hiện tại)');
    expect(md).toContain('(không còn trong plan hiện tại)');
  });

  test('là projection thuần — render hai lần cho kết quả giống hệt', () => {
    const state = stateWith({ evidence: [evidence({})], completed_tasks: ['T0-discovery'] });

    expect(renderProgressLog({ plan, state })).toBe(renderProgressLog({ plan, state }));
  });
});
