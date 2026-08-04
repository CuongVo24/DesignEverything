import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { renderProgressLog, ExecutionState } from '../../../core/index.js';

/** Value of a `--flag value` pair, or undefined (value must not itself be a flag). */
export function getArg(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  return idx !== -1 && idx + 1 < argv.length && !argv[idx + 1].startsWith('--') ? argv[idx + 1] : undefined;
}

/** Presence of a boolean `--flag`. */
export function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

/** Render + write docs/progress-log.md; returns its path, or null on failure. */
export function writeProgressLog(workspaceRoot: string, plan: any, state: ExecutionState): string | null { // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    const md = renderProgressLog({ plan, state });
    mkdirSync(join(workspaceRoot, 'docs'), { recursive: true });
    writeFileSync(join(workspaceRoot, 'docs', 'progress-log.md'), md, 'utf8');
    return 'docs/progress-log.md';
  } catch {
    return null;
  }
}

/** Read a numeric count out of a `| label | N |` markdown table row. */
export function readBreakCount(filePath: string, label: string): number {
  try {
    const content = readFileSync(filePath, 'utf8');
    const match = content.match(new RegExp(`\\|\\s*${label}\\s*\\|\\s*(\\d+)\\s*\\|`));
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
}
