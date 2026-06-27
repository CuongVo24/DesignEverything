import { readFileSync } from 'fs';
import YAML from 'yaml';
import { scriptSchema, type Script } from './schemas/index.js';

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

    // 3. Check web/mobile branch does not precede S6
    if (question.id === 'S6') {
      seenS6 = true;
    }
    if ((question.branch === 'web' || question.branch === 'mobile') && !seenS6) {
      throw new Error(`Question ${question.id} on branch ${question.branch} cannot precede S6`);
    }

    seenIds.add(question.id);
  }

  return script;
}
