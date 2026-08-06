// A1-P9 (B4d) — small helpers shared across the installer's staged modules.
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { createHash } from 'crypto';

export function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

export function sha256File(p) {
  return sha256(readFileSync(p));
}

export function toPosix(p) {
  return p.replace(/\\/g, '/');
}

// Fault-injection seam for installer-interrupted.test.ts: simulate a crash
// right after the named step completes, so a test can assert the target is
// left in a safe, repairable (never half-"installed") state and that
// rerunning the installer heals it. No effect unless the env var is set.
export function crashAfter(step) {
  if (process.env.DE_INSTALL_CRASH_AFTER === step) {
    console.error(`[DE_INSTALL_CRASH_AFTER] Simulated crash after step "${step}".`);
    process.exit(9);
  }
}

function newestMtimeUnderSrc(dir) {
  let newest = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      newest = Math.max(newest, newestMtimeUnderSrc(full));
    } else if (extname(name) === '.ts' && !name.endsWith('.test.ts')) {
      newest = Math.max(newest, st.mtimeMs);
    }
  }
  return newest;
}

// B4d #4 — dev checkouts ship dist/bundle/runtime.mjs as a build artifact
// derived from src/**/*.ts; a stale bundle silently installs old behavior. A
// release artifact (npm package) ships only dist/, no src/ — so this check
// no-ops there, matching "release artifact không phụ thuộc source tree".
export function checkDistFreshness(engineRoot, bundlePath) {
  const srcDir = join(engineRoot, 'src');
  if (!existsSync(srcDir)) return;
  const bundleMtime = statSync(bundlePath).mtimeMs;
  const newestSrcMtime = newestMtimeUnderSrc(srcDir);
  if (newestSrcMtime > bundleMtime) {
    console.error(
      'dist/bundle/runtime.mjs cũ hơn ít nhất một file trong src/ — chạy "npm run build:bundle" ' +
        'trong repo DesignEverything trước khi cài (dev checkout).'
    );
    process.exit(1);
  }
}
