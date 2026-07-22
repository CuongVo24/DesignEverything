import { readFileSync } from 'fs';
import YAML from 'yaml';
import { deepenScriptSchema, type DeepenScript } from './schemas/deepenScript.js';

/**
 * Nạp `deepen-script.yaml` (B19b). File thiếu/hỏng/không đúng schema → throw lỗi rõ ràng.
 * KHÔNG fallback im lặng: đây là nội dung bắt buộc của lane deepen.
 */
export function loadDeepenScript(path: string): DeepenScript {
  let fileContent: string;
  try {
    fileContent = readFileSync(path, 'utf8');
  } catch (error: unknown) {
    throw new Error(`Failed to read deepen script at ${path}: ${(error as Error).message}`);
  }

  let parsedYaml: unknown;
  try {
    parsedYaml = YAML.parse(fileContent);
  } catch (error: unknown) {
    throw new Error(`Failed to parse deepen YAML at ${path}: ${(error as Error).message}`);
  }

  const parsed = deepenScriptSchema.safeParse(parsedYaml);
  if (!parsed.success) {
    throw new Error(
      `Invalid deepen script schema at ${path}: ${JSON.stringify(parsed.error.format())}`
    );
  }

  const script = parsed.data;

  // Id duy nhất trong toàn file.
  const seen = new Set<string>();
  for (const q of script.questions) {
    if (seen.has(q.id)) {
      throw new Error(`Duplicate deepen question id in ${path}: ${q.id}`);
    }
    seen.add(q.id);
  }

  return script;
}
