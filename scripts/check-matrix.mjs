import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// P0 verification for plan-v1-fix.md: the finding-coverage-matrix and the
// README contract table must not silently regress into unverifiable claims.
//
// 1. Every U/X/R finding row must carry non-empty Status/Test ID/Evidence
//    cells. "none" and "—" are legitimate "not yet" values; a blank cell is
//    not — it means someone deleted the column content instead of filling it.
// 2. Every U01-U08/X01-X24/R01-R20 ID must appear exactly once — a missing or
//    duplicated ID means the ma trận không-bỏ-sót guarantee has a hole.
// 3. An Evidence path cell that names a file must actually exist on disk.
// 4. No contract in README's table may be effectively DONE (spec=APPROVED +
//    implementation=IMPLEMENTED + proof=VERIFIED) while a contract it
//    depends on is not also DONE.
// 5. Spec/Implementation/Proof cells must use the vocabulary README itself
//    declares — a slash-combined or ad-hoc value ("NOT_STARTED/PARTIAL") is a
//    sign nobody actually resolved the ambiguity.
// 6. proof=VERIFIED is meaningless (and a red flag) when implementation isn't
//    IMPLEMENTED yet — checked independently of the dependency-order rule.

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const matrixPath = join(REPO_ROOT, 'Design/ContractForAI/Core/v1-fix-bugs/finding-coverage-matrix.md');
const readmePath = join(REPO_ROOT, 'Design/ContractForAI/Core/v1-fix-bugs/README.md');

const SPEC_VALUES = new Set(['DRAFT', 'WAITING_FOR_APPROVAL', 'APPROVED']);
const IMPL_VALUES = new Set(['NOT_STARTED', 'PARTIAL', 'IMPLEMENTED']);
const PROOF_VALUES = new Set([
  'MISSING',
  'SNAPSHOT_ONLY',
  'UNIT_ONLY',
  'SEAM_PARTIAL',
  'INVALID_FOR_CLAIM',
  'INVALID_FOR_PRODUCTION_SEAM',
  'VERIFIED',
]);

function splitRow(line) {
  // Drop leading/trailing empty cells produced by the outer pipes.
  return line
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());
}

/** Every path-shaped token inside an Evidence cell, e.g.
 * "test/foo.test.ts:89,98, src/core/bar.ts" -> two file paths (line/col
 * suffixes and trailing commas stripped). Free-text notes without a file
 * extension (e.g. "SKILL.md wording sửa một phần") are left alone. */
function extractEvidencePaths(cell) {
  if (!cell || cell === '—' || cell === 'none') return [];
  // Require at least one path separator so a bare filename mentioned in
  // prose (e.g. "SKILL.md wording sửa một phần") isn't mistaken for a claim
  // that a repo-relative evidence file exists.
  const matches = cell.match(/[\w.-]+\/[\w./-]+\.(ts|mjs|js|yaml|md)(?=[:,\s]|$)/g) ?? [];
  return matches;
}

function checkMatrix() {
  const content = readFileSync(matrixPath, 'utf8');
  const errors = [];
  const seenIds = new Map();

  for (const line of content.split('\n')) {
    const m = line.match(/^\| ([UXR]\d{2}) \|/);
    if (!m) continue;
    const id = m[1];
    seenIds.set(id, (seenIds.get(id) ?? 0) + 1);

    const cells = splitRow(line);
    // Uxx/Xxx table has 8 columns (...Status, Test ID, Evidence path, Last verified commit);
    // Rxx table has 7 columns (...Status, Test ID, Evidence path).
    if (cells.length < 7) {
      errors.push(`${id}: row has fewer than 7 columns (${cells.length}); Status/Test ID/Evidence path missing.`);
      continue;
    }
    const [, , , , status, testId, evidence] = cells;
    if (!status) errors.push(`${id}: empty Status cell.`);
    if (!testId) errors.push(`${id}: empty Test ID cell.`);
    if (!evidence) errors.push(`${id}: empty Evidence path cell.`);
    if (status && status.includes('MISMAPPED')) {
      errors.push(`${id}: Status still says MISMAPPED — resolve the label/proof mismatch, don't leave it flagged.`);
    }

    for (const relPath of extractEvidencePaths(evidence)) {
      const abs = join(REPO_ROOT, relPath);
      if (!existsSync(abs)) {
        errors.push(`${id}: Evidence path "${relPath}" does not exist on disk.`);
      }
    }
  }

  for (const [id, count] of seenIds) {
    if (count > 1) errors.push(`${id}: appears ${count} times in the matrix — IDs must be unique.`);
  }

  const expectedIds = [
    ...Array.from({ length: 8 }, (_, i) => `U${String(i + 1).padStart(2, '0')}`),
    ...Array.from({ length: 24 }, (_, i) => `X${String(i + 1).padStart(2, '0')}`),
    ...Array.from({ length: 20 }, (_, i) => `R${String(i + 1).padStart(2, '0')}`),
  ];
  for (const id of expectedIds) {
    if (!seenIds.has(id)) errors.push(`${id}: missing from the matrix entirely.`);
  }

  return errors;
}

/**
 * Resolves a Depends-on cell into a flat list of contract codes, expanding
 * both bare-batch tokens (B1, B2 — every contract in that batch) and ranges
 * (B4a–B4f, B3a–B4f, B1–B3) using `order`, the contract codes in the exact
 * sequence they appear in the table. Both a hyphen and an en dash are
 * accepted as the range separator since the doc uses en dash.
 */
function resolveDependsOn(dependsOnCell, order) {
  const raw = dependsOnCell.trim();
  if (raw === '' || raw === '—' || raw === '-') return [];

  const batchFirstIndex = (batchNum) => order.findIndex((c) => c.startsWith(`B${batchNum}`));
  const batchLastIndex = (batchNum) => {
    let idx = -1;
    order.forEach((c, i) => {
      if (c.startsWith(`B${batchNum}`)) idx = i;
    });
    return idx;
  };
  const resolveEndpoint = (token, wantFirst) => {
    const bareBatch = token.match(/^B(\d)$/);
    if (bareBatch) return wantFirst ? batchFirstIndex(bareBatch[1]) : batchLastIndex(bareBatch[1]);
    return order.indexOf(token);
  };

  const result = new Set();
  for (const rawToken of raw.split(',')) {
    const token = rawToken.trim();
    if (!token) continue;

    const rangeMatch = token.match(/^(B\d[a-z]?)\s*[–-]\s*(B\d[a-z]?)$/);
    if (rangeMatch) {
      const [, fromTok, toTok] = rangeMatch;
      const fromIdx = resolveEndpoint(fromTok, true);
      const toIdx = resolveEndpoint(toTok, false);
      if (fromIdx === -1 || toIdx === -1) {
        throw new Error(`cannot resolve dependency range "${token}" — endpoint not found in table order`);
      }
      for (let i = Math.min(fromIdx, toIdx); i <= Math.max(fromIdx, toIdx); i++) {
        result.add(order[i]);
      }
      continue;
    }

    const bareBatch = token.match(/^B(\d)$/);
    if (bareBatch) {
      order.forEach((c) => {
        if (c.startsWith(`B${bareBatch[1]}`)) result.add(c);
      });
      continue;
    }

    result.add(token);
  }
  return [...result];
}

function checkReadmeDependencyOrder() {
  const content = readFileSync(readmePath, 'utf8');
  const errors = [];
  const order = [];
  const rawRows = []; // { code, cells, dependsOnCell }

  for (const line of content.split('\n')) {
    const m = line.match(/^\| B[1-5] \| (B\d[a-z]) — /);
    if (!m) continue;
    const cells = splitRow(line);
    if (cells.length < 7) continue;
    const [, , , dependsOnCell, spec, impl, proof] = cells;
    const code = m[1];
    order.push(code);
    rawRows.push({ code, dependsOnCell, spec, impl, proof });
  }

  if (rawRows.length === 0) {
    errors.push('No contract rows parsed from README.md — table format may have changed; update check-matrix.mjs.');
    return errors;
  }

  const rows = new Map();
  for (const { code, dependsOnCell, spec, impl, proof } of rawRows) {
    let dependsOn;
    try {
      dependsOn = resolveDependsOn(dependsOnCell, order);
    } catch (err) {
      errors.push(`${code}: ${err.message}`);
      dependsOn = [];
    }

    if (!SPEC_VALUES.has(spec)) {
      errors.push(`${code}: Spec "${spec}" is not one of ${[...SPEC_VALUES].join('|')}.`);
    }
    if (!IMPL_VALUES.has(impl)) {
      errors.push(`${code}: Implementation "${impl}" is not one of ${[...IMPL_VALUES].join('|')} (no slash-combined values).`);
    }
    if (!PROOF_VALUES.has(proof)) {
      errors.push(`${code}: Proof "${proof}" is not one of ${[...PROOF_VALUES].join('|')}.`);
    }
    if (proof === 'VERIFIED' && impl !== 'IMPLEMENTED') {
      errors.push(`${code}: Proof is VERIFIED but Implementation is "${impl}", not IMPLEMENTED — a claim can't be verified before it exists.`);
    }

    rows.set(code, { spec, impl, proof, dependsOn });
  }

  const isDone = (r) => r.spec === 'APPROVED' && r.impl === 'IMPLEMENTED' && r.proof === 'VERIFIED';

  for (const [code, row] of rows) {
    if (!isDone(row)) continue;
    for (const dep of row.dependsOn) {
      const depRow = rows.get(dep);
      if (depRow && !isDone(depRow)) {
        errors.push(`${code} is marked DONE (APPROVED+IMPLEMENTED+VERIFIED) but dependency ${dep} is not.`);
      }
    }
  }

  return errors;
}

const errors = [...checkMatrix(), ...checkReadmeDependencyOrder()];
if (errors.length > 0) {
  console.error('check-matrix.mjs failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log('check-matrix.mjs: finding matrix and contract dependency order OK.');
