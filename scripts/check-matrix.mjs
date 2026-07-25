import { readFileSync } from 'fs';

// P0 verification for plan-v1-fix.md: the finding-coverage-matrix and the
// README contract table must not silently regress into unverifiable claims.
//
// 1. Every U/X/R finding row must carry non-empty Status/Test ID/Evidence
//    cells. "none" and "—" are legitimate "not yet" values; a blank cell is
//    not — it means someone deleted the column content instead of filling it.
// 2. No contract in README's table may be effectively DONE (spec=APPROVED +
//    implementation=IMPLEMENTED + proof=VERIFIED) while a contract it
//    depends on is not also DONE.

const matrixPath = new URL('../Design/ContractForAI/Core/v1-fix-bugs/finding-coverage-matrix.md', import.meta.url);
const readmePath = new URL('../Design/ContractForAI/Core/v1-fix-bugs/README.md', import.meta.url);

function splitRow(line) {
  // Drop leading/trailing empty cells produced by the outer pipes.
  return line
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());
}

function checkMatrix() {
  const content = readFileSync(matrixPath, 'utf8');
  const errors = [];

  for (const line of content.split('\n')) {
    const m = line.match(/^\| ([UXR]\d{2}) \|/);
    if (!m) continue;
    const id = m[1];
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
  }

  return errors;
}

function checkReadmeDependencyOrder() {
  const content = readFileSync(readmePath, 'utf8');
  const errors = [];
  const rows = new Map(); // code -> { spec, impl, proof, dependsOn: string[] }

  for (const line of content.split('\n')) {
    const m = line.match(/^\| B[1-5] \| (B\d[a-z]) — /);
    if (!m) continue;
    const cells = splitRow(line);
    if (cells.length < 7) continue;
    const [, , , dependsOnCell, spec, impl, proof] = cells;
    const code = m[1];
    const dependsOn = [...dependsOnCell.matchAll(/B\d[a-z]/g)].map((x) => x[0]);
    rows.set(code, { spec, impl, proof, dependsOn });
  }

  if (rows.size === 0) {
    errors.push('No contract rows parsed from README.md — table format may have changed; update check-matrix.mjs.');
    return errors;
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
