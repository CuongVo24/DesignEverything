// A1-P9 (B4d) — backup-then-copy each staged asset into place. Extracted
// from install.mjs (#11). Never deletes an existing live file without
// backing it up first; a crash here just leaves some assets already-promoted
// and others not yet, which a rerun repairs (promotion is idempotent).
import { join, dirname } from 'path';
import { existsSync, mkdirSync, copyFileSync } from 'fs';

export function promoteAssets(targetRoot, stagingRoot, assets, backupDir) {
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
}
