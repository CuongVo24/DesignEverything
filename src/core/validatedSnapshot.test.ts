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
