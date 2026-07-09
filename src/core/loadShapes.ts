import { readFileSync } from 'fs';
import YAML from 'yaml';
import { z } from 'zod';

export const shapeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  branch_prefix: z.string().min(1),
  release_docs: z.array(z.string().min(1)).nonempty(),
});

export const shapesRegistrySchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  shapes: z.array(shapeSchema).nonempty(),
});

export type Shape = z.infer<typeof shapeSchema>;
export type ShapesRegistry = z.infer<typeof shapesRegistrySchema>;

export function loadShapes(path: string): ShapesRegistry {
  let fileContent: string;
  try {
    fileContent = readFileSync(path, 'utf8');
  } catch (error: unknown) {
    throw new Error(`Failed to read shapes file at ${path}: ${(error as Error).message}`);
  }

  let parsedYaml: unknown;
  try {
    parsedYaml = YAML.parse(fileContent);
  } catch (error: unknown) {
    throw new Error(`Failed to parse YAML at ${path}: ${(error as Error).message}`);
  }

  const parsed = shapesRegistrySchema.safeParse(parsedYaml);
  if (!parsed.success) {
    throw new Error(
      `Invalid shapes schema at ${path}: ${JSON.stringify(parsed.error.format())}`
    );
  }

  const registry = parsed.data;
  const seenIds = new Set<string>();
  for (const shape of registry.shapes) {
    if (seenIds.has(shape.id)) {
      throw new Error(`Duplicate shape id found in registry: ${shape.id}`);
    }
    seenIds.add(shape.id);
  }

  return registry;
}
