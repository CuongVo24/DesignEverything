#!/usr/bin/env node
// Installer — cài adapter Claude Code của DesignEverything vào một dự án đích,
// TỰ CHỨA hoàn toàn (P9): sau khi cài, dự án đích không còn phụ thuộc vào
// source checkout này (dist/, node_modules) — mọi hook/CLI import runtime
// esbuild bundle đã đóng gói (.design-everything/runtime/<version>/runtime.mjs).
//
//   node adapter/claude-code/install.mjs <đường-dẫn-dự-án-đích>
//
// Orchestrator mỏng (B4d #11) — logic thật nằm dưới ./installer/*.mjs: stage
// toàn bộ asset vào .design-everything/staging/<id>/ trước, hash-verify từng
// file, rồi mới atomic-promote (backup file cũ trước khi ghi đè) vào vị trí
// sống. install-manifest.json chỉ được ghi SAU CÙNG, khi mọi asset đã
// activate và health-check target-local đã chạy — một install bị crash giữa
// chừng để lại target không có manifest (không "installed" một nửa), và chạy
// lại installer sẽ tự sửa (stage lại, backup rồi ghi đè, migrate hook cũ).
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { randomBytes } from 'crypto';
import { sha256File, crashAfter, checkDistFreshness } from './installer/shared.mjs';
import { stageAllAssets } from './installer/stage.mjs';
import { promoteAssets } from './installer/promote.mjs';
import { applySettings } from './installer/settingsMerge.mjs';
import { runHealthCheck } from './installer/healthCheck.mjs';
import { writeInstallManifest } from './installer/manifest.mjs';
import { renderCompletionText } from './installer/summary.mjs';

const ADAPTER_DIR = dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = resolve(ADAPTER_DIR, '..', '..');

const target = process.argv[2];
if (!target) {
  console.error('Cách dùng: node adapter/claude-code/install.mjs <đường-dẫn-dự-án-đích>');
  process.exit(1);
}
const targetRoot = resolve(target);
if (targetRoot === ENGINE_ROOT) {
  console.error('Không cài vào chính repo DesignEverything — gate sẽ chặn việc phát triển engine. Chọn dự án đích khác.');
  process.exit(1);
}
mkdirSync(targetRoot, { recursive: true });

const bundlePath = join(ENGINE_ROOT, 'dist/bundle/runtime.mjs');
if (!existsSync(bundlePath)) {
  console.error('Chưa có dist/bundle/runtime.mjs. Chạy "npm run build:bundle" trong repo DesignEverything trước.');
  process.exit(1);
}
checkDistFreshness(ENGINE_ROOT, bundlePath);

const core = await import(pathToFileURL(bundlePath).href);
const RUNTIME_VERSION = core.RUNTIME_VERSION;
if (typeof RUNTIME_VERSION !== 'string' || !RUNTIME_VERSION) {
  console.error('Bundle không export RUNTIME_VERSION hợp lệ — build hỏng, chạy lại "npm run build:bundle".');
  process.exit(1);
}
const buildHash = sha256File(bundlePath);
const runtimeRelDir = `.design-everything/runtime/${RUNTIME_VERSION}`;

const generationId = `install-${Date.now()}-${randomBytes(4).toString('hex')}`;
const stagingRoot = join(targetRoot, '.design-everything/staging', generationId);
mkdirSync(stagingRoot, { recursive: true });

const { assets, stagedCatalog } = stageAllAssets({
  ADAPTER_DIR,
  ENGINE_ROOT,
  stagingRoot,
  bundlePath,
  runtimeRelDir,
  targetRoot,
  core,
});
crashAfter('stage');

const backupDir = join(targetRoot, '.design-everything/backups', generationId);
promoteAssets(targetRoot, stagingRoot, assets, backupDir);
// Old runtime versions (if this is a repair/upgrade) are left in place —
// repair only replaces stale hook paths in settings.json (below), never
// deletes a previous generation's files outright, so an in-flight process
// still holding an old version open is never yanked out from under it.
rmSync(stagingRoot, { recursive: true, force: true });
crashAfter('promote');

const { hookIds, report: hookReport } = applySettings(targetRoot, runtimeRelDir, backupDir);
crashAfter('settings');

const liveCliPath = join(targetRoot, runtimeRelDir, 'cli.mjs');
const healthResult = runHealthCheck(targetRoot, liveCliPath);
crashAfter('health');

writeInstallManifest({
  targetRoot,
  runtimeVersion: RUNTIME_VERSION,
  stagedCatalog,
  buildHash,
  hookIds,
  assets,
});

console.log(renderCompletionText({ targetRoot, runtimeRelDir, healthResult, hookReport }));
