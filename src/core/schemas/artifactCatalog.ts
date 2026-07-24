import { z } from 'zod';

export const artifactSourceSchema = z.object({
  question_ids: z.array(z.string()).default([]),
  recipe_ids: z.array(z.string()).default([]),
});
export type ArtifactSource = z.infer<typeof artifactSourceSchema>;

export const artifactKindSchema = z.enum(['doc', 'state', 'manifest', 'convention']);
export type ArtifactKind = z.infer<typeof artifactKindSchema>;

export const artifactRecordSchema = z
  .object({
    id: z.string().min(1),
    path: z.string().min(1).optional(),
    path_pattern: z.string().min(1).optional(),
    tier: z.union([z.literal(1), z.literal(2)]),
    shapes: z.array(z.string().min(1)).nonempty(),
    required: z.boolean(),
    ownership: z.enum(['managed', 'user']),
    kind: artifactKindSchema,
    media_type: z.string().min(1),
    source: artifactSourceSchema,
  })
  .refine((a) => (a.path ? !a.path_pattern : !!a.path_pattern), {
    message: 'Artifact must declare exactly one of path or path_pattern',
    path: ['path'],
  });
export type ArtifactRecord = z.infer<typeof artifactRecordSchema>;

export const artifactCatalogSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  artifacts: z.array(artifactRecordSchema).nonempty(),
});
export type ArtifactCatalog = z.infer<typeof artifactCatalogSchema>;
