import { test, expect, describe } from 'vitest';
import {
  synthesizeFeatureContracts,
  compileContractToTaskCard,
  validateContract,
  reviewFeatureOutput,
  initExecutionState,
  transitionToReview,
  applyReviewOutcome,
  closeFeatureReview,
  ProjectProfile,
  ProjectConventions,
  ExecutionState,
} from '../../src/core/index.js';

/**
 * B18a — Feature-journey replay (mock-free, deterministic).
 *
 * Đây là BẰNG CHỨNG MÁY THẬT cho cơ chế chặng-sau-M0: một feature Must đi trọn
 * vòng synth → compile → validate → review(sạch/bẩn) → feature-done. KHÔNG phải
 * pilot người dùng (pilot người thật xem v5-feature-pilot-protocol.md — chưa chạy).
 */
describe('B18a feature-journey replay (small vs medium scale)', () => {
  const profile: ProjectProfile = {
    workspace_kind: 'empty',
    target: 'node-cli',
    runtime: 'node',
    package_manager: 'npm',
    framework: 'none',
    language: 'typescript',
    source_root: 'src',
    manifest_paths: ['package.json'],
    capabilities: ['node-npm-project'],
    confirmation: { confirmed: true },
    evidence: [],
  };

  const conventions: ProjectConventions = {
    allowed_paths: ['package.json', 'tsconfig.json', 'src/**/*.ts', 'test/**/*.ts'],
    allowed_dependencies: [],
    tech_stack: { target: 'node-cli', language: 'typescript', runtime: 'node' },
  };

  const verification = [
    { id: 'test', argv: ['npm', 'test'], expected: { kind: 'exit-code-zero' as const } },
  ];

  function runScale(name: string, dataModelDoc: string, must: string) {
    const contracts = synthesizeFeatureContracts({
      answers: { must_have_scope: must, wont_for_mvp_scope: 'none' },
      profile,
      docs: [
        { file: '03-data-model.md', content: dataModelDoc },
        { file: '04-flows.md', content: '## Luồng Điển Hình\nmở -> xem -> lưu' },
      ],
      conventionsRef: 'docs/conventions/tech-stack.md',
    });
    return { name, contracts };
  }

  test('mọi hợp đồng sinh ra hợp lệ theo Conventions và compile được sang TaskCard', () => {
    const small = runScale('small', '## Thực Thể Chính\nNote', 'Note');
    const medium = runScale(
      'medium',
      '## Thực Thể Chính\nRecipe, RecipeItem, RecipeTag, RecipeStep',
      'Recipe'
    );

    // Quy mô lớn hơn → nhiều hợp đồng hơn (D42).
    expect(medium.contracts.length).toBeGreaterThan(small.contracts.length);

    for (const { contracts } of [small, medium]) {
      for (const c of contracts) {
        const res = validateContract(c, conventions);
        expect(res.pass, `${c.id}: ${res.errors.join(', ')}`).toBe(true);
        const card = compileContractToTaskCard(c);
        expect(card.allowed_paths.length).toBeGreaterThan(0);
        expect(card.commands.length).toBeGreaterThan(0);
      }
    }
  });

  test('review sạch → feature-done; review bẩn → break-task fail-closed rồi đóng', () => {
    const { contracts } = runScale('medium', '## Thực Thể Chính\nRecipe', 'Recipe');
    const milestone = contracts[0].feature_milestone;
    const completed = contracts.map((c) => c.id);

    const plan = {
      milestones: [{ id: milestone, title: 'F', tasks: completed }],
      tasks: Object.fromEntries(contracts.map((c) => [c.id, compileContractToTaskCard(c)])),
    };
    const base: ExecutionState = {
      ...initExecutionState(),
      phase: 'ready-to-execute',
      completed_tasks: completed,
    };

    // Nhánh sạch
    const cleanReview = reviewFeatureOutput({
      featureMilestone: milestone,
      changedPaths: contracts[0].interfaces.map((i) => i.path),
      lint: { ok: true, issues: [] },
      test: { ok: true, issues: [] },
      verification,
      conventionsRef: 'docs/conventions/tech-stack.md',
    });
    expect(cleanReview).toEqual([]);
    const doneClean = applyReviewOutcome(transitionToReview(base, milestone, plan), milestone, []);
    expect(doneClean.reviewed_milestones).toContain(milestone);

    // Nhánh bẩn
    const dirtyBreaks = reviewFeatureOutput({
      featureMilestone: milestone,
      changedPaths: contracts[0].interfaces.map((i) => i.path),
      lint: { ok: false, issues: ['unused import'] },
      test: { ok: false, issues: ['edge case fails'] },
      verification,
      conventionsRef: 'docs/conventions/tech-stack.md',
    });
    expect(dirtyBreaks.length).toBe(2);
    const reviewing = applyReviewOutcome(
      transitionToReview(base, milestone, plan),
      milestone,
      dirtyBreaks.map((b) => b.id)
    );
    expect(reviewing.phase).toBe('reviewing');
    // Fail-closed: chưa xong break-task thì không đóng được.
    expect(() => closeFeatureReview(reviewing, milestone)).toThrow();
    // Xong break-task → đóng được.
    const resolved = {
      ...reviewing,
      completed_tasks: [...reviewing.completed_tasks, ...dirtyBreaks.map((b) => b.id)],
    };
    expect(closeFeatureReview(resolved, milestone).reviewed_milestones).toContain(milestone);
  });
});
