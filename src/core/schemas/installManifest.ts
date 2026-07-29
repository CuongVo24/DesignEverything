import { z } from 'zod';

export const installManifestAssetSchema = z.object({
  // Target-relative, forward-slash path (e.g. ".design-everything/runtime/6.0.0/runtime.mjs").
  path: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  kind: z.enum(['runtime', 'launcher', 'hook', 'skill', 'policy', 'template', 'catalog']),
});
export type InstallManifestAsset = z.infer<typeof installManifestAssetSchema>;

/**
 * P9 (bonus-plan Phase 4) — written by adapter/claude-code/install.mjs and
 * adapter/codex-plugin/install.mjs, LAST, only after every staged asset has
 * been verified and atomically activated. Read by src/core/runtimeHealth.ts
 * (DEBT3.2, Phase 5) to hash-verify the installed target is intact and to
 * confirm every declared hook is actually wired in the adapter's own
 * settings/config file.
 */
export const installManifestSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/), // manifest schema version, not the runtime version
  adapter: z.enum(['claude-code', 'codex']),
  runtime_version: z.string().min(1),
  catalog_version: z.string().min(1),
  catalog_digest: z.string().regex(/^[0-9a-f]{64}$/),
  build_hash: z.string().regex(/^[0-9a-f]{64}$/), // sha256 of dist/bundle/runtime.mjs
  engine_range: z.string().min(1),
  target_root: z.string().min(1),
  hook_ids: z.array(z.string()),
  assets: z.array(installManifestAssetSchema),
  installed_at: z.string().datetime(),
});
export type InstallManifest = z.infer<typeof installManifestSchema>;
