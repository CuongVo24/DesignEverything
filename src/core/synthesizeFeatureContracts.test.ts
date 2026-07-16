import { test, expect, describe } from 'vitest';
import { parseDataModel } from './parseDataModel.js';
import { parseFlows } from './parseFlows.js';
import { synthesizeFeatureContracts } from './synthesizeFeatureContracts.js';
import { synthesizeExecutionPlan } from './synthesizeExecutionPlan.js';
import { validateExecutionPlan } from './validatePlan.js';
import { ProjectProfile, ExecutionState } from './schemas/index.js';

describe('B16b Feature Contract Synthesis & Validators', () => {
  const dataModelDoc = `
## Thực Thể Chính
User, Recipe, ShoppingList

## Quan Hệ Giữa Các Thực Thể
User has many Recipes
`;

  const flowsDoc = `
## Luồng Điển Hình
Mở terminal -> gõ lệnh search -> xem công thức -> xuất file
`;

  const mockProfile: ProjectProfile = {
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

  const answers = {
    user_vision: 'App to manage recipes',
    S3: 'Must: Search recipe, View shopping list. Won\'t: Social share.',
    user_flow: 'Mở terminal -> gõ lệnh search',
  };

  test('parseDataModel should extract entities and relations', () => {
    const res = parseDataModel(dataModelDoc);
    expect(res.entities).toContain('User');
    expect(res.entities).toContain('Recipe');
    expect(res.entities).toContain('ShoppingList');
    expect(res.relations).toContain('User has many Recipes');
  });

  test('parseFlows should extract steps', () => {
    const res = parseFlows(flowsDoc);
    expect(res.length).toBe(1);
    expect(res[0].steps).toContain('Mở terminal');
    expect(res[0].steps).toContain('gõ lệnh search');
  });

  test('synthesizeFeatureContracts should generate contracts based on weight', () => {
    const docs = [
      { file: '03-data-model.md', content: dataModelDoc },
      { file: '04-flows.md', content: flowsDoc },
    ];

    const contracts = synthesizeFeatureContracts({
      answers,
      profile: mockProfile,
      docs,
      conventionsRef: 'docs/conventions/tech-stack.md',
    });

    // We have musts: "Search recipe" and "View shopping list"
    // "Search recipe" matches entity "Recipe" and flow step "gõ lệnh search" -> weight = 3
    // So "Search recipe" should produce 3 contracts: logic, data, surface
    const searchContracts = contracts.filter((c) => c.derived_from.must_id.includes('Search recipe'));
    expect(searchContracts.length).toBeGreaterThanOrEqual(1);

    // Won't-have features like "Social share" should NOT produce any contracts
    const wontContracts = contracts.filter((c) => c.derived_from.must_id.includes('Social share'));
    expect(wontContracts.length).toBe(0);
  });

  test('auto-split (D42) triggers for a high-complexity feature', () => {
    // Must "Recipe" khớp nhiều entity (Recipe/RecipeItem/RecipeTag) và bước flow
    // → est_lines vượt ~200 → hợp đồng bị tách -a/-b.
    const richModel = `
## Thực Thể Chính
Recipe, RecipeItem, RecipeTag, RecipeStep
`;
    const richFlows = `
## Luồng Điển Hình
mở recipe -> sửa recipe -> lưu recipe -> xuất recipe
`;
    const contracts = synthesizeFeatureContracts({
      answers: { must_have_scope: 'Recipe', wont_for_mvp_scope: 'none' },
      profile: mockProfile,
      docs: [
        { file: '03-data-model.md', content: richModel },
        { file: '04-flows.md', content: richFlows },
      ],
      conventionsRef: 'docs/conventions/tech-stack.md',
    });

    // Có ít nhất một cặp hợp đồng bị tách (-a và -b) khi vượt ngưỡng.
    const splitA = contracts.filter((c) => c.id.endsWith('-a'));
    const splitB = contracts.filter((c) => c.id.endsWith('-b'));
    expect(splitA.length).toBeGreaterThan(0);
    expect(splitB.length).toBe(splitA.length);
    // Mỗi mảnh sau tách phải nhỏ hơn ngưỡng.
    for (const c of [...splitA, ...splitB]) {
      expect(c.interfaces[0].est_lines).toBeLessThanOrEqual(200);
    }
  });

  test('synthesizeExecutionPlan JIT behavior', () => {
    const docs = [
      { file: '03-data-model.md', content: dataModelDoc },
      { file: '04-flows.md', content: flowsDoc },
    ];

    // Case 1: T3-verify NOT completed -> only skeleton tasks in plan
    const res1 = synthesizeExecutionPlan({
      answers,
      profile: mockProfile,
      docs,
    });
    expect(res1.blocked).toBe(false);
    expect(Object.keys(res1.plan.tasks)).toEqual(['T0-discovery', 'T1-scaffold', 'T2-skeleton', 'T3-verify']);

    // Case 2: T3-verify IS completed -> JIT adds the first Must feature contracts
    const executionState: ExecutionState = {
      version: '6.0.0',
      phase: 'ready-to-execute',
      active_task: null,
      active_milestone: null,
      completed_tasks: ['T0-discovery', 'T1-scaffold', 'T2-skeleton', 'T3-verify'],
      evidence: [],
      block_reason: null,
      validated_plan_digest: '',
      validated_docs_digest: '',
      validation_result_digest: '',
      plan_revision: 1,
      amendment_history: [],
      open_break_tasks: [],
      reviewed_milestones: [],
      updated_at: new Date().toISOString(),
    };

    const res2 = synthesizeExecutionPlan({
      answers,
      profile: mockProfile,
      docs,
      executionState,
    });

    expect(res2.blocked).toBe(false);
    const taskIds = Object.keys(res2.plan.tasks);
    // Should contain T0-T3 AND some feature tasks starting with C-
    expect(taskIds).toContain('T3-verify');
    expect(taskIds.some((id) => id.startsWith('C-'))).toBe(true);

    // Verify JIT: only the first Must feature milestone is synthesized
    const milestones = res2.plan.milestones.map((m) => m.id);
    expect(milestones).toContain('M4-search-recipe');
    // The second Must feature ("View shopping list") milestone should NOT be in the plan yet (JIT)
    expect(milestones).not.toContain('M4-view-shopping-list');
  });

  test('validateExecutionPlan rejects trace-link mapping of Must features to skeleton when feature tasks exist', () => {
    const validPlan = {
      metadata: {
        version: '3.0.0',
        updated_at: new Date().toISOString(),
      },
      trace_links: [
        {
          must_id: 'Search recipe',
          flow_id: 'typical-flow',
          task_ids: ['C-search-recipe-logic'],
        },
      ],
      risks: [],
      milestones: [
        { id: 'M4-search-recipe', title: 'Feature', tasks: ['C-search-recipe-logic'] },
      ],
      tasks: {
        'C-search-recipe-logic': {
          id: 'C-search-recipe-logic',
          type: 'implementation',
          milestone: 'M4-search-recipe',
          intent: 'Search recipe logic',
          depends_on: [],
          allowed_paths: ['src/services/search-recipe.ts'],
          preconditions: [],
          commands: [
            { id: 'test-search', argv: ['npm', 'test'], expected: { kind: 'exit-code-zero' } }
          ],
          expected_result: 'Done',
          evidence_required: [],
          failure_policy: 'fail-closed',
        },
      },
      capabilities_evidence: [],
      discovery_status: 'pass' as const,
    };

    // This should pass
    const res1 = validateExecutionPlan({
      answers,
      emitted_docs: [],
      shape: 'node-cli',
      execution_plan: validPlan,
    });
    expect(res1.issues.some((issue) => issue.message.includes('map về skeleton task'))).toBe(false);

    // If we map Search recipe to T0-discovery (skeleton) while feature tasks exist
    const invalidPlan = {
      ...validPlan,
      trace_links: [
        {
          must_id: 'Search recipe',
          flow_id: 'typical-flow',
          task_ids: ['T0-discovery', 'C-search-recipe-logic'], // mixed skeleton and feature
        },
      ],
    };

    const res2 = validateExecutionPlan({
      answers,
      emitted_docs: [],
      shape: 'node-cli',
      execution_plan: invalidPlan,
    });
    expect(res2.issues.some((issue) => issue.message.includes('map về skeleton task'))).toBe(true);
  });
});
