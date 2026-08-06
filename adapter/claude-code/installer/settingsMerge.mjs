// A1-P9 (B4d) — .claude/settings.json hook wiring. Extracted from
// install.mjs (#11); also closes checklist #5/#7: hook identity now matches
// both the current versioned path AND a legacy absolute-ENGINE_ROOT command
// (pre-P9 installs pointed straight at the repo checkout), so a rerun
// migrates/repairs those in place instead of leaving a dead entry behind and
// adding a second, live one alongside it. Returns a structured
// changed/preserved/conflicts report instead of only mutating in silence.
import { join, dirname } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'fs';
import { toPosix } from './shared.mjs';

export const HOOK_ROLES = [
  { id: 'claude:session-start', event: 'SessionStart', matcher: null, file: 'session-start.mjs' },
  { id: 'claude:user-prompt-submit', event: 'UserPromptSubmit', matcher: null, file: 'user-prompt-submit.mjs' },
  {
    id: 'claude:pre-tool-use',
    event: 'PreToolUse',
    matcher: 'Write|Edit|MultiEdit|NotebookEdit|Bash',
    file: 'pre-tool-use.mjs',
  },
];

function identityPatterns(file) {
  const escapedFile = file.replace('.', '\\.');
  // No trailing `$` anchor: the real command string is `node "<path>"` — the
  // path is followed by a closing quote, not end-of-string.
  const versioned = new RegExp(`\\.design-everything/runtime/[^"']+/hooks/${escapedFile}`);
  // A pre-P9 install wrote `node "<ENGINE_ROOT>/adapter/claude-code/hooks/<file>"`
  // directly against the repo checkout. That path segment is unique enough to
  // this project that treating it as "ours" is safe without also matching an
  // unrelated user hook that merely happens to share a filename.
  const legacyAbsolute = new RegExp(`adapter[\\\\/]claude-code[\\\\/]hooks[\\\\/]${escapedFile}`, 'i');
  return { versioned, legacyAbsolute };
}

// Merges the DesignEverything hook roles into `settings.hooks` in place and
// returns { hookIds, report }. report.changed holds roles that were newly
// added or had a stale/legacy command repaired; report.preserved holds roles
// whose command already matched; report.conflicts holds roles where more
// than one matching entry was found (legacy + versioned coexisting) and the
// extras were removed.
export function mergeHookSettings(settings, targetRoot, runtimeRelDir) {
  settings.hooks = settings.hooks ?? {};
  const report = { changed: [], preserved: [], conflicts: [] };
  const hookIds = [];

  for (const role of HOOK_ROLES) {
    const hookAbsPath = toPosix(join(targetRoot, runtimeRelDir, 'hooks', role.file));
    const command = `node "${hookAbsPath}"`;
    const { versioned, legacyAbsolute } = identityPatterns(role.file);
    const isOurs = (cmd) => typeof cmd === 'string' && (versioned.test(cmd) || legacyAbsolute.test(cmd));

    const entries = (settings.hooks[role.event] = settings.hooks[role.event] ?? []);
    const matches = [];
    for (const entry of entries) {
      for (const h of entry.hooks ?? []) {
        if (isOurs(h.command)) matches.push(h);
      }
    }

    if (matches.length === 0) {
      const entry = { hooks: [{ type: 'command', command }] };
      if (role.matcher) entry.matcher = role.matcher;
      entries.push(entry);
      report.changed.push({ id: role.id, action: 'added' });
    } else {
      const [primary, ...duplicates] = matches;
      const wasStale = primary.command !== command;
      primary.command = command;
      if (duplicates.length > 0) {
        for (const entry of entries) {
          entry.hooks = (entry.hooks ?? []).filter((h) => !duplicates.includes(h));
        }
        report.conflicts.push({ id: role.id, removedDuplicates: duplicates.length });
      }
      report[wasStale ? 'changed' : 'preserved'].push({
        id: role.id,
        action: wasStale ? 'repaired' : 'unchanged',
      });
    }
    hookIds.push(role.id);
  }

  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = settings.hooks[event].filter((e) => (e.hooks ?? []).length > 0);
  }

  return { hookIds, report };
}

// Reads (backing up first) .claude/settings.json, merges hooks, writes it
// back, and removes the legacy "design" skill dir ("design" collided with
// Claude Code's built-in /design command, renamed to "design-everything").
export function applySettings(targetRoot, runtimeRelDir, backupDir) {
  const claudeDir = join(targetRoot, '.claude');
  mkdirSync(claudeDir, { recursive: true });
  const settingsPath = join(claudeDir, 'settings.json');

  let settings = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    } catch (e) {
      console.error(`settings.json hiện tại không parse được (${e.message}); sửa tay rồi chạy lại.`);
      process.exit(1);
    }
    const settingsBackupPath = join(backupDir, '.claude/settings.json.bak');
    mkdirSync(dirname(settingsBackupPath), { recursive: true });
    copyFileSync(settingsPath, settingsBackupPath);
  }

  const { hookIds, report } = mergeHookSettings(settings, targetRoot, runtimeRelDir);
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

  const legacySkillDir = join(claudeDir, 'skills', 'design');
  if (existsSync(join(legacySkillDir, 'SKILL.md'))) {
    rmSync(legacySkillDir, { recursive: true, force: true });
  }
  return { hookIds, report };
}
