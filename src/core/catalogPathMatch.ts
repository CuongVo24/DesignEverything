// Shared pattern matcher for artifact-catalog.yaml's `path_pattern` grammar
// (e.g. "docs/design/adr/ADR-{seq}.md") — a `{placeholder}` template, not a
// glob. This is deliberately NOT pathPolicy.ts's matchesPathPattern: that
// function's `*`/`**` glob grammar has no concept of `{placeholder}` and
// would never match a catalog pattern artifact; reusing it here would
// silently leave every pattern-declared artifact unmatched.
//
// P6 10.3 — fixed a real bug found while extracting this (it was private,
// untested code in emitTransactionStage.ts before this file existed): the
// old implementation escaped regex metacharacters BEFORE substituting
// placeholders, but its escape charclass didn't include `{`/`}`, so the
// substitution regex (which looked for an escaped `\{...\}`) never matched
// anything — `{seq}`/`{feature-slug}` stayed literal text in the compiled
// regex, meaning artifact-catalog.yaml's two real path_pattern entries
// (ADR docs, feature-spec docs) never matched any real path. Fixed by
// splitting on placeholder tokens first, then escaping only the literal
// segments between them.
export function patternToRegex(pattern: string): RegExp {
  const parts = pattern.split(/(\{[^}]+\})/);
  const regexSource = parts
    .map((part) => (/^\{[^}]+\}$/.test(part) ? '[^/]+' : part.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&')))
    .join('');
  return new RegExp(`^${regexSource}$`);
}

export function matchesCatalogPattern(path: string, pattern: string): boolean {
  return patternToRegex(pattern).test(path);
}
