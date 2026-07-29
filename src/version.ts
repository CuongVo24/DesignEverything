/**
 * P9 (bonus-plan Phase 4) — single source of truth for the runtime version
 * string every CLI/hook envelope reports. Previously ~30 call sites each
 * hardcoded the literal `'6.0.0'` independently (cliOperations.ts, both
 * cli.mjs launchers); a version bump meant hunting down every literal by
 * hand with no compiler help if one was missed.
 *
 * `scripts/check-version-sync.mjs` asserts this equals package.json's
 * `version` field, so this constant and the package version can never
 * silently drift apart.
 */
export const RUNTIME_VERSION = '6.0.0';
