import { readFileSync } from 'fs';

// PermissionRequest is NOT a general-purpose interceptor for DesignEverything.
// Enforcement happens in PreToolUse; here we must not blanket-approve actions
// (that would bypass Codex's own approval prompts). We simply return no decision
// so Codex's native approval flow proceeds unchanged, and never fail open into
// an implicit allow.
async function main() {
  try {
    const inputStr = readFileSync(0, 'utf8');
    if (inputStr && inputStr.trim()) {
      JSON.parse(inputStr);
    }
  } catch {
    // Ignore malformed payloads: emitting nothing leaves Codex's default
    // approval behavior in place (we do not auto-allow).
  }
  // Emit no hookSpecificOutput.decision -> Codex applies its normal policy.
  console.log(JSON.stringify({}));
}

main();
