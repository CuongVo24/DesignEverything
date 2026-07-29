#!/usr/bin/env node
// P9 (bonus-plan Phase 4) — bundles src/runtimeBundleEntry.ts's compiled
// output (dist/src/runtimeBundleEntry.js, produced by `tsc` first) into one
// self-contained ESM file with zod/yaml inlined: dist/bundle/runtime.mjs.
// This is what a target-local install ships and every hook wrapper/cli.mjs
// imports — never the raw dist/src/** tree, never node_modules at the
// target, never a path back into this source checkout.
import { build } from 'esbuild';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
// tsc's outDir is "dist" with no explicit rootDir, so it infers rootDir as
// the common ancestor of everything under include ("src/"), which strips
// the "src/" prefix from every output path — the real compiled entry lands
// at dist/runtimeBundleEntry.js, not dist/src/runtimeBundleEntry.js (a
// stale assumption package.json's main/exports also had — fixed alongside
// this in the same P9 slice).
const ENTRY = join(REPO_ROOT, 'dist/runtimeBundleEntry.js');
const OUT_DIR = join(REPO_ROOT, 'dist/bundle');
const OUT_FILE = join(OUT_DIR, 'runtime.mjs');

if (!existsSync(ENTRY)) {
  console.error(
    `[build-runtime-bundle] ${ENTRY} không tồn tại — chạy "tsc" (npm run build) trước khi bundle.`
  );
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

await build({
  entryPoints: [ENTRY],
  outfile: OUT_FILE,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  // zod + yaml are the only runtime dependencies (package.json) — inline
  // both so the target needs no node_modules at all. Node builtins
  // (fs/path/crypto/…) are external by default under platform:'node'.
  external: [],
  minify: false,
  sourcemap: false,
  legalComments: 'none',
});

console.log(`[build-runtime-bundle] wrote ${OUT_FILE}`);
