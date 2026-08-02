#!/usr/bin/env node
// Installer — stages the DesignEverything Codex plugin, TỰ CHỨA hoàn toàn
// (P9 parity với adapter/claude-code/install.mjs), vào một thư mục đích rõ
// ràng — thường là ~/.codex/plugins/design-everything-plugin, nhưng có thể
// là bất kỳ đường dẫn nào (test dùng thư mục tạm dùng-một-lần).
//
//   node adapter/codex-plugin/install.mjs <đường-dẫn-đích>
//
// Trước P9: installer cũ cpSync dist/+node_modules NGAY VÀO chính thư mục
// nguồn adapter/codex-plugin/ trong repo — nghĩa là "plugin" chưa bao giờ
// thực sự tự chứa, nó vẫn sống trong và phụ thuộc vào checkout dev này. Bản
// này không còn ghi gì vào source tree: mọi thứ được stage rồi activate vào
// <target-dir>.
//
// Codex đọc plugin qua đường dẫn CỐ ĐỊNH tương đối với CLAUDE_PLUGIN_ROOT
// (biến môi trường Codex tự set = chính <target-dir> khi plugin được nạp):
// .codex-plugin/plugin.json trỏ tới ./hooks/hooks.json, và hooks.json chứa
// các "command" cố định. Hai file đó (+ .codex-plugin/plugin.json) được giữ
// tại gốc <target-dir> để Codex tìm thấy; runtime bundle + cli.mjs + chính
// các hook .mjs được stage dưới layout versioned giống hệt Claude
// (.design-everything/runtime/<version>/...) để install-manifest có cùng
// schema (adapter:'codex') và cùng cơ chế hash-verify (DEBT3.2, Phase 5) —
// hooks.json được RENDER để trỏ vào đường dẫn versioned đó.
import { pathToFileURL, fileURLToPath } from 'url';
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

const ADAPTER_DIR = dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = resolve(ADAPTER_DIR, '..', '..');

const target = process.argv[2];
if (!target) {
  console.error('Cách dùng: node adapter/codex-plugin/install.mjs <đường-dẫn-đích>');
  console.error('  (thường là ~/.codex/plugins/design-everything-plugin)');
  process.exit(1);
}
const targetRoot = resolve(target);
if (targetRoot === ENGINE_ROOT || targetRoot === ADAPTER_DIR) {
  console.error('Không cài đè lên chính repo DesignEverything — chọn thư mục đích khác.');
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

const core = await import(pathToFileURL(bundlePath).href);
const RUNTIME_VERSION = core.RUNTIME_VERSION;
if (typeof RUNTIME_VERSION !== 'string' || !RUNTIME_VERSION) {
  console.error('Bundle không export RUNTIME_VERSION hợp lệ — build hỏng, chạy lại "npm run build:bundle".');
  process.exit(1);
}
const buildHash = sha256File(bundlePath);
const runtimeRelDir = `.design-everything/runtime/${RUNTIME_VERSION}`;

// ---------------------------------------------------------------------------
// 1. Stage
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

// 1a. Runtime bundle + universal cli.mjs launcher under the versioned dir —
// same layout and same files (byte-identical) as the Claude installer.
stageCopyFile(bundlePath, join(runtimeRelDir, 'runtime.mjs'), 'runtime');
stageCopyFile(join(ENGINE_ROOT, 'adapter/claude-code/cli.mjs'), join(runtimeRelDir, 'cli.mjs'), 'launcher');

// 1b. Hook wrappers — byte-identical; _shared.mjs's resolveCorePath()
// detects the sibling runtime.mjs one directory up.
for (const hookFile of ['_shared.mjs', 'pre-tool-use.mjs', 'post-tool-use.mjs', 'permission-request.mjs']) {
  stageCopyFile(join(ADAPTER_DIR, 'hooks', hookFile), join(runtimeRelDir, 'hooks', hookFile), 'hook');
}

// 1c. Root-level cli.mjs — SKILL.md documents `<pluginRoot>/cli.mjs` literally.
// This can't be a second byte-identical copy of the universal launcher: that
// launcher locates its runtime bundle by looking for a FLAT sibling
// runtime.mjs next to itself, and here the real bundle lives one level down
// at the versioned dir. So this is a tiny redirector instead — it resolves
// the current version's real cli.mjs and imports it, keeping the
// `<pluginRoot>/cli.mjs` contract true without a second copy of the bundle
// or a change to the shared launcher's sibling-detection contract (which
// the Claude installer also depends on unchanged).
stageWrite(
  'cli.mjs',
  `#!/usr/bin/env node
// Thin redirector — the real launcher lives at the current version's
// .design-everything/runtime/<version>/cli.mjs (see install.mjs). Kept at
// the plugin root because SKILL.md documents \`<pluginRoot>/cli.mjs\`.
import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const rootDir = dirname(fileURLToPath(import.meta.url));
const runtimeDir = join(rootDir, '.design-everything', 'runtime');
const versions = existsSync(runtimeDir) ? readdirSync(runtimeDir).sort() : [];
const latest = versions[versions.length - 1];
if (!latest) {
  console.error('[DesignEverything CLI] LỖI: Không tìm thấy .design-everything/runtime/<version>/ — chạy lại install.mjs.');
  process.exit(5);
}
await import(pathToFileURL(join(runtimeDir, latest, 'cli.mjs')).href);
`,
  'launcher'
);

// 1d. Codex-required fixed-path files. plugin.json's "hooks" pointer and the
// hooks.json matcher/timeout/statusMessage fields are copied verbatim;
// only the "command" strings are rendered to the versioned hook path,
// since ${CLAUDE_PLUGIN_ROOT} is substituted by Codex itself at hook-run
// time and always equals targetRoot.
stageCopyFile(join(ADAPTER_DIR, '.codex-plugin/plugin.json'), '.codex-plugin/plugin.json', 'policy');

const hooksJsonSrc = JSON.parse(readFileSync(join(ADAPTER_DIR, 'hooks/hooks.json'), 'utf8'));
for (const eventHooks of Object.values(hooksJsonSrc.hooks)) {
  for (const entry of eventHooks) {
    for (const h of entry.hooks ?? []) {
      if (typeof h.command === 'string') {
        h.command = h.command.replace(
          /\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\//,
          `\${CLAUDE_PLUGIN_ROOT}/${runtimeRelDir}/hooks/`
        );
      }
    }
  }
}
stageWrite('hooks/hooks.json', JSON.stringify(hooksJsonSrc, null, 2), 'hook');

// 1e. Skills.
stageCopyDir(join(ADAPTER_DIR, 'skills'), 'skills', 'skill');

// The interview skill is authored once for Claude and rendered for Codex at
// install time. Before this, the Codex package shipped only the build skill,
// so a freshly installed real project had no /design-everything entrypoint and
// could not complete the documented interview -> emit -> build journey.
const codexInterviewSkill = readFileSync(
  join(ENGINE_ROOT, 'adapter/claude-code/skill/SKILL.md'),
  'utf8'
)
  .replaceAll(
    '__ENGINE_ROOT__/adapter/claude-code/cli.mjs',
    '${PLUGIN_ROOT}/cli.mjs'
  )
  .replaceAll('__ENGINE_ROOT__', '${PLUGIN_ROOT}');
stageWrite('skills/design-everything/SKILL.md', codexInterviewSkill, 'skill');

// 1f. Interview-script + catalog + templates — shipped for the same reason
// the Claude installer ships them (manifest catalog_version/catalog_digest
// parity, and forward-compat with any future codex-side scaffolding command
// that seeds a project workspace from the plugin's own copies).
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
// 2. Compile the catalog from the STAGED tree to bind catalog_version/digest
//    in the manifest to real bytes.
// ---------------------------------------------------------------------------
const stagedCatalog = core.loadRuntimeCatalogFor(stagingRoot);

// ---------------------------------------------------------------------------
// 3. Promote — backup-then-copy each asset into place.
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

rmSync(stagingRoot, { recursive: true, force: true });

// ---------------------------------------------------------------------------
// 4. install-manifest.json — written LAST.
// ---------------------------------------------------------------------------
const manifest = {
  version: '1.0.0',
  adapter: 'codex',
  runtime_version: RUNTIME_VERSION,
  catalog_version: stagedCatalog.version,
  catalog_digest: stagedCatalog.digest,
  build_hash: buildHash,
  engine_range: `^${RUNTIME_VERSION}`,
  target_root: toPosix(targetRoot),
  hook_ids: ['codex:pre-tool-use', 'codex:post-tool-use', 'codex:permission-request'],
  assets,
  installed_at: new Date().toISOString(),
};
mkdirSync(join(targetRoot, '.design-everything'), { recursive: true });
writeFileSync(
  join(targetRoot, '.design-everything/install-manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf8'
);

console.log(`✅ Đã cài DesignEverything Codex plugin (tự chứa) vào: ${targetRoot}

Cài đặt gồm:
  .codex-plugin/plugin.json
  hooks/hooks.json                          (trỏ vào ${runtimeRelDir}/hooks/)
  ${runtimeRelDir}/runtime.mjs      (esbuild bundle, tự chứa — không phụ thuộc node_modules)
  ${runtimeRelDir}/cli.mjs
  ${runtimeRelDir}/hooks/           (pre-tool-use, post-tool-use, permission-request)
  cli.mjs                                   (bản tiện dụng ở gốc, dùng trong SKILL.md)
  skills/design-everything/SKILL.md
  skills/design-everything-build/SKILL.md
  Design/Content/interview-script/, artifact-catalog.yaml, doc-templates/

Bước tiếp theo (KHÔNG tự động — installer này không ghi vào ~/.codex):
  1. Trỏ Codex tới thư mục plugin này (vd: cp -r "${targetRoot}/." ~/.codex/plugins/design-everything-plugin/
     nếu đích ở trên chưa phải chính thư mục đó).
  2. Trong Codex, chạy lệnh /hooks để TỰ MÌNH xem xét và cấp quyền tin cậy cho từng hook —
     installer này không bao giờ tự động trust hook hay dùng cờ bypass.`);
