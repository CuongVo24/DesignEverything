import { test, expect, describe } from 'vitest';
import { matchesCatalogPattern } from './catalogPathMatch.js';

describe('P6 10.3 — matchesCatalogPattern ({placeholder} grammar, not glob)', () => {
  test('matches a single {placeholder} segment', () => {
    expect(matchesCatalogPattern('docs/design/adr/ADR-1.md', 'docs/design/adr/ADR-{seq}.md')).toBe(true);
    expect(matchesCatalogPattern('docs/design/adr/ADR-42.md', 'docs/design/adr/ADR-{seq}.md')).toBe(true);
  });

  test('a {placeholder} never crosses a path separator', () => {
    expect(matchesCatalogPattern('docs/design/adr/nested/ADR-1.md', 'docs/design/adr/ADR-{seq}.md')).toBe(false);
  });

  test('regex metacharacters in the literal portion are escaped, not interpreted', () => {
    expect(matchesCatalogPattern('docs/v1.0+final/ADR-1.md', 'docs/v1.0+final/ADR-{seq}.md')).toBe(true);
    expect(matchesCatalogPattern('docs/v1X0+final/ADR-1.md', 'docs/v1.0+final/ADR-{seq}.md')).toBe(false);
  });

  test('does not match an unrelated sibling path', () => {
    expect(matchesCatalogPattern('docs/design/other/ADR-1.md', 'docs/design/adr/ADR-{seq}.md')).toBe(false);
  });
});
