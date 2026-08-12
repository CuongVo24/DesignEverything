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
export const RUNTIME_VERSION = '8.0.0';

/**
 * Stable command surface inside every installed target. Both installers stage
 * the same versioned launcher under this relative path, so recovery guidance
 * must never point back into the DesignEverything development checkout.
 */
export const TARGET_LOCAL_CLI_COMMAND = `node ".design-everything/runtime/${RUNTIME_VERSION}/cli.mjs"`;
export const TARGET_LOCAL_INIT_COMMAND = `${TARGET_LOCAL_CLI_COMMAND} init`;

export function targetLocalCliCommand(args = ''): string {
  return args ? `${TARGET_LOCAL_CLI_COMMAND} ${args}` : TARGET_LOCAL_CLI_COMMAND;
}
