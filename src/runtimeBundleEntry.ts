/**
 * P9 (bonus-plan Phase 4) — single entry point esbuild bundles into one
 * self-contained ESM file (`dist/bundle/runtime.mjs`, with zod/yaml inlined,
 * no `node_modules` dependency at the install target). Every hook wrapper
 * and CLI launcher a target-local install ships imports ONLY this file —
 * never the raw `dist/src/**` tree, and never a path back into the source
 * checkout it was installed from.
 *
 * Re-exports the full core surface (`runCliOperation`, `evaluatePreAction`,
 * `matchesPathPattern`, `ensureCanonicalStore`, `RUNTIME_VERSION`, …) plus
 * the three Claude-adapter hook entry points that live outside the core
 * barrel (`onPreToolUse`, `onSessionStart`, `onUserPromptSubmit`) and the
 * Codex-adapter post-tool-use audit filter (`filterUnexpectedFiles`) — the
 * exact set adapter/claude-code/hooks/*.mjs and adapter/codex-plugin/
 * hooks/*.mjs import today via resolveModule()/resolveCorePath().
 */
export * from './core/index.js';
export { onPreToolUse } from './adapters/claude/preToolUse.js';
export { onSessionStart } from './adapters/claude/sessionStart.js';
export { onUserPromptSubmit } from './adapters/claude/userPromptSubmit.js';
export { filterUnexpectedFiles } from './adapters/codex/filterUnexpectedFiles.js';
