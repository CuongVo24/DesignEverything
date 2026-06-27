import { readFileSync } from 'fs';
import YAML from 'yaml';
import { gatePolicySchema, type GatePolicy } from './schemas/index.js';

export function loadGatePolicy(path: string): GatePolicy {
  let fileContent: string;
  try {
    fileContent = readFileSync(path, 'utf8');
  } catch (error: unknown) {
    throw new Error(`Failed to read gate policy file at ${path}: ${(error as Error).message}`);
  }

  let parsedYaml: unknown;
  try {
    parsedYaml = YAML.parse(fileContent);
  } catch (error: unknown) {
    throw new Error(`Failed to parse YAML at ${path}: ${(error as Error).message}`);
  }

  const parsed = gatePolicySchema.safeParse(parsedYaml);
  if (!parsed.success) {
    throw new Error(
      `Invalid gate policy schema at ${path}: ${JSON.stringify(parsed.error.format())}`
    );
  }

  const policy = parsed.data;
  const seenIds = new Set<string>();

  for (const gate of policy.gates) {
    if (seenIds.has(gate.id)) {
      throw new Error(`Duplicate gate id found in policy: ${gate.id}`);
    }
    seenIds.add(gate.id);
  }

  return policy;
}
