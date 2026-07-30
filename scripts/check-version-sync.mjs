import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const plugin = JSON.parse(readFileSync(new URL('../adapter/codex-plugin/.codex-plugin/plugin.json', import.meta.url), 'utf8'));
if (plugin.version !== pkg.version) throw new Error(`Plugin version ${plugin.version} does not match package ${pkg.version}.`);

// P9 — src/version.ts's RUNTIME_VERSION is the single constant every CLI/hook
// envelope reports; checked by regex against the TS source text (not an
// import) so this script keeps working without requiring a prior `tsc`
// build step.
const versionTs = readFileSync(new URL('../src/version.ts', import.meta.url), 'utf8');
const rtMatch = versionTs.match(/RUNTIME_VERSION\s*=\s*'([^']+)'/);
if (!rtMatch) throw new Error('Could not find RUNTIME_VERSION in src/version.ts.');
if (rtMatch[1] !== pkg.version) {
  throw new Error(`src/version.ts RUNTIME_VERSION "${rtMatch[1]}" does not match package version "${pkg.version}".`);
}

// Every "mốc X.Y.Z" milestone claim in the README must match the package
// version; historical mentions must be reworded, not left as stale claims.
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
for (const match of readme.matchAll(/mốc\s+(\d+\.\d+\.\d+)/g)) {
  if (match[1] !== pkg.version) {
    throw new Error(`README claims "mốc ${match[1]}" but package version is ${pkg.version}.`);
  }
}

// P12 3.3 — a doc row/heading naming a version AHEAD of the real package
// version is only legitimate if it's explicitly marked not-yet-released; an
// unmarked one is exactly the R15 lie (docs claiming a future milestone as
// already shipped). PLANNED_MARKERS is deliberately loose — the point is to
// force a human-visible qualifier to exist, not to police its exact wording.
const PLANNED_MARKERS = /PLANNED|UNRELEASED|BLOCKED|chưa cắt|chưa phát hành/i;

function isNewerThanPackage(version) {
  const a = version.split('.').map(Number);
  const b = pkg.version.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

function checkFutureVersionIsMarkedPlanned(fileRel, matches) {
  for (const { version, context } of matches) {
    if (!isNewerThanPackage(version)) continue;
    if (PLANNED_MARKERS.test(context)) continue;
    throw new Error(
      `${fileRel} references version ${version} (package is ${pkg.version}) without a PLANNED/UNRELEASED/BLOCKED marker nearby — looks like an unreleased milestone claimed as done.`
    );
  }
}

// Design/Core/Versioning.md's changelog table: one row per version, date
// column either a real date or a not-yet-cut marker.
const versioningPath = new URL('../Design/Core/Versioning.md', import.meta.url);
const versioning = readFileSync(versioningPath, 'utf8');
checkFutureVersionIsMarkedPlanned(
  'Design/Core/Versioning.md',
  [...versioning.matchAll(/^\| (\d+\.\d+\.\d+) \| ([^|]+) \|/gm)].map((m) => ({
    version: m[1],
    context: m[0],
  }))
);

// Design/Adapters/ConformanceMatrix.md's "## Trạng thái vX.Y.Z (...)" section
// headings, each checked against the paragraph immediately following it.
const conformancePath = new URL('../Design/Adapters/ConformanceMatrix.md', import.meta.url);
const conformance = readFileSync(conformancePath, 'utf8');
checkFutureVersionIsMarkedPlanned(
  'Design/Adapters/ConformanceMatrix.md',
  [...conformance.matchAll(/## Trạng thái v(\d+\.\d+\.\d+)[^\n]*\n(?:[^\n]*\n){0,3}/g)].map((m) => ({
    version: m[1],
    context: m[0],
  }))
);

// Design/DecisionLog.md's "Mốc MAJOR vX.Y.Z" decision rows.
const decisionLogPath = new URL('../Design/DecisionLog.md', import.meta.url);
const decisionLog = readFileSync(decisionLogPath, 'utf8');
checkFutureVersionIsMarkedPlanned(
  'Design/DecisionLog.md',
  [...decisionLog.matchAll(/^\|[^\n]*Mốc MAJOR v(\d+\.\d+\.\d+)[^\n]*\|$/gm)].map((m) => ({
    version: m[1],
    context: m[0],
  }))
);

// Design/RoadMap/v7-release-note.md's own "Target Version" / "package.json
// still X" claim must actually match the real package version — this is the
// note that OWNS the release-truth claim; if it drifts, nothing else can be
// trusted either.
const releaseNotePath = new URL('../Design/RoadMap/v7-release-note.md', import.meta.url);
const releaseNote = readFileSync(releaseNotePath, 'utf8');
const stillMatch = releaseNote.match(/`package\.json`\s+still\s+([\d.]+)/);
if (!stillMatch) {
  throw new Error('Design/RoadMap/v7-release-note.md is missing its "package.json still X" statement.');
}
if (stillMatch[1] !== pkg.version) {
  throw new Error(
    `Design/RoadMap/v7-release-note.md says package.json is still ${stillMatch[1]}, but it's actually ${pkg.version}.`
  );
}
