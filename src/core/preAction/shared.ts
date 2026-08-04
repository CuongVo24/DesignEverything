import { loadDeepenState } from '../deepenState.js';
import { authorizeMutation, type CatalogPathEntry } from '../artifactOwnership.js';
import { loadRuntimeCatalogFor } from '../runtimeCatalogLoader.js';
import { classifyCliSubcommand } from '../classifyCliSubcommand.js';

export type CliShellDecision = {
  decision: 'allow' | 'deny';
  reason_code: string;
  user_message: string;
};

/**
 * Proves the invocation is `node <cli.mjs|cli.js>` as the direct script
 * argument to node — not merely a command whose argv happens to contain the
 * literal string "cli.mjs"/"cli.js" somewhere (e.g. `node malicious.js
 * cli.mjs`), which the previous `argv.includes('cli.mjs')` check allowed.
 */
export function isCliInvocation(argv: string[]): boolean {
  if (argv.length < 2) return false;
  const exe = argv[0].toLowerCase().replace(/\.exe$/, '');
  if (exe !== 'node') return false;
  const script = argv[1].replace(/\\/g, '/');
  return script === 'cli.mjs' || script === 'cli.js' || script.endsWith('/cli.mjs') || script.endsWith('/cli.js');
}

/**
 * P8.2/P8.4 — the subcommand-level authority resolve-cli-invocation.mjs's
 * authorizeCliOperation used to apply on its own, now applied by Core so the
 * wrapper's decision and Core's decision can never diverge. Returns null for a
 * non-CLI shell command (fall through to classifyCommand as before); a missing
 * subcommand defaults to 'status', mirroring resolveCliInvocation.mjs.
 */
export function classifyCliShellCommand(argv: string[], phase: string | null | undefined): CliShellDecision | null {
  if (!isCliInvocation(argv)) return null;
  const subcommand = argv[2] || 'status';
  const result = classifyCliSubcommand(subcommand, phase);
  if (result.decision === 'allow') {
    return { decision: 'allow', reason_code: 'cli-allowed', user_message: 'CLI tool execution allowed.' };
  }
  return { decision: 'deny', reason_code: result.reason_code, user_message: result.message };
}

// P6 10.3 — best-effort, same degrade-to-empty pattern as collectDeepenPending:
// a missing/broken catalog must never turn the write gate into a hard crash, it
// just falls back to exact-path-only classification (today's behavior).
export function collectCatalogEntries(workspace: string): CatalogPathEntry[] {
  try {
    return loadRuntimeCatalogFor(workspace).artifacts;
  } catch {
    return [];
  }
}

/**
 * Soft warning B20a: opted-in deepen modules not yet emitted. Best-effort,
 * never throws (broken/missing deepen-state → []). Does NOT change enforcement.
 */
export function collectDeepenPending(workspace: string): string[] {
  try {
    const state = loadDeepenState(workspace);
    return (Object.keys(state.modules) as (keyof typeof state.modules)[]).filter(
      (m) => state.modules[m].opted_in && state.modules[m].emitted_at === null
    );
  } catch {
    return [];
  }
}

export { authorizeMutation };
export type { CatalogPathEntry };
