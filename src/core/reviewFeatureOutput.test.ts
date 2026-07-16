import { test, expect, describe } from 'vitest';
import { reviewFeatureOutput, ReviewSignal } from './reviewFeatureOutput.js';
import {
  initExecutionState,
  transitionToReview,
  applyReviewOutcome,
  closeFeatureReview,
  assertNoUnreviewedFeature,
} from './advanceExecutionState.js';
import { ExecutionState } from './schemas/index.js';

const verification = [
  { id: 'test', argv: ['npm', 'test'], expected: { kind: 'exit-code-zero' as const } },
];

function baseSignal(overrides: Partial<ReviewSignal> = {}): ReviewSignal {
  return {
    featureMilestone: 'M4-search-recipe',
    changedPaths: ['src/services/search-recipe.ts'],
    lint: { ok: true, issues: [] },
    test: { ok: true, issues: [] },
    verification,
    conventionsRef: 'docs/conventions/tech-stack.md',
    ...overrides,
  };
}

describe('B17a reviewFeatureOutput', () => {
  test('output sạch → không sinh break-task', () => {
    expect(reviewFeatureOutput(baseSignal())).toEqual([]);
  });

  test('test fail → sinh fix; lint bẩn → sinh polish', () => {
    const tasks = reviewFeatureOutput(
      baseSignal({
        test: { ok: false, issues: ['search returns empty'] },
        lint: { ok: false, issues: ['unused var'] },
      })
    );
    expect(tasks.length).toBe(2);
    expect(tasks.some((t) => t.id.includes('-fix-'))).toBe(true);
    expect(tasks.some((t) => t.id.includes('-polish-'))).toBe(true);
    // break-task giới hạn allowed_paths đúng file feature đã đụng
    expect(tasks[0].interfaces[0].path).toBe('src/services/search-recipe.ts');
    expect(tasks[0].status).toBe('WAITING_FOR_APPROVAL');
  });
});

describe('B17a review state machine (fail-closed)', () => {
  function readyState(): ExecutionState {
    return {
      ...initExecutionState(),
      phase: 'ready-to-execute',
      completed_tasks: ['C-search-recipe-logic'],
    };
  }
  const plan = {
    milestones: [{ id: 'M4-search-recipe', title: 'F', tasks: ['C-search-recipe-logic'] }],
    tasks: { 'C-search-recipe-logic': {} },
  };

  test('review sạch → feature-done, milestone vào reviewed_milestones', () => {
    const reviewing = transitionToReview(readyState(), 'M4-search-recipe', plan);
    expect(reviewing.phase).toBe('reviewing');
    const done = applyReviewOutcome(reviewing, 'M4-search-recipe', []);
    expect(done.phase).toBe('ready-to-execute');
    expect(done.reviewed_milestones).toContain('M4-search-recipe');
  });

  test('có break-task → giữ reviewing, không thể đóng khi break-task chưa xong', () => {
    const reviewing = transitionToReview(readyState(), 'M4-search-recipe', plan);
    const withBreak = applyReviewOutcome(reviewing, 'M4-search-recipe', ['C-search-recipe-fix-failing-tests']);
    expect(withBreak.phase).toBe('reviewing');
    expect(withBreak.open_break_tasks).toContain('C-search-recipe-fix-failing-tests');
    // Fail-closed: đóng khi break-task chưa completed → throw
    expect(() => closeFeatureReview(withBreak, 'M4-search-recipe')).toThrow();
    // Sau khi break-task xong → đóng được
    const resolved = { ...withBreak, completed_tasks: [...withBreak.completed_tasks, 'C-search-recipe-fix-failing-tests'] };
    const closed = closeFeatureReview(resolved, 'M4-search-recipe');
    expect(closed.phase).toBe('ready-to-execute');
    expect(closed.reviewed_milestones).toContain('M4-search-recipe');
  });

  test('feature-done gate: chặn mở feature mới khi feature cũ chưa review', () => {
    const twoFeaturePlan = {
      milestones: [
        { id: 'M4-a', title: 'A', tasks: ['C-a-logic'] },
        { id: 'M4-b', title: 'B', tasks: ['C-b-logic'] },
      ],
      tasks: { 'C-a-logic': {}, 'C-b-logic': {} },
    };
    const state: ExecutionState = {
      ...initExecutionState(),
      phase: 'ready-to-execute',
      completed_tasks: ['C-a-logic'], // M4-a xong task build nhưng chưa review
      reviewed_milestones: [],
    };
    expect(() => assertNoUnreviewedFeature(state, 'M4-b', twoFeaturePlan)).toThrow();
    // Sau khi review M4-a → mở M4-b được
    const reviewed = { ...state, reviewed_milestones: ['M4-a'] };
    expect(() => assertNoUnreviewedFeature(reviewed, 'M4-b', twoFeaturePlan)).not.toThrow();
  });
});
