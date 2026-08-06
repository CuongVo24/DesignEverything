// A1-P9 (B4d) — install-manifest.json, written LAST, only once every asset
// has been verified+activated and the target-local health check has run.
// Extracted from install.mjs (#11).
import { join } from 'path';
import { writeFileSync } from 'fs';
import { toPosix } from './shared.mjs';

export function writeInstallManifest({ targetRoot, runtimeVersion, stagedCatalog, buildHash, hookIds, assets }) {
  const manifest = {
    version: '1.0.0',
    adapter: 'claude-code',
    runtime_version: runtimeVersion,
    catalog_version: stagedCatalog.version,
    catalog_digest: stagedCatalog.digest,
    build_hash: buildHash,
    engine_range: `^${runtimeVersion}`,
    target_root: toPosix(targetRoot),
    hook_ids: hookIds,
    assets,
    installed_at: new Date().toISOString(),
  };
  writeFileSync(join(targetRoot, '.design-everything/install-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}
