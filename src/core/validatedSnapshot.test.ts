import { expect, test, describe } from 'vitest';
import {
  calculatePlanDigest,
  calculateDocsDigest,
  assertValidatedSnapshot,
} from './validatedSnapshot.js';
import { initExecutionState } from './advanceExecutionState.js';

describe('validatedSnapshot checks', () => {
  const plan = {
    metadata: { version: '4.0.0' },
    tasks: {
      T1: { id: 'T1', commands: [] }
    }
  };

  const planAltOrder = {
    tasks: {
      T1: { commands: [], id: 'T1' }
    },
    metadata: { version: '4.0.0' }
  };

  const docs = [
    { file: '00-vision.md', content: 'hello' },
    { file: '01-personas.md', content: 'world' }
  ];

  test('should generate stable digests regardless of key order', () => {
    const d1 = calculatePlanDigest(plan);
    const d2 = calculatePlanDigest(planAltOrder);
    expect(d1).toBe(d2);
  });

  // Nhật ký/break-task là projection của state: chúng đổi mỗi lần verify. Nếu
  // lọt vào docs digest thì chính việc ghi nhật ký sẽ làm snapshot stale và
  // khóa cứng vòng thực thi ngay sau task đầu tiên.
  test('should ignore state projections (progress-log, break-tasks) in docs digest', () => {
    const base = calculateDocsDigest(docs);

    const withLog = calculateDocsDigest([
      ...docs,
      { file: 'progress-log.md', content: 'lần verify #1' },
    ]);
    expect(withLog).toBe(base);

    const withChangedLog = calculateDocsDigest([
      ...docs,
      { file: 'progress-log.md', content: 'lần verify #2 — nội dung đã khác' },
    ]);
    expect(withChangedLog).toBe(base);

    const withBreakTasks = calculateDocsDigest([
      ...docs,
      { file: 'break-tasks/M4-login.md', content: 'break task mới mở' },
    ]);
    expect(withBreakTasks).toBe(base);
  });

  test('should keep execution loop unblocked after a progress-log write', () => {
    const state = initExecutionState();
    state.validated_plan_digest = calculatePlanDigest(plan);
    state.validated_docs_digest = calculateDocsDigest(docs);

    // Mô phỏng: verify chạy xong và engine ghi lại docs/progress-log.md.
    const docsAfterVerify = [...docs, { file: 'progress-log.md', content: 'PASS T1 lúc 12:30' }];

    expect(() => {
      assertValidatedSnapshot({ docs: docsAfterVerify, plan, state });
    }).not.toThrow();
    expect(state.phase).not.toBe('blocked');
  });

  test('should pass assertValidatedSnapshot when digests match', () => {
    const state = initExecutionState();
    state.validated_plan_digest = calculatePlanDigest(plan);
    state.validated_docs_digest = calculateDocsDigest(docs);

    expect(() => {
      assertValidatedSnapshot({ docs, plan, state });
    }).not.toThrow();
  });

  test('should fail assertValidatedSnapshot and set state to blocked when plan digest mismatches', () => {
    const state = initExecutionState();
    state.validated_plan_digest = 'wrong-digest';
    state.validated_docs_digest = calculateDocsDigest(docs);

    expect(() => {
      assertValidatedSnapshot({ docs, plan, state });
    }).toThrow(/snapshot-stale/i);
    expect(state.phase).toBe('blocked');
    expect(state.block_reason).toContain('đã bị thay đổi');
  });

  test('should fail assertValidatedSnapshot and set state to blocked when docs digest mismatches', () => {
    const state = initExecutionState();
    state.validated_plan_digest = calculatePlanDigest(plan);
    state.validated_docs_digest = 'wrong-digest';

    expect(() => {
      assertValidatedSnapshot({ docs, plan, state });
    }).toThrow(/snapshot-stale/i);
    expect(state.phase).toBe('blocked');
  });
});
