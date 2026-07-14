import { existsSync, mkdirSync, rmSync, cpSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_DIR = __dirname; // adapter/codex-plugin
const REPO_ROOT = join(PLUGIN_DIR, '..', '..');

// Runtime dependencies imported by the compiled core (both are dependency-free).
const RUNTIME_DEPS = ['zod', 'yaml'];

function bundleCoreRuntime() {
  const distSrc = join(REPO_ROOT, 'dist');
  if (!existsSync(join(distSrc, 'src', 'core', 'index.js'))) {
    console.error('ERROR: compiled core not found at dist/src/core/index.js.');
    console.error('Run "npm run build" at the repo root first, then re-run this installer.');
    process.exit(1);
  }

  // Copy the compiled runtime next to the hooks so the installed plugin is
  // self-contained: pre-tool-use.mjs resolves <pluginRoot>/dist/src/core/index.js.
  const distDest = join(PLUGIN_DIR, 'dist');
  rmSync(distDest, { recursive: true, force: true });
  cpSync(distSrc, distDest, { recursive: true });
  console.log('- Bundled compiled core -> dist/');

  // Copy the (zero-dependency) runtime deps so bare imports (zod, yaml) resolve
  // from the bundled dist without needing the repo's node_modules.
  const nmDest = join(PLUGIN_DIR, 'node_modules');
  for (const dep of RUNTIME_DEPS) {
    const depSrc = join(REPO_ROOT, 'node_modules', dep);
    if (!existsSync(depSrc)) {
      console.error(`ERROR: runtime dependency "${dep}" not found in node_modules. Run "npm install" first.`);
      process.exit(1);
    }
    const depDest = join(nmDest, dep);
    mkdirSync(dirname(depDest), { recursive: true });
    rmSync(depDest, { recursive: true, force: true });
    cpSync(depSrc, depDest, { recursive: true });
    console.log(`- Bundled runtime dependency -> node_modules/${dep}`);
  }
}

function main() {
  console.log('=== DesignEverything Codex Plugin Installer ===\n');
  console.log('Preparing a self-contained plugin bundle (manifest + hooks + core runtime)...\n');

  bundleCoreRuntime();

  console.log('\nPlugin bundle is ready. Event hooks: PreToolUse, PostToolUse, PermissionRequest.\n');
  console.log('To register the plugin locally, copy the WHOLE plugin directory (it now includes');
  console.log('dist/ and node_modules/ so the enforcement core loads offline) into your Codex');
  console.log('user config folder:\n');
  console.log('  mkdir -p ~/.codex/plugins/design-everything-plugin');
  console.log(`  cp -r "${PLUGIN_DIR}/." ~/.codex/plugins/design-everything-plugin/\n`);

  console.log('IMPORTANT: Codex requires hooks to be explicitly trusted before execution.');
  console.log('Inspect and trust them yourself via the chat UI command `/hooks`.\n');
  console.log('This installer never writes to ~/.codex for you, never auto-trusts hooks, and');
  console.log('never uses bypass flags like `--dangerously-bypass-hook-trust`.');
}

main();
