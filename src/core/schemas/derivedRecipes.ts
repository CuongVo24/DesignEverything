import { z } from 'zod';

// Mirrors Design/Content/interview-script/derived-recipes.yaml (B3b). Each
// recipe declares which question_ids/doc_ids it may cite, the structured
// shape of the items it derives, and the coverage rule every item must
// satisfy (every_item_has_source_refs / every_node_has_source_refs) before
// unknown_policy: flag replaces a missing source with fallback.on_missing_source
// rather than ever inventing one.
export const derivedRecipeCoverageSchema = z.object({
  rule: z.string(),
  min_source_refs_per_item: z.number().int().min(0),
  allowed_source_kinds: z.array(z.enum(['question_id', 'doc_id'])),
});

export const derivedRecipeOutputItemSchema = z.object({
  required_fields: z.array(z.string()),
  enum_fields: z.record(z.string(), z.array(z.string())).optional(),
});

export const derivedRecipeOutputSchemaSchema = z.object({
  type: z.enum(['array', 'object']),
  item: derivedRecipeOutputItemSchema.optional(),
  required_fields: z.array(z.string()).optional(),
});

export const derivedRecipeSchema = z.object({
  id: z.string(),
  target_doc: z.string(),
  description: z.string(),
  inputs: z.object({
    question_ids: z.array(z.string()).optional(),
    doc_ids: z.array(z.string()).optional(),
  }),
  output_schema: derivedRecipeOutputSchemaSchema,
  coverage: derivedRecipeCoverageSchema,
  unknown_policy: z.literal('flag'),
  fallback: z.object({ on_missing_source: z.string() }),
  validation: z.object({ must_parse_as_mermaid: z.boolean().optional() }).optional(),
});

export const derivedRecipesFileSchema = z.object({
  version: z.string(),
  recipes: z.array(derivedRecipeSchema),
});

export type DerivedRecipeCoverage = z.infer<typeof derivedRecipeCoverageSchema>;
export type DerivedRecipe = z.infer<typeof derivedRecipeSchema>;
export type DerivedRecipesFile = z.infer<typeof derivedRecipesFileSchema>;
