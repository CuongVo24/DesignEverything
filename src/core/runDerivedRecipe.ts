import type { DerivedRecipe } from './schemas/derivedRecipes.js';

export type DerivedItemCoverageReason =
  | 'MISSING_REQUIRED_FIELD'
  | 'ENUM_FIELD_VIOLATION'
  | 'MISSING_SOURCE_REF'
  | 'INVALID_SOURCE_REF_KIND';

export interface DerivedItemCoverageResult {
  index: number;
  coverage: 'pass' | 'flag';
  reason?: DerivedItemCoverageReason;
  missing_fields?: string[];
  invalid_refs?: string[];
}

export interface RunDerivedRecipeResult {
  recipe_id: string;
  item_results: DerivedItemCoverageResult[];
  all_pass: boolean;
}

// A ref is only trustworthy if it names something the recipe is actually
// allowed to cite. question_id refs are checked against the real script (no
// "S99" fabrication); doc_id refs have no compiled catalog wired into this
// minimal executor yet, so any non-question-id string is accepted as a
// plausible doc reference when doc_id is an allowed kind — deliberately
// loose for this pass (P6 10.3 wires the real catalog in elsewhere).
function isValidRef(ref: string, coverage: DerivedRecipe['coverage'], knownQuestionIds: Set<string>): boolean {
  if (!ref) return false;
  const isKnownQuestionId = knownQuestionIds.has(ref);
  if (isKnownQuestionId) return coverage.allowed_source_kinds.includes('question_id');
  return coverage.allowed_source_kinds.includes('doc_id');
}

/**
 * Checks a set of already-produced derived items against their recipe's
 * coverage rule. Does not generate content — recipes.yaml's fallback text is
 * the only thing ever substituted for a missing source (unknown_policy is
 * always "flag", never "invent"), so this only ever proves or flags
 * provenance for items a caller already produced elsewhere.
 *
 * `coverage.rule` (every_item_has_source_refs vs every_node_has_source_refs)
 * is not branched on — both are checked identically, at the item level.
 * mermaid-flow-diagram's node-level distinction (each graph node having its
 * own source, not the diagram as a whole sharing one array) would need the
 * caller to pass one item per node; this minimal executor doesn't parse
 * mermaid source to enforce that itself.
 */
export function runDerivedRecipe(
  recipe: DerivedRecipe,
  items: Array<Record<string, unknown>>,
  knownQuestionIds: string[]
): RunDerivedRecipeResult {
  const knownIds = new Set(knownQuestionIds);
  const requiredFields = recipe.output_schema.item?.required_fields ?? recipe.output_schema.required_fields ?? [];
  const enumFields = recipe.output_schema.item?.enum_fields ?? {};
  const fallbackText = recipe.fallback.on_missing_source.trim();

  const itemResults = items.map((item, index): DerivedItemCoverageResult => {
    const missingFields = requiredFields.filter((field) => {
      const value = item[field];
      return value === undefined || value === null || (typeof value === 'string' && value.trim().length === 0);
    });
    if (missingFields.length > 0) {
      return { index, coverage: 'flag', reason: 'MISSING_REQUIRED_FIELD', missing_fields: missingFields };
    }

    for (const [field, allowedValues] of Object.entries(enumFields)) {
      const value = item[field];
      if (typeof value === 'string' && !allowedValues.includes(value)) {
        return { index, coverage: 'flag', reason: 'ENUM_FIELD_VIOLATION', missing_fields: [field] };
      }
    }

    // An item that explicitly carries the recipe's own unknown-fallback text
    // is compliant, not a failure — unknown_policy: flag means "say you
    // don't know," and this is exactly that being said correctly.
    const explicitlyFlaggedUnknown = Object.values(item).some(
      (value) => typeof value === 'string' && value.trim() === fallbackText
    );
    if (explicitlyFlaggedUnknown) {
      return { index, coverage: 'pass' };
    }

    const refs = Array.isArray(item.source_refs)
      ? item.source_refs.filter((ref): ref is string => typeof ref === 'string')
      : [];
    if (refs.length < recipe.coverage.min_source_refs_per_item) {
      return { index, coverage: 'flag', reason: 'MISSING_SOURCE_REF' };
    }

    const invalidRefs = refs.filter((ref) => !isValidRef(ref, recipe.coverage, knownIds));
    if (invalidRefs.length > 0) {
      return { index, coverage: 'flag', reason: 'INVALID_SOURCE_REF_KIND', invalid_refs: invalidRefs };
    }

    return { index, coverage: 'pass' };
  });

  return {
    recipe_id: recipe.id,
    item_results: itemResults,
    all_pass: itemResults.every((r) => r.coverage === 'pass'),
  };
}
