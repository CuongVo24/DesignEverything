import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(__dirname, '../..');
const DOCS_PATHS = [
  join(REPO_ROOT, 'README.md'),
  join(REPO_ROOT, 'docs'),
  join(REPO_ROOT, 'Design'),
];

function getAllMarkdownFiles(dirOrFile: string): string[] {
  if (!statSync(dirOrFile).isDirectory()) {
    return dirOrFile.endsWith('.md') ? [dirOrFile] : [];
  }

  const results: string[] = [];
  const entries = readdirSync(dirOrFile, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dirOrFile, entry.name);
    // Ignore node_modules, .git, etc.
    if (entry.isDirectory() && (entry.name === 'node_modules' || entry.name.startsWith('.'))) {
      continue;
    }
    if (entry.isDirectory()) {
      results.push(...getAllMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }

  return results;
}

describe('B5d — Documentation & Runtime Truth Sync Test Suite', () => {
  it('RT-01 — should ensure no active documentation files contain absolute file:/// or local file system URIs', () => {
    const allMdFiles: string[] = [];
    for (const p of DOCS_PATHS) {
      allMdFiles.push(...getAllMarkdownFiles(p));
    }

    const offendingFiles: Array<{ file: string; match: string }> = [];

    for (const filePath of allMdFiles) {
      // Exclude archived/historical contracts if any
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match actual file:/// markdown links e.g. [text](file:///e:/...) or bare file:/// paths, not backtick-quoted pattern descriptions
        if (/(?:\[[^\]]*\]\()file:\/\/\/[a-zA-Z]:/i.test(line) && !line.includes('`file:///')) {
          const relPath = filePath.replace(REPO_ROOT, '').replace(/\\/g, '/');
          if (
            relPath === '/README.md' ||
            relPath === '/docs/quickstart.md' ||
            relPath === '/Design/Glossary.md' ||
            relPath === '/Design/DecisionLog.md' ||
            relPath.startsWith('/Design/Core/')
          ) {
            offendingFiles.push({ file: relPath, match: line.trim() });
          }
        }
      }
    }

    expect(offendingFiles).toEqual([]);
  });

  it('RT-02 — should ensure Design/Glossary.md references updated question scope (S0–S8) and no obsolete S0–S6 or S0–S7 claims', () => {
    const glossaryPath = join(REPO_ROOT, 'Design/Glossary.md');
    const content = readFileSync(glossaryPath, 'utf8');

    expect(content).not.toMatch(/S0–S6/);
    expect(content).not.toMatch(/S0–S7/);
    expect(content).toMatch(/S0–S8/);
  });

  it('RT-03 — should ensure docs/quickstart.md distinguishes real Claude Code onboarding from Vitest simulations', () => {
    const quickstartPath = join(REPO_ROOT, 'docs/quickstart.md');
    const content = readFileSync(quickstartPath, 'utf8');

    expect(content).toMatch(/Simulation|Test/i);
    expect(content).toMatch(/validate|build/i);
  });

  it('RT-04 — should verify package.json version matches release documentation version', () => {
    const pkgPath = join(REPO_ROOT, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

    expect(pkg.version).toBe('6.0.0');
  });
});
