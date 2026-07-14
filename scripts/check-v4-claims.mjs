/* global console, process */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = join(__dirname, '..');

function checkClaims() {
  const reportPath = join(ENGINE_ROOT, 'Design/RoadMap/v4-newbie-evaluation-report.md');
  const matrixPath = join(ENGINE_ROOT, 'Design/Adapters/ConformanceMatrix.md');
  const readmePath = join(ENGINE_ROOT, 'README.md');

  if (!existsSync(reportPath)) {
    console.error(`Missing evaluation report at ${reportPath}`);
    process.exit(1);
  }

  const report = readFileSync(reportPath, 'utf8');
  const matrix = existsSync(matrixPath) ? readFileSync(matrixPath, 'utf8') : '';
  const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : '';

  // 1. Verify Newbie Completion Rate >= 80%
  // Extract completion rate from the aggregate table
  // Ex: | **Claude Code** (Hard Gate) | 3 | 100.0% | 13.6 phút | 1.3 lần / phiên | 0.0% |
  // Ex: | **Codex Plugin** (Soft Gate) | 3 | 66.7% | 14.5 phút | 1.3 lần / phiên | 33.3% |
  // Parse each adapter row's sample size and completion rate from the aggregate
  // table, then compute the combined rate from the ACTUAL numbers rather than
  // hard-coding a 5/6 result.
  const parseRow = (label) => {
    const re = new RegExp(`\\|\\s*\\*\\*${label}\\*\\*[^\\n|]*\\|\\s*(\\d+)\\s*\\|\\s*([\\d.]+)%`);
    const m = report.match(re);
    if (!m) return null;
    return { sample: parseInt(m[1], 10), rate: parseFloat(m[2]) };
  };

  const claude = parseRow('Claude Code');
  if (!claude) {
    console.error('Failed to parse Claude Code completion rate in evaluation report.');
    process.exit(1);
  }
  console.log(`- Claude Code pilot completion rate: ${claude.rate}% (n=${claude.sample})`);

  if (claude.sample < 3) {
    console.error(`Sample size for Claude Code (${claude.sample}) is too small. Expected at least 3.`);
    process.exit(1);
  }

  const rows = [claude];
  const codex = parseRow('Codex Plugin');
  if (codex) {
    console.log(`- Codex Plugin pilot completion rate: ${codex.rate}% (n=${codex.sample})`);
    rows.push(codex);
  } else {
    console.warn('- WARNING: Codex Plugin row not found; combined rate uses Claude Code only.');
  }

  // completed = round(rate% * sample); combined = sum(completed) / sum(sample).
  const totalCompleted = rows.reduce((acc, r) => acc + Math.round((r.rate / 100) * r.sample), 0);
  const totalSample = rows.reduce((acc, r) => acc + r.sample, 0);
  const combinedRate = totalSample > 0 ? (totalCompleted / totalSample) * 100 : 0;

  if (combinedRate < 80) {
    console.error(`Combined newbie completion rate is ${combinedRate.toFixed(1)}% (${totalCompleted}/${totalSample}, expected >= 80%).`);
    process.exit(1);
  }

  console.log(`- Combined completion rate validated: ${combinedRate.toFixed(1)}% (${totalCompleted}/${totalSample}, Success >= 80%)`);

  // 2. Lint Matrix for unsupported claims
  // Ensure that no unsupported adapters are claimed as "Hard Gate" or "Completed"
  const lines = matrix.split('\n');
  for (const line of lines) {
    if (line.includes('|') && (line.includes('Antigravity') || line.includes('Windsurf') || line.includes('Continue'))) {
      if (line.includes('✅') || line.includes('Hard Gate')) {
        console.error(`Invalid claim in ConformanceMatrix: Unsupported adapter has completed/hard gate status: "${line.trim()}"`);
        process.exit(1);
      }
    }
  }
  console.log('- Conformance Matrix claims validated successfully.');

  // 3. Lint README for exaggerated enforcement statements
  if (readme.includes('Antigravity Hard Gate') || readme.includes('Windsurf Hard Gate')) {
    console.error('README makes unsupported "Hard Gate" claims for Antigravity or Windsurf.');
    process.exit(1);
  }
  console.log('- README claims validated successfully.');

  console.log('All release claims verified successfully.');
}

checkClaims();
