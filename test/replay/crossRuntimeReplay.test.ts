import { test, expect, describe } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = join(__dirname, '../..');

describe('Cross-runtime Replay Benchmark', () => {
  test('should run cross-runtime replay script and produce a report with passing statuses', () => {
    const replayScript = join(ENGINE_ROOT, 'scripts/run-cross-runtime-replay.mjs');
    const reportPath = join(ENGINE_ROOT, 'Design/RoadMap/evidence/v4-replay-report.md');

    // Run replay script
    const output = execSync(`node "${replayScript}"`, { cwd: ENGINE_ROOT }).toString('utf8');
    expect(output).toContain('Cross-runtime replay passed:');

    // Verify report existence and contents
    expect(existsSync(reportPath)).toBe(true);
    const reportContent = readFileSync(reportPath, 'utf8');

    // Ensure all checked items in the report have PASS status
    expect(reportContent).toContain('node-cli');
    expect(reportContent).toContain('vite-web');
    expect(reportContent).toContain('python-cli');
    expect(reportContent).not.toContain('FAIL');
    expect(reportContent).toContain('PASS');
  });
});
