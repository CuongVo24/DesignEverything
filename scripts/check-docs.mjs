import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve, relative, sep } from 'path';

// A1 (lane v9 prep) — the missing net over the documentation tree itself.
//
// `check-version-sync.mjs` guards version claims and `check-matrix.mjs` guards
// one lane's finding matrix, but nothing has ever walked the ~750 internal
// links or compared a lane's declared status against what its own contracts
// say. Six real drifts were found by hand in 2026-08-31 precisely because no
// machine was looking. This script is that machine.
//
// It is also the source of lane v9's item 4 (D67): the same file is emitted
// into the user's project by contract B26a, so it must stay dependency-free
// and repo-shape-agnostic where it can.
//
// Checks:
//   1. Every relative markdown link resolves to a path that exists.
//   2. Every contract file appears exactly once in CONTRACT_INDEX.md and the
//      index's Status cell matches the contract's own "## N. Status".
//   3. Every lane directory appears in RoadMap/LANE_INDEX.md, and vice versa.
//   4. Design/Core/Versioning.md has a changelog row for the current
//      package.json version.
//   5. No absolute file:/// URIs anywhere in the doc tree.

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const DOC_ROOTS = ['Design', 'docs'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.claude', '.codegraph', '.design-everything']);

const CONTRACT_INDEX = 'Design/ContractForAI/CONTRACT_INDEX.md';
const LANE_INDEX = 'Design/RoadMap/LANE_INDEX.md';
const CONTRACT_ROOT = 'Design/ContractForAI/Core';

const STATUS_VALUES = ['WAITING_FOR_APPROVAL', 'READY_TO_IMPLEMENT', 'IN_PROGRESS', 'DONE', 'BLOCKED'];

const errors = [];
const fail = (msg) => errors.push(msg);

/** Repo-relative path with forward slashes, so messages are copy-pasteable. */
const rel = (abs) => relative(REPO_ROOT, abs).split(sep).join('/');

function walk(absDir, out = []) {
  if (!existsSync(absDir)) return out;
  for (const name of readdirSync(absDir)) {
    if (SKIP_DIRS.has(name)) continue;
    const abs = join(absDir, name);
    if (statSync(abs).isDirectory()) walk(abs, out);
    else if (name.endsWith('.md')) out.push(abs);
  }
  return out;
}

/** Every markdown file in scope: the doc roots plus the top-level *.md files. */
function collectDocs() {
  const files = DOC_ROOTS.flatMap((r) => walk(join(REPO_ROOT, r)));
  for (const name of readdirSync(REPO_ROOT)) {
    if (name.endsWith('.md') && statSync(join(REPO_ROOT, name)).isFile()) {
      files.push(join(REPO_ROOT, name));
    }
  }
  return files.sort();
}

/**
 * Blank out fenced code blocks, keeping line numbering intact. Contracts and
 * taxonomy docs print example trees and shell snippets that contain
 * bracket/paren pairs; those are illustrations, not navigation.
 */
function stripFences(content) {
  let inFence = false;
  return content
    .split('\n')
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return '';
      }
      return inFence ? '' : line;
    })
    .join('\n');
}

/** Inline links `[text](target)`, excluding images and external schemes. */
function extractLinks(content) {
  const found = [];
  const lines = stripFences(content).split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/(!?)\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const [, bang, rawTarget] = m;
      if (bang) continue; // image
      found.push({ target: rawTarget, line: i + 1 });
    }
  });
  return found;
}

// `file:` is deliberately here: check 5 owns those, so check 1 must not
// report the same line a second time as a broken link.
const EXTERNAL = /^(https?:|mailto:|tel:|data:|file:)/i;

/**
 * Docs link to a specific line as `path/to/file.ts:64` (or `:64-70`). The
 * suffix is a reading aid, not part of the path — strip it before resolving.
 */
function stripLineSuffix(path) {
  return path.replace(/:\d+(?:[-,]\d+)*$/, '');
}

// ---------------------------------------------------------------- check 1 + 5

function checkLinksAndAbsoluteUris(docs) {
  for (const abs of docs) {
    const content = readFileSync(abs, 'utf8');

    // 5. Absolute local URIs. Same distinction RT-01 makes in
    // test/docs/runtime-truth.test.ts — only an actual link target is a
    // defect; a backtick-quoted mention is documentation *about* the pattern
    // (several release notes legitimately say `file:///e:/...` was removed).
    // Unlike RT-01, which walks the whole tree but only reports offenders in
    // five hand-listed paths, this covers everything it walks.
    content.split('\n').forEach((line, i) => {
      if (/\]\(file:\/\/\//i.test(line) && !line.includes('`file:///')) {
        fail(`${rel(abs)}:${i + 1} — absolute file:/// link (docs must use repo-relative links)`);
      }
    });

    // 1. Link resolution.
    for (const { target, line } of extractLinks(content)) {
      if (EXTERNAL.test(target) || target.startsWith('#')) continue;
      const withoutAnchor = stripLineSuffix(target.split('#')[0]);
      if (withoutAnchor === '') continue; // pure in-page anchor
      let decoded;
      try {
        decoded = decodeURIComponent(withoutAnchor);
      } catch {
        decoded = withoutAnchor;
      }
      const resolved = resolve(dirname(abs), decoded);
      if (!existsSync(resolved)) {
        fail(`${rel(abs)}:${line} — broken link "${target}"`);
      }
    }
  }
}

// -------------------------------------------------------------------- check 2

function collectContracts() {
  return walk(join(REPO_ROOT, CONTRACT_ROOT))
    .filter((p) => p.endsWith('_contract.md'))
    .sort();
}

/**
 * A contract's own status, read from its "## <n>. Status" section. The section
 * number is not pinned to 7 — a contract may insert extra sections (b24b has
 * 9) as long as the required ones exist.
 *
 * Two vocabularies are legitimate:
 *  - CONTRACT_STRUCTURE_RULE.md §5's single token (most lanes).
 *  - The v1-fix-bugs lane's three-axis "Spec | Implementation | Proof" form
 *    introduced by D56, whose values check-matrix.mjs already polices. It is
 *    normalised to "SPEC + IMPL + PROOF" so the index can carry it verbatim.
 */
function readContractStatus(abs) {
  const lines = readFileSync(abs, 'utf8').split('\n');
  const start = lines.findIndex((l) => /^##\s+\d+\.\s+Status\b/.test(l));
  if (start === -1) return null;
  for (let i = start + 1; i < Math.min(start + 8, lines.length); i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const axes = line.match(
      /Spec:\s*(\w+)[^|]*\|\s*Implementation:\s*(\w+)[^|]*\|\s*Proof:\s*(\w+)/
    );
    if (axes) return `${axes[1]} + ${axes[2]} + ${axes[3]}`;
    const hit = STATUS_VALUES.find((v) => line.includes(v));
    if (hit) return hit;
  }
  return null;
}

function checkContractIndex(contracts) {
  const indexAbs = join(REPO_ROOT, CONTRACT_INDEX);
  if (!existsSync(indexAbs)) {
    fail(`${CONTRACT_INDEX} is missing — ${contracts.length} contracts have no index.`);
    return;
  }
  const indexText = readFileSync(indexAbs, 'utf8');

  // One row per contract, keyed by the contract path linked inside the row.
  // Rows are matched loosely on purpose: the index owns its own column layout,
  // this check only cares that the link and a status token are both present.
  const rows = new Map();
  for (const line of indexText.split('\n')) {
    if (!line.startsWith('|')) continue;
    const linkMatch = line.match(/\]\(([^)\s]+_contract\.md)\)/);
    if (!linkMatch) continue;
    const target = resolve(dirname(indexAbs), decodeURIComponent(linkMatch[1]));
    // Status lives in the row's last cell, backtick-wrapped, so both the
    // single-token and the three-axis vocabulary survive a verbatim compare.
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    const status = (cells[cells.length - 1] ?? '').replace(/`/g, '').trim() || null;
    if (rows.has(rel(target))) {
      fail(`${CONTRACT_INDEX} — duplicate row for ${rel(target)}`);
      continue;
    }
    rows.set(rel(target), status);
  }

  for (const abs of contracts) {
    const key = rel(abs);
    const declared = readContractStatus(abs);
    if (declared === null) {
      fail(`${key} — no parseable "## N. Status" section (see CONTRACT_STRUCTURE_RULE.md §3, §5)`);
    }
    if (!rows.has(key)) {
      fail(`${CONTRACT_INDEX} — missing row for ${key}`);
      continue;
    }
    const indexed = rows.get(key);
    if (indexed === null) {
      fail(`${CONTRACT_INDEX} — row for ${key} has no status value`);
    } else if (declared !== null && indexed !== declared) {
      fail(`${CONTRACT_INDEX} — says ${key} is ${indexed}, but the contract says ${declared}`);
    }
    rows.delete(key);
  }

  for (const orphan of rows.keys()) {
    fail(`${CONTRACT_INDEX} — row points at ${orphan}, which does not exist`);
  }
}

// -------------------------------------------------------------------- check 3

function checkLaneIndex() {
  const coreAbs = join(REPO_ROOT, CONTRACT_ROOT);
  const laneDirs = readdirSync(coreAbs)
    .filter((n) => statSync(join(coreAbs, n)).isDirectory())
    .filter((n) => /^v\d/.test(n))
    .sort();

  const indexAbs = join(REPO_ROOT, LANE_INDEX);
  if (!existsSync(indexAbs)) {
    fail(`${LANE_INDEX} is missing — ${laneDirs.length} lanes have no index.`);
    return;
  }
  const indexText = readFileSync(indexAbs, 'utf8');

  for (const lane of laneDirs) {
    if (!indexText.includes(lane)) {
      fail(`${LANE_INDEX} — no row for lane directory ${CONTRACT_ROOT}/${lane}/`);
    }
  }
  for (const m of indexText.matchAll(/Core\/(v[\w.-]+?)\//g)) {
    if (!laneDirs.includes(m[1])) {
      fail(`${LANE_INDEX} — names lane "${m[1]}", but ${CONTRACT_ROOT}/${m[1]}/ does not exist`);
    }
  }
}

// -------------------------------------------------------------------- check 4

function checkVersioningRow() {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
  const versioningRel = 'Design/Core/Versioning.md';
  const text = readFileSync(join(REPO_ROOT, versioningRel), 'utf8');
  const rowVersions = [...text.matchAll(/^\|\s*(\d+\.\d+\.\d+)\s*\|/gm)].map((m) => m[1]);
  if (!rowVersions.includes(pkg.version)) {
    fail(
      `${versioningRel} — no changelog row for the current package version ${pkg.version} ` +
        `(rows stop at ${rowVersions[rowVersions.length - 1] ?? 'none'})`
    );
  }
}

// -------------------------------------------------------------------- check 6

/**
 * The mirror of check-version-sync.mjs's rule. That script catches a version
 * AHEAD of the package being claimed as shipped (finding R15). Nothing caught
 * the opposite: a version already BEHIND the package still carrying a
 * "chưa cắt / PLANNED" marker, which is how
 * `## Trạng thái v7.0.0 ... — PLANNED, chưa cắt` survived four months past
 * 7.0.0's actual GA. Only strictly-older versions are checked — the current
 * version may legitimately sit at RC.
 */
function checkPastVersionsNotMarkedPlanned() {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
  const pkgParts = pkg.version.split('.').map(Number);
  const isOlder = (v) => {
    const p = v.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if (p[i] < pkgParts[i]) return true;
      if (p[i] > pkgParts[i]) return false;
    }
    return false;
  };
  const marker = /PLANNED|UNRELEASED|chưa cắt|chưa phát hành/i;
  const report = (fileRel, i, version) =>
    fail(
      `${fileRel}:${i + 1} — version ${version} is older than the package (${pkg.version}) ` +
        `but is still marked as not-yet-released`
    );

  // Only structural positions are checked, never free prose: several rows
  // legitimately narrate a past correction ("từng ghi ... trong khi chưa cắt")
  // and must not be read as a live status claim.

  // Versioning.md — the changelog row's own date/status cell.
  const versioningRel = 'Design/Core/Versioning.md';
  readFileSync(join(REPO_ROOT, versioningRel), 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const m = line.match(/^\|\s*(\d+\.\d+\.\d+)\s*\|([^|]*)\|/);
      if (m && isOlder(m[1]) && marker.test(m[2])) report(versioningRel, i, m[1]);
    });

  // ConformanceMatrix.md — the "## Trạng thái vX.Y.Z" section heading.
  const conformanceRel = 'Design/Adapters/ConformanceMatrix.md';
  readFileSync(join(REPO_ROOT, conformanceRel), 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (!line.startsWith('## Trạng thái') || !marker.test(line)) return;
      for (const m of line.matchAll(/v(\d+\.\d+\.\d+)/g)) {
        if (isOlder(m[1])) return report(conformanceRel, i, m[1]);
      }
    });
}

// ------------------------------------------------------------------------ run

const docs = collectDocs();
const contracts = collectContracts();

checkLinksAndAbsoluteUris(docs);
checkContractIndex(contracts);
checkLaneIndex();
checkVersioningRow();
checkPastVersionsNotMarkedPlanned();

if (errors.length > 0) {
  console.error(`check-docs.mjs failed (${errors.length} problems):\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`check-docs.mjs: ${docs.length} docs, ${contracts.length} contracts, links and indexes OK.`);
