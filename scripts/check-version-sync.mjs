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
