import { readFileSync } from 'fs';
import YAML from 'yaml';
import { derivedRecipesFileSchema, DerivedRecipesFile } from './schemas/derivedRecipes.js';

export function loadDerivedRecipes(path: string): DerivedRecipesFile {
  let fileContent: string;
  try {
    fileContent = readFileSync(path, 'utf8');
  } catch (error: unknown) {
    throw new Error(`Failed to read derived-recipes file at ${path}: ${(error as Error).message}`);
  }

  let parsedYaml: unknown;
  try {
    parsedYaml = YAML.parse(fileContent);
  } catch (error: unknown) {
    throw new Error(`Failed to parse YAML at ${path}: ${(error as Error).message}`);
  }

  const parsed = derivedRecipesFileSchema.safeParse(parsedYaml);
  if (!parsed.success) {
    throw new Error(`Invalid derived-recipes schema at ${path}: ${JSON.stringify(parsed.error.format())}`);
  }

  const seenIds = new Set<string>();
  for (const recipe of parsed.data.recipes) {
    if (seenIds.has(recipe.id)) {
      throw new Error(`Duplicate derived-recipe id found: ${recipe.id}`);
    }
    seenIds.add(recipe.id);
  }

  return parsed.data;
}
