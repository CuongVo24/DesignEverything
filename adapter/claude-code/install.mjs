#!/usr/bin/env node
// Installer — cài adapter Claude Code của DesignEverything vào một dự án đích,
// TỰ CHỨA hoàn toàn (P9): sau khi cài, dự án đích không còn phụ thuộc vào
// source checkout này (dist/, node_modules) — mọi hook/CLI import runtime
// esbuild bundle đã đóng gói (.design-everything/runtime/<version>/runtime.mjs).
//
//   node adapter/claude-code/install.mjs <đường-dẫn-dự-án-đích>
//
// Quy trình: stage toàn bộ asset vào .design-everything/staging/<id>/ trước,
// hash-verify từng file, rồi mới atomic-promote (backup file cũ trước khi
// ghi đè) vào vị trí sống. install-manifest.json chỉ được ghi SAU CÙNG, khi
// mọi asset đã activate và health-check target-local đã chạy — một install
// bị crash giữa chừng để lại target không có manifest (không "installed"
// một nửa), và chạy lại installer sẽ tự sửa (stage lại, backup rồi ghi đè).
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join, resolve } from 'path';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  copyFileSync,
  rmSync,
} from 'fs';
import { createHash, randomBytes } from 'crypto';
import { execFileSync } from 'child_process';

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

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}
function sha256File(p) {
  return sha256(readFileSync(p));
}
function toPosix(p) {
  return p.replace(/\\/g, '/');
}

// Fault-injection seam for installer-interrupted.test.ts: simulate a crash
// right after the named step completes, so a test can assert the target is
// left in a safe, repairable (never half-"installed") state and that
// rerunning the installer heals it. No effect unless the env var is set.
function crashAfter(step) {
  if (process.env.DE_INSTALL_CRASH_AFTER === step) {
    console.error(`[DE_INSTALL_CRASH_AFTER] Simulated crash after step "${step}".`);
    process.exit(9);
  }
}

const core = await import(pathToFileURL(bundlePath).href);
const RUNTIME_VERSION = core.RUNTIME_VERSION;
if (typeof RUNTIME_VERSION !== 'string' || !RUNTIME_VERSION) {
  console.error('Bundle không export RUNTIME_VERSION hợp lệ — build hỏng, chạy lại "npm run build:bundle".');
  process.exit(1);
}
const buildHash = sha256File(bundlePath);
const runtimeRelDir = `.design-everything/runtime/${RUNTIME_VERSION}`;

// ---------------------------------------------------------------------------
// 1. Stage — render the full target-relative tree under a fresh staging dir
//    before touching anything live.
// ---------------------------------------------------------------------------
const generationId = `install-${Date.now()}-${randomBytes(4).toString('hex')}`;
const stagingRoot = join(targetRoot, '.design-everything/staging', generationId);
mkdirSync(stagingRoot, { recursive: true });

const assets = [];

function stageWrite(relPath, content, kind) {
  const dest = join(stagingRoot, relPath);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, content);
  assets.push({ path: toPosix(relPath), sha256: sha256(readFileSync(dest)), kind });
}

function stageCopyFile(srcPath, relPath, kind) {
  stageWrite(relPath, readFileSync(srcPath), kind);
}

function stageCopyDir(srcDir, relPrefix, kind) {
  for (const name of readdirSync(srcDir)) {
    const srcPath = join(srcDir, name);
    const relPath = join(relPrefix, name);
    if (statSync(srcPath).isDirectory()) {
      stageCopyDir(srcPath, relPath, kind);
    } else {
      stageCopyFile(srcPath, relPath, kind);
    }
  }
}

// 1a. Runtime bundle + thin CLI launcher (byte-identical to the dev-mode
// launcher — it self-detects the sibling bundle, see cli.mjs).
stageCopyFile(bundlePath, join(runtimeRelDir, 'runtime.mjs'), 'runtime');
stageCopyFile(join(ADAPTER_DIR, 'cli.mjs'), join(runtimeRelDir, 'cli.mjs'), 'launcher');

// 1b. Hooks — byte-identical copies. _shared.mjs's resolveModule() detects
// the sibling runtime.mjs one directory up and uses it, so no rewriting is
// needed for these to work target-local instead of against ENGINE_ROOT.
for (const hookFile of [
  '_shared.mjs',
  'session-start.mjs',
  'user-prompt-submit.mjs',
  'pre-tool-use.mjs',
  'resolve-cli-invocation.mjs',
]) {
  stageCopyFile(join(ADAPTER_DIR, 'hooks', hookFile), join(runtimeRelDir, 'hooks', hookFile), 'hook');
}

// 1c. Skills — __ENGINE_ROOT__/adapter/claude-code/cli.mjs (dev-mode path)
// becomes the target-local cli.mjs absolute path.
const targetCliPath = toPosix(join(targetRoot, runtimeRelDir, 'cli.mjs'));
const legacyEnginePlaceholder = '__ENGINE_ROOT__/adapter/claude-code/cli.mjs';
for (const [srcRel, dstRel] of [
  ['skill/SKILL.md', '.claude/skills/design-everything/SKILL.md'],
  ['skill/build/SKILL.md', '.claude/skills/build/SKILL.md'],
]) {
  const template = readFileSync(join(ADAPTER_DIR, srcRel), 'utf8');
  const rendered = template
    .replaceAll(legacyEnginePlaceholder, targetCliPath)
    .replaceAll('__ENGINE_ROOT__', dirname(targetCliPath));
  stageWrite(dstRel, rendered, 'skill');
}

// 1d. Interview-script + catalog + templates (policy/catalog/template
// assets a target needs at runtime). deepen-script.yaml and
// artifact-catalog.yaml were previously NOT copied by this installer at
// all — a real gap: deepen on an installed target had no script to load,
// and any catalog-aware consumer (P6 10.3 write-gate, tier-1/tier-2 emit)
// silently degraded to an empty catalog. Both are now shipped.
stageCopyDir(
  join(ENGINE_ROOT, 'Design/Content/interview-script'),
  'Design/Content/interview-script',
  'policy'
);
stageCopyFile(
  join(ENGINE_ROOT, 'Design/Content/artifact-catalog.yaml'),
  'Design/Content/artifact-catalog.yaml',
  'catalog'
);
stageCopyDir(join(ENGINE_ROOT, 'Design/Content/doc-templates'), 'Design/Content/doc-templates', 'template');

// ---------------------------------------------------------------------------
// 2. Compile the catalog from the STAGED tree (what will become live) to
//    bind catalog_version/catalog_digest in the manifest to real bytes.
// ---------------------------------------------------------------------------
const stagedCatalog = core.loadRuntimeCatalogFor(stagingRoot);
crashAfter('stage');

// ---------------------------------------------------------------------------
// 3. Promote — backup whatever currently lives at each target path, then
//    copy the staged file into place. Never deletes an existing live file
//    without backing it up first; a crash here just leaves some assets
//    already-promoted and others not yet, which a rerun repairs (promotion
//    is idempotent: backup-then-copy is safe to repeat).
// ---------------------------------------------------------------------------
const backupDir = join(targetRoot, '.design-everything/backups', generationId);
for (const asset of assets) {
  const stagedPath = join(stagingRoot, asset.path);
  const livePath = join(targetRoot, asset.path);
  if (existsSync(livePath)) {
    const backupPath = join(backupDir, asset.path);
    mkdirSync(dirname(backupPath), { recursive: true });
    copyFileSync(livePath, backupPath);
  }
  mkdirSync(dirname(livePath), { recursive: true });
  copyFileSync(stagedPath, livePath);
}
crashAfter('promote');

// Old runtime versions (if this is a repair/upgrade) are left in place —
// repair only replaces stale hook paths in settings.json (below), never
// deletes a previous generation's files outright, so an in-flight process
// still holding an old version open is never yanked out from under it.

rmSync(stagingRoot, { recursive: true, force: true });

// ---------------------------------------------------------------------------
// 4. .claude/settings.json — backup before mutation, then wire hooks by
//    stable pattern match: an existing entry already pointing at OUR hook
//    (any version) gets its command replaced in place (repair path, never
//    duplicated); anything else in the user's settings.json is untouched.
// ---------------------------------------------------------------------------
const claudeDir = join(targetRoot, '.claude');
mkdirSync(claudeDir, { recursive: true });
const settingsPath = join(claudeDir, 'settings.json');
let settings = {};
if (existsSync(settingsPath)) {
  try {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  } catch (e) {
    console.error(`settings.json hiện tại không parse được (${e.message}); sửa tay rồi chạy lại.`);
    process.exit(1);
  }
  const settingsBackupPath = join(backupDir, '.claude/settings.json.bak');
  mkdirSync(dirname(settingsBackupPath), { recursive: true });
  copyFileSync(settingsPath, settingsBackupPath);
}
settings.hooks = settings.hooks ?? {};

const HOOK_ROLES = [
  { id: 'claude:session-start', event: 'SessionStart', matcher: null, file: 'session-start.mjs' },
  { id: 'claude:user-prompt-submit', event: 'UserPromptSubmit', matcher: null, file: 'user-prompt-submit.mjs' },
  {
    id: 'claude:pre-tool-use',
    event: 'PreToolUse',
    matcher: 'Write|Edit|MultiEdit|NotebookEdit|Bash',
    file: 'pre-tool-use.mjs',
  },
];

const hookIds = [];
for (const role of HOOK_ROLES) {
  const hookAbsPath = toPosix(join(targetRoot, runtimeRelDir, 'hooks', role.file));
  const command = `node "${hookAbsPath}"`;
  // No trailing `$` anchor: the real command string is `node "<path>"` —
  // the path is followed by a closing quote, not end-of-string.
  const versionedPattern = new RegExp(
    `\\.design-everything/runtime/[^"']+/hooks/${role.file.replace('.', '\\.')}`
  );
  const entries = (settings.hooks[role.event] = settings.hooks[role.event] ?? []);
  let repaired = false;
  for (const entry of entries) {
    for (const h of entry.hooks ?? []) {
      if (typeof h.command === 'string' && versionedPattern.test(h.command)) {
        h.command = command;
        repaired = true;
      }
    }
  }
  if (!repaired) {
    const entry = { hooks: [{ type: 'command', command }] };
    if (role.matcher) entry.matcher = role.matcher;
    entries.push(entry);
  }
  hookIds.push(role.id);
}
writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
crashAfter('settings');

// Legacy skill dir cleanup: "design" collided with Claude Code's built-in
// /design command (renamed to "design-everything").
const legacySkillDir = join(claudeDir, 'skills', 'design');
if (existsSync(join(legacySkillDir, 'SKILL.md'))) {
  rmSync(legacySkillDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// 5. Post-install health — spawn the TARGET-LOCAL cli.mjs (not an in-process
//    call) so this actually proves the installed layout resolves on its own.
// ---------------------------------------------------------------------------
const liveCliPath = join(targetRoot, runtimeRelDir, 'cli.mjs');
let healthResult;
try {
  const output = execFileSync('node', [liveCliPath, 'status', '--json'], {
    cwd: targetRoot,
    encoding: 'utf8',
  });
  healthResult = JSON.parse(output);
} catch (err) {
  // A non-zero exit here is expected whenever the target legitimately
  // reports a non-ok status (e.g. MISSING_INTERVIEW_STORE — "installed but
  // not yet interviewed", the normal state right after a fresh install, or
  // on a repair rerun before init) — exitCodeFor maps error severities to
  // non-zero codes and execFileSync throws on any of them. Only treat this
  // as a real installer failure when stdout isn't even a parseable
  // envelope — i.e. target-local resolution itself is broken, not just
  // reporting an expected non-ready state.
  try {
    healthResult = JSON.parse(err.stdout);
  } catch {
    console.error(
      `Cài đặt thất bại: target-local CLI health check không chạy được sau khi activate (${err.message}).`
    );
    process.exit(1);
  }
}
crashAfter('health');

// ---------------------------------------------------------------------------
// 6. install-manifest.json — written LAST, only once every asset has been
//    verified+activated and the target-local health check has run.
// ---------------------------------------------------------------------------
const manifest = {
  version: '1.0.0',
  adapter: 'claude-code',
  runtime_version: RUNTIME_VERSION,
  catalog_version: stagedCatalog.version,
  catalog_digest: stagedCatalog.digest,
  build_hash: buildHash,
  engine_range: `^${RUNTIME_VERSION}`,
  target_root: toPosix(targetRoot),
  hook_ids: hookIds,
  assets,
  installed_at: new Date().toISOString(),
};
writeFileSync(
  join(targetRoot, '.design-everything/install-manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf8'
);

console.log(`✅ Đã cài DesignEverything (adapter Claude Code, tự chứa) vào: ${targetRoot}

Cài đặt gồm:
  ${runtimeRelDir}/runtime.mjs      (esbuild bundle, tự chứa — không phụ thuộc node_modules)
  ${runtimeRelDir}/cli.mjs          (launcher target-local)
  ${runtimeRelDir}/hooks/           (3 hook: SessionStart, UserPromptSubmit, PreToolUse)
  .claude/settings.json                    (hooks trỏ target-local, không còn ENGINE_ROOT)
  .claude/skills/design-everything/SKILL.md
  .claude/skills/build/SKILL.md
  Design/Content/interview-script/         (script, gate-policy, shapes, deepen-script)
  Design/Content/artifact-catalog.yaml
  Design/Content/doc-templates/

Health check target-local sau cài: ${healthResult.ok ? 'OK' : `LỖI (${healthResult.reason_code})`} — ${healthResult.message}
${healthResult.next_command ? `Tiếp theo: ${healthResult.next_command}` : ''}

Cách test:
  1. cd "${targetRoot}"
  2. Mở phiên Claude Code MỚI (hooks chỉ nạp lúc khởi động phiên).
  3. Gõ: /design-everything  → trả lời phỏng vấn từng câu.`);
