import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CLI_COMMAND_SURFACE, CLI_GLOBAL_FLAGS } from '../../src/adapters/shared/cliOperations.js';

/**
 * P10 (bonus-plan Phase 6, item 3) — a machine check that the CLI usage the
 * three adapter SKILL.md files teach the model is real. Two directions:
 *
 *  1. SKILL.md -> CLI_COMMAND_SURFACE: every `cli.mjs <sub> ...` line's
 *     subcommand and flags must exist on the real dispatcher (catches
 *     H0-style drift: teaching a flag/subcommand that was never wired, or
 *     that used to exist and was renamed/removed).
 *  2. CLI_COMMAND_SURFACE -> SKILL.md: every flag the real dispatcher
 *     recognizes must be taught in at least one of the three files (catches
 *     a real flag nobody ever tells the model how to use).
 *
 * A third, source-level direction (CLI_COMMAND_SURFACE.test.ts colocated
 * check below) keeps the table itself honest against the actual getArg/
 * hasFlag call sites, so this table can't silently drift from the parser
 * either.
 */

const REPO_ROOT = join(__dirname, '../..');
const SKILL_FILES = [
  join(REPO_ROOT, 'adapter/claude-code/skill/SKILL.md'),
  join(REPO_ROOT, 'adapter/claude-code/skill/build/SKILL.md'),
  join(REPO_ROOT, 'adapter/codex-plugin/skills/design-everything-build/SKILL.md'),
];

interface TaughtInvocation {
  file: string;
  line: string;
  subcommand: string;
  flags: string[];
}

function extractTaughtInvocations(): TaughtInvocation[] {
  const out: TaughtInvocation[] = [];
  for (const file of SKILL_FILES) {
    const content = readFileSync(file, 'utf8');
    for (const line of content.split('\n')) {
      // Only real `cli.mjs" <sub> ...` invocation lines — deliberately
      // excludes install-instruction lines like `cp -r .../cli.mjs ...`
      // (no closing quote immediately before a subcommand token there).
      const m = line.match(/cli\.mjs"\s+(\S+)(.*)$/);
      if (!m) continue;
      const subcommand = m[1];
      const rest = m[2];
      const flags = Array.from(rest.matchAll(/--[a-zA-Z-]+/g)).map((f) => f[0]);
      out.push({ file, line: line.trim(), subcommand, flags });
    }
  }
  return out;
}

describe('P10 — skill truth: taught CLI usage matches the real dispatcher surface', () => {
  const invocations = extractTaughtInvocations();

  it('sanity: found real cli.mjs invocation lines to check in all three SKILL.md files', () => {
    expect(invocations.length).toBeGreaterThan(10);
    for (const file of SKILL_FILES) {
      expect(invocations.some((i) => i.file === file)).toBe(true);
    }
  });

  for (const inv of invocations) {
    const shortFile = inv.file.replace(REPO_ROOT, '').replace(/\\/g, '/');
    it(`${shortFile}: "${inv.line}" teaches a real subcommand and only real flags`, () => {
      expect(Object.keys(CLI_COMMAND_SURFACE)).toContain(inv.subcommand);
      const allowed = new Set([...CLI_COMMAND_SURFACE[inv.subcommand], ...CLI_GLOBAL_FLAGS]);
      for (const flag of inv.flags) {
        expect(allowed.has(flag), `"${flag}" in "${inv.line}" is not a real ${inv.subcommand} flag`).toBe(true);
      }
    });
  }

  it('every real, non-global CLI flag is taught in at least one of the three SKILL.md files', () => {
    const taughtFlags = new Set(invocations.flatMap((i) => i.flags));
    const undocumented: string[] = [];
    for (const [subcommand, flags] of Object.entries(CLI_COMMAND_SURFACE)) {
      for (const flag of flags) {
        if (!taughtFlags.has(flag)) undocumented.push(`${subcommand} ${flag}`);
      }
    }
    expect(undocumented).toEqual([]);
  });
});

describe('P10 — skill truth: CLI_COMMAND_SURFACE matches the real getArg/hasFlag parser', () => {
  it('every flag declared in CLI_COMMAND_SURFACE has a real parser call site, and vice versa', () => {
    const sources = [
      readFileSync(join(REPO_ROOT, 'src/adapters/shared/cliOperations.ts'), 'utf8'),
      readFileSync(join(REPO_ROOT, 'src/adapters/shared/deepenCliOperations.ts'), 'utf8'),
    ].join('\n');

    const parsed = new Set<string>();
    for (const m of sources.matchAll(/(?:getArg|hasFlag)\(argv,\s*'(--[a-zA-Z-]+)'\)/g)) {
      parsed.add(m[1]);
    }
    for (const m of sources.matchAll(/argv\.includes\('(--[a-zA-Z-]+)'\)/g)) {
      parsed.add(m[1]);
    }

    const declared = new Set(Object.values(CLI_COMMAND_SURFACE).flat());

    const declaredButNotParsed = [...declared].filter((f) => !parsed.has(f));
    const parsedButNotDeclared = [...parsed].filter((f) => !declared.has(f));

    expect(declaredButNotParsed).toEqual([]);
    expect(parsedButNotDeclared).toEqual([]);
  });
});
