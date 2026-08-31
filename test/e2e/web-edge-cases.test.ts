import { expect, test, describe, afterEach, beforeEach } from 'vitest';
import { onSessionStart } from '../../src/adapters/claude/sessionStart.js';
import { onUserPromptSubmit } from '../../src/adapters/claude/userPromptSubmit.js';
import { onPreToolUse } from '../../src/adapters/claude/preToolUse.js';
import {
  loadScript,
  commitStep,
  stampTurn,
  emitTree,
  issueTurnCapability,
  initializeInterviewStore,
} from '../../src/core/index.js';
import { loadCanonicalProgress, commitViaCanonical, mutateCanonicalProgress } from '../helpers/canonicalProgress.js';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, rmSync, copyFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const testWorkspaceRoot = join(__dirname, '../../test/fixtures/progress/e2e-edge-workspace');

describe('E2E Web Edge Cases Flow', () => {
  beforeEach(() => {
    try {
      if (existsSync(testWorkspaceRoot)) {
        rmSync(testWorkspaceRoot, { recursive: true, force: true });
      }
    } catch {
      // Ignore
    }
    mkdirSync(join(testWorkspaceRoot, 'Design/Content/interview-script'), { recursive: true });
    copyFileSync(
      join(projectRoot, 'Design/Content/interview-script/script.yaml'),
      join(testWorkspaceRoot, 'Design/Content/interview-script/script.yaml')
    );
    copyFileSync(
      join(projectRoot, 'Design/Content/interview-script/gate-policy.yaml'),
      join(testWorkspaceRoot, 'Design/Content/interview-script/gate-policy.yaml')
    );
  });

  afterEach(() => {
    try {
      if (existsSync(testWorkspaceRoot)) {
        rmSync(testWorkspaceRoot, { recursive: true, force: true });
      }
    } catch {
      // Ignore
    }
  });

  test('Case (a): Trả lời lan man chưa xác nhận -> state đứng yên', () => {
    // 1. Initialize session
    onSessionStart({ workspaceRoot: testWorkspaceRoot });
    initializeInterviewStore(testWorkspaceRoot);
    let progress = loadCanonicalProgress(testWorkspaceRoot);
    expect(progress.current_step).toBe('CAL0');
    expect(progress.answered).toHaveLength(0);

    // 2. User replies with a verbose message
    const result1 = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-verbose-1' });
    expect(result1.decision).toBe('allow');

    // State DOES NOT advance because commitStep is not called (user has not confirmed the translate-back)
    progress = loadCanonicalProgress(testWorkspaceRoot);
    expect(progress.current_step).toBe('CAL0');
    expect(progress.answered).toHaveLength(0);

    // 3. User replies with another verbose message in the next turn
    const result2 = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot, userTurnId: 'turn-verbose-2' });
    expect(result2.decision).toBe('allow');

    progress = loadCanonicalProgress(testWorkspaceRoot);
    expect(progress.current_step).toBe('CAL0');
    expect(progress.answered).toHaveLength(0);
  });

  test('Case (b): Cố trả lời gộp nhiều câu/lượt -> chỉ commit 1 bước, rate limit chặn đứng nếu nhảy cóc', () => {
    const script = loadScript(join(testWorkspaceRoot, 'Design/Content/interview-script/script.yaml'));

    // 1. Initialize session
    onSessionStart({ workspaceRoot: testWorkspaceRoot });
    initializeInterviewStore(testWorkspaceRoot);

    // 2. User answers CAL0
    const p1 = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot });
    let progress = commitViaCanonical(testWorkspaceRoot, script, { capabilityToken: p1.capabilityToken! });

    expect(progress.current_step).toBe('S0');
    expect(progress.answered).toEqual(['CAL0']);

    // 3. Simulate bypass attempt: manually modifying canonical state to
    // answer S0 and S1 without a new turn stamp.
    progress = mutateCanonicalProgress(testWorkspaceRoot, (p) => ({
      ...p,
      answered: [...p.answered, 'S0', 'S1'],
    }));

    // 4. Next prompt submit must be BLOCKED because answered jumped by 2 since last turn stamp
    const result = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot });
    expect(result.decision).toBe('block');
    expect(result.message).toContain('Rate limit violation');
  });

  test('Case (c): Đổi nhánh sau S7 -> không rollback ngầm, bảo vệ nhánh đã cam kết', () => {
    const script = loadScript(join(testWorkspaceRoot, 'Design/Content/interview-script/script.yaml'));

    // 1. Initialize session and answer CAL0 -> S7
    onSessionStart({ workspaceRoot: testWorkspaceRoot });
    initializeInterviewStore(testWorkspaceRoot);
    let progress = loadCanonicalProgress(testWorkspaceRoot);

    const steps = ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];
    for (const step of steps) {
      const promptResult = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot });

      const opts: { capabilityToken: string; branchChoice?: string } = {
        capabilityToken: promptResult.capabilityToken!,
      };
      if (step === 'S7') {
        opts.branchChoice = 'web';
      }
      progress = commitViaCanonical(testWorkspaceRoot, script, opts);

      // Stamp turn ID as normal CLI/skill interaction would do, keeping
      // answered_len_at_last_turn in sync so the next loop iteration's
      // onUserPromptSubmit doesn't see a false rate-limit violation.
      progress = mutateCanonicalProgress(testWorkspaceRoot, (p) => stampTurn(p, p.answered.length));
    }

    expect(progress.branch).toBe('web');
    expect(progress.current_step).toBe('R1');

    // 2. User/Skill tries to commit a step forcing mobile branch choice
    // (issue a real capability for R1 first — a valid capability is required
    // before commitStep will even reach the branch-immutability check).
    const wrongIssued = issueTurnCapability(progress.state_revision || 0, {
      sessionId: progress.session_id || 'default-session',
      operationKind: 'interview',
      questionId: 'R1',
    });
    const progressWithWrongCap = { ...progress, pending_turn_capability: wrongIssued.capability };
    expect(() => {
      commitStep(progressWithWrongCap, script, { capabilityToken: wrongIssued.token, branchChoice: 'mobile' });
    }).toThrow('Cannot change branch once set. Current: web, New: mobile');

    // 3. Verify next step is still on web track and doesn't rollback
    progress = loadCanonicalProgress(testWorkspaceRoot);
    expect(progress.branch).toBe('web');
    expect(progress.current_step).toBe('R1');
  });

  test('Case (d): Gating edge cases - thiếu/đủ/thừa doc và emit anchor check ở Web', () => {
    const realTemplatesDir = join(projectRoot, 'Design/Content/doc-templates');
    const docsDir = join(testWorkspaceRoot, 'docs');
    onSessionStart({ workspaceRoot: testWorkspaceRoot });
    initializeInterviewStore(testWorkspaceRoot);

    // Fast-forward progress to docs-emitted phase
    mutateCanonicalProgress(testWorkspaceRoot, (p) => ({
      ...p,
      phase: 'docs-emitted',
      branch: 'web',
      current_step: null,
      answered: ['CAL0', 'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'R1', 'W1', 'W2', 'W3', 'W4', 'W5'],
    }));

    // 1. Missing docs (only write 00-vision and 01-personas, missing 02-scope)
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, '00-vision.md'), '# Vision\n<!-- anchor: id=00-vision/elevator-pitch status=planned -->', 'utf8');
    writeFileSync(join(docsDir, '01-personas.md'), '# Personas\n<!-- anchor: id=01-personas/primary-persona status=planned -->', 'utf8');

    // Pre-tool use check -> must deny writing code since scope-locked requires 02-scope.md
    const denyResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/index.ts' },
    });
    expect(denyResult.decision).toBe('deny');

    // 2. Extra doc (outside taxonomy, like 08-unknown.md) should not open gate incorrectly
    writeFileSync(join(docsDir, '08-unknown.md'), '# Unknown\n<!-- anchor: id=08-unknown/test status=planned -->', 'utf8');
    const denyResultWithExtra = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/index.ts' },
    });
    expect(denyResultWithExtra.decision).toBe('deny');

    // 3. Write missing 02-scope.md -> must now allow writing code
    writeFileSync(join(docsDir, '02-scope.md'), '# Scope\n<!-- anchor: id=02-scope/must-have status=planned -->', 'utf8');
    const allowResult = onPreToolUse({
      workspaceRoot: testWorkspaceRoot,
      tool: 'Write',
      toolInput: { path: 'src/index.ts' },
    });
    expect(allowResult.decision).toBe('allow');

    // 4. Emit tree checks for Web
    const answers: Record<string, string> = {
      CAL0: 'Fast', S0: 'A', S1: 'B', S2: 'C', S3: 'D', S4: 'E', S5: 'F', S6: 'Solo', S7: 'web',
      W1: 'Next', W2: 'CSS', W3: 'Vercel', W4: 'Auth', W5: 'NoRealtime'
    };
    const emittedDocs = emitTree(answers, 'web', realTemplatesDir);
    const docFilesOnly = emittedDocs.filter(d => !d.file.startsWith('.design-everything/'));
    expect(docFilesOnly).toHaveLength(12);

    const fileNames = docFilesOnly.map(d => d.file);
    expect(fileNames).toContain('07-deployment.md');
    expect(fileNames).not.toContain('07-release.md');

    // Verify all emitted docs have status=planned and correct web source path prefix (src/)
    for (const doc of docFilesOnly) {
      expect(doc.content).toContain('status=planned');
      if (doc.file !== 'README.md') {
        expect(doc.content).toContain('src=src/');
      }
    }
  });

  test('Case (e): Double-commit and capability replay edge cases ở Web', () => {
    const script = loadScript(join(testWorkspaceRoot, 'Design/Content/interview-script/script.yaml'));
    onSessionStart({ workspaceRoot: testWorkspaceRoot });
    initializeInterviewStore(testWorkspaceRoot);

    // Answer CAL0
    const promptResult = onUserPromptSubmit({ workspaceRoot: testWorkspaceRoot });
    const usedToken = promptResult.capabilityToken!;
    let progress = commitViaCanonical(testWorkspaceRoot, script, { capabilityToken: usedToken });

    expect(progress.current_step).toBe('S0');

    // B24b (D60) — CAL0's batch token also covers S0 (neither has
    // option_hints nor a critic), so reusing the SAME token to commit S0
    // must succeed — that's the entire point of D60: no fresh
    // UserPromptSubmit turn is required between two questions Core placed
    // in the same batch.
    progress = commitViaCanonical(testWorkspaceRoot, script, { capabilityToken: usedToken });
    expect(progress.current_step).toBe('S1');

    // The batch is now fully consumed (CAL0 and S0 both committed) —
    // reusing the token a third time must be rejected. This is the replay
    // protection that replaces the old duplicate-userTurnId check (X01/R01).
    expect(() => {
      commitStep(progress, script, { capabilityToken: usedToken });
    }).toThrow(/TURN_CAPABILITY_REPLAY/);
  });
});

function dirname(path: string): string {
  const parts = path.split(/[/\\]/);
  parts.pop();
  return parts.join('/');
}
