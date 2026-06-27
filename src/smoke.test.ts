import { expect, test } from 'vitest';
import { DUMMY_VAL } from '@/core/dummy.js';

test('smoke test - path alias resolves correctly', () => {
  expect(DUMMY_VAL).toBe('scaffolded');
});
