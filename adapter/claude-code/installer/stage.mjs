// A1-P9 (B4d) — render the full target-relative tree under a fresh staging
// dir before touching anything live. Extracted from install.mjs (#11).
import { join, dirname } from 'path';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'fs';
import { sha256, toPosix } from './shared.mjs';

function stageWrite(stagingRoot, assets, relPath, content, kind) {
  const dest = join(stagingRoot, relPath);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, content);
  assets.push({ path: toPosix(relPath), sha256: sha256(readFileSync(dest)), kind });
}

function stageCopyFile(stagingRoot, assets, srcPath, relPath, kind) {
  stageWrite(stagingRoot, assets, relPath, readFileSync(srcPath), kind);
}

function stageCopyDir(stagingRoot, assets, srcDir, relPrefix, kind) {
  for (const name of readdirSync(srcDir)) {
    const srcPath = join(srcDir, name);
    const relPath = join(relPrefix, name);
    if (statSync(srcPath).isDirectory()) {
      stageCopyDir(stagingRoot, assets, srcPath, relPath, kind);
    } else {
      stageCopyFile(stagingRoot, assets, srcPath, relPath, kind);
    }
  }
}

// Stages every asset the Claude adapter ships (runtime bundle, thin CLI
// launcher, hooks, skills, interview-script/catalog/templates), then compiles
// the catalog from the STAGED tree so catalog_version/catalog_digest in the
// manifest are bound to the bytes that will actually go live.
export function stageAllAssets({ ADAPTER_DIR, ENGINE_ROOT, stagingRoot, bundlePath, runtimeRelDir, targetRoot, core }) {
  const assets = [];

  // 1a. Runtime bundle + thin CLI launcher (byte-identical to the dev-mode
  // launcher — it self-detects the sibling bundle, see cli.mjs).
  stageCopyFile(stagingRoot, assets, bundlePath, join(runtimeRelDir, 'runtime.mjs'), 'runtime');
  stageCopyFile(stagingRoot, assets, join(ADAPTER_DIR, 'cli.mjs'), join(runtimeRelDir, 'cli.mjs'), 'launcher');

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
    stageCopyFile(stagingRoot, assets, join(ADAPTER_DIR, 'hooks', hookFile), join(runtimeRelDir, 'hooks', hookFile), 'hook');
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
    stageWrite(stagingRoot, assets, dstRel, rendered, 'skill');
  }

  // 1d. Interview-script + catalog + templates (policy/catalog/template
  // assets a target needs at runtime). deepen-script.yaml and
  // artifact-catalog.yaml were previously NOT copied by this installer at
  // all — a real gap: deepen on an installed target had no script to load,
  // and any catalog-aware consumer (P6 10.3 write-gate, tier-1/tier-2 emit)
  // silently degraded to an empty catalog. Both are now shipped.
  stageCopyDir(
    stagingRoot,
    assets,
    join(ENGINE_ROOT, 'Design/Content/interview-script'),
    'Design/Content/interview-script',
    'policy'
  );
  stageCopyFile(
    stagingRoot,
    assets,
    join(ENGINE_ROOT, 'Design/Content/artifact-catalog.yaml'),
    'Design/Content/artifact-catalog.yaml',
    'catalog'
  );
  stageCopyDir(stagingRoot, assets, join(ENGINE_ROOT, 'Design/Content/doc-templates'), 'Design/Content/doc-templates', 'template');

  // 2. Compile the catalog from the STAGED tree (what will become live) to
  // bind catalog_version/catalog_digest in the manifest to real bytes.
  const stagedCatalog = core.loadRuntimeCatalogFor(stagingRoot);

  return { assets, stagedCatalog };
}
