import { test, expect, describe } from 'vitest';
import { writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadDerivedRecipes } from './loadDerivedRecipes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');

describe('P6 10.2 — loadDerivedRecipes', () => {
  test('loads and validates the real derived-recipes.yaml', () => {
    const recipes = loadDerivedRecipes(join(projectRoot, 'Design/Content/interview-script/derived-recipes.yaml'));
    expect(recipes.recipes.length).toBeGreaterThan(0);
    expect(recipes.recipes.every((r) => r.unknown_policy === 'flag')).toBe(true);
  });

  test('rejects a file with duplicate recipe ids', () => {
    const tmpFile = join(__dirname, '__tmp_duplicate_recipes.yaml');
    writeFileSync(
      tmpFile,
      `
version: 1.0.0
recipes:
  - id: dup
    target_doc: a.md
    description: x
    inputs:
      question_ids: [S0]
    output_schema:
      type: array
      item:
        required_fields: [x]
    coverage:
      rule: every_item_has_source_refs
      min_source_refs_per_item: 1
      allowed_source_kinds: [question_id]
    unknown_policy: flag
    fallback:
      on_missing_source: "unknown"
  - id: dup
    target_doc: b.md
    description: y
    inputs:
      question_ids: [S0]
    output_schema:
      type: array
      item:
        required_fields: [x]
    coverage:
      rule: every_item_has_source_refs
      min_source_refs_per_item: 1
      allowed_source_kinds: [question_id]
    unknown_policy: flag
    fallback:
      on_missing_source: "unknown"
`,
      'utf8'
    );
    try {
      expect(() => loadDerivedRecipes(tmpFile)).toThrow(/Duplicate derived-recipe id/);
    } finally {
      rmSync(tmpFile, { force: true });
    }
  });

  test('rejects a missing file', () => {
    expect(() => loadDerivedRecipes(join(__dirname, '__does_not_exist.yaml'))).toThrow(/Failed to read/);
  });
});
