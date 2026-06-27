import { expect, test } from 'vitest';
import { DUMMY_VAL } from '@/core/dummy.js';
import { progressSchema } from '@/core/schemas/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('smoke test - path alias resolves correctly', () => {
  expect(DUMMY_VAL).toBe('scaffolded');
});

test('zod schema validation - progress fixtures', () => {
  const initS0Path = join(__dirname, '../test/fixtures/progress/init-s0.json');
  const initS0Raw = readFileSync(initS0Path, 'utf8');
  const initS0Json = JSON.parse(initS0Raw);

  const parsed = progressSchema.safeParse(initS0Json);
  expect(parsed.success).toBe(true);

  // Missing fields (e.g. version)
  const invalidPath = join(__dirname, '../test/fixtures/progress/invalid/missing-field.json');
  const invalidRaw = readFileSync(invalidPath, 'utf8');
  const invalidJson = JSON.parse(invalidRaw);

  const parsedInvalid = progressSchema.safeParse(invalidJson);
  expect(parsedInvalid.success).toBe(false);
});
