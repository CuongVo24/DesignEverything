import { readFileSync, existsSync } from 'fs';
import YAML from 'yaml';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { scriptSchema, type Script } from './schemas/index.js';
import { loadShapes } from './loadShapes.js';

export function loadScript(path: string): Script {
  let fileContent: string;
  try {
    fileContent = readFileSync(path, 'utf8');
  } catch (error: unknown) {
    throw new Error(`Failed to read script file at ${path}: ${(error as Error).message}`);
  }

  let parsedYaml: unknown;
  try {
    parsedYaml = YAML.parse(fileContent);
  } catch (error: unknown) {
    throw new Error(`Failed to parse YAML at ${path}: ${(error as Error).message}`);
  }

  const parsed = scriptSchema.safeParse(parsedYaml);
  if (!parsed.success) {
    throw new Error(
      `Invalid script schema at ${path}: ${JSON.stringify(parsed.error.format())}`
    );
  }

  const script = parsed.data;
  const seenIds = new Set<string>();
  let seenS6 = false;

  let shapesPath = join(dirname(path), 'shapes.yaml');
  if (!existsSync(shapesPath)) {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    shapesPath = join(__dirname, '../../Design/Content/interview-script/shapes.yaml');
  }
  const registry = loadShapes(shapesPath);
  const validBranches = new Set(['core', ...registry.shapes.map((s) => s.id)]);

  for (const question of script.questions) {
    // 1. Check unique id
    if (seenIds.has(question.id)) {
      throw new Error(`Duplicate question id found in script: ${question.id}`);
    }

    // 2. Check depends_on refers to previously declared ids only
    for (const depId of question.depends_on) {
      if (!seenIds.has(depId)) {
        throw new Error(
          `Question ${question.id} depends on undeclared or forward-declared id: ${depId}`
        );
      }
    }

    // 3. Check valid branch
    if (!validBranches.has(question.branch)) {
      throw new Error(
        `Question ${question.id} has invalid branch: ${question.branch}. Must be 'core' or one of: ${Array.from(validBranches).filter(b => b !== 'core').join(', ')}`
      );
    }

    // 4. Check shape branch does not precede S6
    if (question.id === 'S6') {
      seenS6 = true;
    }
    if (question.branch !== 'core' && !seenS6) {
      throw new Error(`Question ${question.id} on branch ${question.branch} cannot precede S6`);
    }

    seenIds.add(question.id);
  }

  return script;
}
