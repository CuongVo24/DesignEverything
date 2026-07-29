#!/usr/bin/env node
// DesignEverything CLI Thin Launcher (< 100 lines)
import { pathToFileURL, fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

const cliDir = dirname(fileURLToPath(import.meta.url));

// P9 — an installed target-local cli.mjs sits next to the self-contained
// esbuild bundle (.design-everything/runtime/<version>/{cli.mjs,runtime.mjs}) —
// check that sibling FIRST so an installed target never needs this source
// checkout's dist/ or node_modules at all. Dev-mode (running straight from
// this repo's adapter/claude-code/cli.mjs, no sibling bundle) falls back
// to the granular dist/ candidates as before.
const siblingBundle = join(cliDir, 'runtime.mjs');
const candidates = existsSync(siblingBundle)
  ? [siblingBundle]
  : [
      join(cliDir, '../..', 'dist/src/core/index.js'),
      join(cliDir, '../..', 'dist/core/index.js'),
      join(cliDir, 'dist/src/core/index.js'),
      join(cliDir, 'dist/core/index.js'),
    ];
let corePath = null;
for (const p of candidates) {
  if (existsSync(p)) {
    corePath = p;
    break;
  }
}

if (!corePath) {
  console.error('[DesignEverything CLI] LỖI: Không thể định vị dist/core/index.js.');
  process.exit(5);
}

const workspaceRoot = process.env.CLAUDE_PROJECT_DIR || process.env.PLUGIN_ROOT || process.cwd();
const core = await import(pathToFileURL(corePath).href);

const isJsonMode = process.argv.includes('--json');
const rawArgv = process.argv.slice(2);

let result;
try {
  result = await core.runCliOperation(workspaceRoot, rawArgv);
} catch (err) {
  result = {
    ok: false,
    operation: rawArgv[0] || 'unknown',
    reason_code: 'INTERNAL_ERROR',
    severity: 'error',
    message: `Lỗi hệ thống khi thực thi CLI: ${core.redactInternalError(err.message || String(err))}`,
    runtime_version: core.RUNTIME_VERSION ?? '6.0.0',
  };
}

const exitCode = core.exitCodeFor(result);

if (isJsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  if (result.ok) {
    console.log(`[DesignEverything CLI] ${result.message}`);
    if (result.next_command) {
      console.log(`Tiếp theo: ${result.next_command}`);
    }
  } else {
    console.error(`[DesignEverything CLI LỖI ${result.reason_code}] ${result.message}`);
    if (result.next_command) {
      console.error(`Hướng dẫn khắc phục: ${result.next_command}`);
    }
  }
}

process.exit(exitCode);
