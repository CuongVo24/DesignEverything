import { test, expect, describe } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadDerivedRecipes } from './loadDerivedRecipes.js';
import { runDerivedRecipe } from './runDerivedRecipe.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');
const recipesPath = join(projectRoot, 'Design/Content/interview-script/derived-recipes.yaml');

const KNOWN_QUESTION_IDS = ['S3', 'S4', 'S5', 'S6', 'S7', 'R1', 'S8'];

describe('P6 10.2 — runDerivedRecipe proves or flags provenance, never invents it', () => {
  const recipes = loadDerivedRecipes(recipesPath);
  const buildPlan = recipes.recipes.find((r) => r.id === 'build-plan')!;

  test('an item with enough valid source_refs and all required fields passes coverage', () => {
    const result = runDerivedRecipe(
      buildPlan,
      [{ task_id: 'T1', title: 'Setup CI', source_refs: ['S3'], tier: 1 }],
      KNOWN_QUESTION_IDS
    );
    expect(result.all_pass).toBe(true);
    expect(result.item_results[0]).toMatchObject({ coverage: 'pass' });
  });

  test('an item with no source_refs and no explicit unknown marker is flagged, not silently passed', () => {
    const result = runDerivedRecipe(
      buildPlan,
      [{ task_id: 'T1', title: 'Setup CI', source_refs: [], tier: 1 }],
      KNOWN_QUESTION_IDS
    );
    expect(result.all_pass).toBe(false);
    expect(result.item_results[0]).toMatchObject({ coverage: 'flag', reason: 'MISSING_SOURCE_REF' });
  });

  test('an item that explicitly carries the recipe fallback text is compliant, not a failure', () => {
    const result = runDerivedRecipe(
      buildPlan,
      [{ task_id: 'T1', title: '> ⚠ unknown — cần hỏi người', source_refs: [], tier: 1 }],
      KNOWN_QUESTION_IDS
    );
    expect(result.all_pass).toBe(true);
    expect(result.item_results[0]).toMatchObject({ coverage: 'pass' });
  });

  test('a missing required_fields entry is flagged before source_refs are even checked', () => {
    const result = runDerivedRecipe(
      buildPlan,
      [{ task_id: 'T1', tier: 1, source_refs: ['S3'] }], // no title
      KNOWN_QUESTION_IDS
    );
    expect(result.all_pass).toBe(false);
    expect(result.item_results[0]).toMatchObject({
      coverage: 'flag',
      reason: 'MISSING_REQUIRED_FIELD',
      missing_fields: ['title'],
    });
  });

  test('a bogus ref is flagged when the recipe only allows question_id sources (architecture-rationale)', () => {
    // build-plan allows both question_id and doc_id, so any non-question-id
    // string is accepted as a plausible doc reference (see isValidRef's doc
    // comment) — this recipe allows question_id only, so a fabricated id is
    // the one case this minimal executor can actually catch without a
    // compiled doc catalog.
    const archRecipe = recipes.recipes.find((r) => r.id === 'architecture-rationale')!;
    const result = runDerivedRecipe(
      archRecipe,
      [{ decision: 'Dùng PostgreSQL', rationale: 'Cần transaction mạnh', source_refs: ['S99-does-not-exist'] }],
      KNOWN_QUESTION_IDS
    );
    expect(result.all_pass).toBe(false);
    expect(result.item_results[0]).toMatchObject({
      coverage: 'flag',
      reason: 'INVALID_SOURCE_REF_KIND',
      invalid_refs: ['S99-does-not-exist'],
    });

    const validResult = runDerivedRecipe(
      archRecipe,
      [{ decision: 'Dùng PostgreSQL', rationale: 'Cần transaction mạnh', source_refs: ['S8'] }],
      KNOWN_QUESTION_IDS
    );
    expect(validResult.all_pass).toBe(true);
  });

  test('enum_fields violation is flagged (execution-plan-risk-classification recipe)', () => {
    const riskRecipe = recipes.recipes.find((r) => r.id === 'execution-plan-risk-classification')!;
    const result = runDerivedRecipe(
      riskRecipe,
      [{ risk: 'Vendor lock-in', classification: 'definitely-true', source_refs: ['R1'] }],
      [...KNOWN_QUESTION_IDS, 'R1']
    );
    expect(result.all_pass).toBe(false);
    expect(result.item_results[0]).toMatchObject({ coverage: 'flag', reason: 'ENUM_FIELD_VIOLATION' });

    const validResult = runDerivedRecipe(
      riskRecipe,
      [{ risk: 'Vendor lock-in', classification: 'assumption', source_refs: ['R1'] }],
      [...KNOWN_QUESTION_IDS, 'R1']
    );
    expect(validResult.all_pass).toBe(true);
  });

  test('an object-shaped recipe (mermaid-flow-diagram) checks top-level required_fields, not item.required_fields', () => {
    const mermaidRecipe = recipes.recipes.find((r) => r.id === 'mermaid-flow-diagram')!;
    const result = runDerivedRecipe(
      mermaidRecipe,
      [{ mermaid_source: 'graph TD; A-->B', node_source_map: {}, source_refs: ['S5'] }],
      [...KNOWN_QUESTION_IDS, 'S5']
    );
    expect(result.all_pass).toBe(true);
  });
});
