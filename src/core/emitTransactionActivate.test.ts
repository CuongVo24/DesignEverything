import { test, expect, describe } from 'vitest';
import { manifestPath, journalPath } from './emitTransactionActivate.js';

describe('P7.2.1 — EmitChannel widened to per-module tier2 channels', () => {
  test('manifestPath resolves distinct paths for each per-module tier2 channel', () => {
    const root = 'C:/fake-root';
    const glossary = manifestPath(root, 'tier2-glossary');
    const adr = manifestPath(root, 'tier2-adr');
    const coarseTier2 = manifestPath(root, 'tier2');
    const tier1 = manifestPath(root, 'tier1');

    expect(new Set([glossary, adr, coarseTier2, tier1]).size).toBe(4);
  });

  test('journalPath resolves distinct paths for each per-module tier2 channel', () => {
    const root = 'C:/fake-root';
    const featureSpec = journalPath(root, 'tier2-feature-spec');
    const testStrategy = journalPath(root, 'tier2-test-strategy');
    expect(featureSpec).not.toBe(testStrategy);
  });

  test('manifestPath/journalPath never contain a colon outside the Windows drive prefix', () => {
    const root = 'C:/fake-root';
    for (const channel of ['tier1', 'tier2', 'tier2-glossary', 'tier2-adr'] as const) {
      const m = manifestPath(root, channel).replace(/^[a-zA-Z]:/, '');
      const j = journalPath(root, channel).replace(/^[a-zA-Z]:/, '');
      expect(m).not.toContain(':');
      expect(j).not.toContain(':');
    }
  });
});
