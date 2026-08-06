// A1-P9 (B4d) — post-install health: spawn the TARGET-LOCAL cli.mjs (not an
// in-process call) so this actually proves the installed layout resolves on
// its own. Extracted from install.mjs (#11).
import { execFileSync } from 'child_process';

export function runHealthCheck(targetRoot, liveCliPath) {
  try {
    const output = execFileSync('node', [liveCliPath, 'status', '--json'], {
      cwd: targetRoot,
      encoding: 'utf8',
    });
    return JSON.parse(output);
  } catch (err) {
    // A non-zero exit here is expected whenever the target legitimately
    // reports a non-ok status (e.g. MISSING_INTERVIEW_STORE — "installed but
    // not yet interviewed", the normal state right after a fresh install, or
    // on a repair rerun before init) — exitCodeFor maps error severities to
    // non-zero codes and execFileSync throws on any of them. Only treat this
    // as a real installer failure when stdout isn't even a parseable
    // envelope — i.e. target-local resolution itself is broken, not just
    // reporting an expected non-ready state.
    try {
      return JSON.parse(err.stdout);
    } catch {
      console.error(
        `Cài đặt thất bại: target-local CLI health check không chạy được sau khi activate (${err.message}).`
      );
      process.exit(1);
    }
  }
}
