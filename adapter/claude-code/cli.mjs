#!/usr/bin/env node
// DesignEverything CLI Thin Launcher (< 100 lines)
import { pathToFileURL, fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

const cliDir = dirname(fileURLToPath(import.meta.url));
const candidates = [
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
    runtime_version: '6.0.0',
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
