import { test, expect, describe } from 'vitest';
import * as core from './index.js';

describe('core barrel — RUNTIME_VERSION re-export (P9 bundle-export gap)', () => {
  test('RUNTIME_VERSION is re-exported through the core barrel, not just importable from version.ts directly', () => {
    // Every adapter imports RUNTIME_VERSION straight from '../version.js' /
    // '../../version.js', which hid a real gap: runtimeBundleEntry.ts's doc
    // comment claimed `export * from './core/index.js'` surfaces
    // RUNTIME_VERSION, but core/index.ts never actually re-exported it — so
    // a freshly built dist/bundle/runtime.mjs shipped with no
    // RUNTIME_VERSION export at all (caught by runtime-bundle.test.ts and
    // tampered-runtime.test.ts, both of which import the compiled bundle).
    // This unit-level check catches the same regression without requiring
    // a rebuild first.
    expect(typeof core.RUNTIME_VERSION).toBe('string');
    expect(core.RUNTIME_VERSION.length).toBeGreaterThan(0);
  });
});
