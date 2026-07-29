import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, cpSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync, execFileSync } from 'child_process';
import { calculatePlanDigest, calculateDocsDigest, loadEmittedDocs } from '../../../src/core/validatedSnapshot.js';
import { ExecutionPlanV3 } from '../../../src/core/schemas/index.js';
import { initializeInterviewStore } from '../../../src/core/interviewStore.js';

const REPO_ROOT = join(__dirname, '../../..');
const INSTALLER = join(REPO_ROOT, 'adapter/claude-code/install.mjs');

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: string;
    permissionDecision: string;
    permissionDecisionReason: string;
  };
}

/**
 * B5a (X18 fix) — every test below runs against a REAL installed target
 * (adapter/claude-code/install.mjs), spawning the actual target-local
 * hooks/CLI it produces, not the repo-root dev-mode hooks and not an
 * in-process TS import. Installing is done ONCE in beforeAll (an install
 * takes real wall-clock time); each test still gets its own fresh
 * workspace directory for state (progress.json / canonical store /
 * execution-state), completely separate from where the installed
 * runtime/hooks/cli.mjs themselves live — that separation is exactly what
 * lets one install serve every test cheaply.
 */
describe('B5a — Adversarial Hook Protection Suite (U01-U04, X01-X24)', () => {
  let installedRoot: string;
  let cliPath: string;
  let preToolHook: string;
  let userPromptHook: string;
  let tmpDir: string;

  beforeAll(() => {
    installedRoot = join(tmpdir(), `de-adversarial-install-${Date.now()}`);
    mkdirSync(installedRoot, { recursive: true });
    execFileSync('node', [INSTALLER, installedRoot], { encoding: 'utf8' });

    const manifest = JSON.parse(
      readFileSync(join(installedRoot, '.design-everything/install-manifest.json'), 'utf8')
    );
    const version = manifest.runtime_version as string;
    const runtimeDir = join(installedRoot, '.design-everything/runtime', version);
    cliPath = join(runtimeDir, 'cli.mjs');
    preToolHook = join(runtimeDir, 'hooks/pre-tool-use.mjs');
    userPromptHook = join(runtimeDir, 'hooks/user-prompt-submit.mjs');
  });

  afterAll(() => {
    if (existsSync(installedRoot)) rmSync(installedRoot, { recursive: true, force: true });
  });

  beforeEach(() => {
    tmpDir = join(tmpdir(), `de-adversarial-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });

    // Setup base interview script
    const designDir = join(tmpDir, 'Design/Content/interview-script');
    mkdirSync(designDir, { recursive: true });
    cpSync(join(REPO_ROOT, 'Design/Content/interview-script'), designDir, { recursive: true });

    // Base progress.json in interview phase
    const progress = {
      version: '4.0.0',
      phase: 'interview',
      branch: 'web',
      calibrate_mode: 'fast',
      current_step: 'S1',
      answered: [],
      emitted_docs: [],
      gates_passed: [],
      last_user_turn_id: null,
      answered_len_at_last_turn: 0,
      updated_at: new Date().toISOString(),
    };
    writeFileSync(join(tmpDir, 'progress.json'), JSON.stringify(progress, null, 2), 'utf8');
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function runHook(hookPath: string, payload: Record<string, unknown>): HookOutput | null {
    const raw = execSync(`node "${hookPath}"`, {
      input: JSON.stringify(payload),
      encoding: 'utf8',
      cwd: tmpDir,
    });
    return raw && raw.trim() ? (JSON.parse(raw) as HookOutput) : null;
  }

  function runCli(args: string[]): Record<string, unknown> {
    try {
      const out = execFileSync('node', [cliPath, ...args, '--json'], { encoding: 'utf8', cwd: tmpDir });
      return JSON.parse(out);
    } catch (err: unknown) {
      const stdout = (err as { stdout?: string }).stdout;
      if (stdout) return JSON.parse(stdout);
      throw err;
    }
  }

  // --- Category A0: canonical-only workspace must not bypass the hooks ---
  // (P2.2a) The .mjs hook wrappers used to fast-exit whenever progress.json
  // was absent — a real production regression once progress.json stops
  // being written at all, since every unit test in this suite (and this
  // file's own beforeEach) always seeds progress.json, masking the bug. A
  // freshly `init`-ed project only ever has the canonical store.

  it('should NOT bypass PreToolUse when only the canonical interview store exists (no progress.json)', () => {
    const canonicalOnlyDir = join(tmpdir(), `de-canonical-only-${Date.now()}`);
    mkdirSync(canonicalOnlyDir, { recursive: true });
    const designDir = join(canonicalOnlyDir, 'Design/Content/interview-script');
    mkdirSync(designDir, { recursive: true });
    cpSync(join(REPO_ROOT, 'Design/Content/interview-script'), designDir, { recursive: true });
    initializeInterviewStore(canonicalOnlyDir);
    expect(existsSync(join(canonicalOnlyDir, 'progress.json'))).toBe(false);

    try {
      const raw = execSync(`node "${preToolHook}"`, {
        input: JSON.stringify({
          cwd: canonicalOnlyDir,
          tool_name: 'Write',
          tool_input: { file_path: 'src/index.ts' },
        }),
        encoding: 'utf8',
      });
      const result = raw && raw.trim() ? (JSON.parse(raw) as HookOutput) : null;
      expect(result).not.toBeNull();
      expect(result!.hookSpecificOutput.permissionDecision).toBe('deny');
    } finally {
      rmSync(canonicalOnlyDir, { recursive: true, force: true });
    }
  });

  it('should NOT bypass UserPromptSubmit when only the canonical interview store exists (no progress.json)', () => {
    const canonicalOnlyDir = join(tmpdir(), `de-canonical-only-ups-${Date.now()}`);
    mkdirSync(canonicalOnlyDir, { recursive: true });
    const designDir = join(canonicalOnlyDir, 'Design/Content/interview-script');
    mkdirSync(designDir, { recursive: true });
    cpSync(join(REPO_ROOT, 'Design/Content/interview-script'), designDir, { recursive: true });
    initializeInterviewStore(canonicalOnlyDir);

    try {
      const raw = execSync(`node "${userPromptHook}"`, {
        input: JSON.stringify({ cwd: canonicalOnlyDir, prompt: 'Hello' }),
        encoding: 'utf8',
      });
      // A real, non-bypassed run injects the current question's capability
      // context; a silently-bypassed run prints nothing at all.
      expect(raw.trim().length).toBeGreaterThan(0);
      const result = JSON.parse(raw) as { hookSpecificOutput?: { additionalContext?: string } };
      expect(result.hookSpecificOutput?.additionalContext).toContain('Capability Token');
    } finally {
      rmSync(canonicalOnlyDir, { recursive: true, force: true });
    }
  });

  // --- Category A: TURN Token & Session Integrity ---

  it('X01 — should deny forged capability token in commit CLI call', () => {
    // Real UserPromptSubmit issues a real capability for the current step.
    runHook(userPromptHook, { cwd: tmpDir, prompt: 'Hello' });

    // Attempting to run CLI commit with a forged capability token — the
    // exact TURN_CAPABILITY_FORGED reason code must surface, not a generic
    // COMMIT_FAILED (B1a/B4c: --turn is no longer a recognized flag at all).
    const res = runCli(['commit', '--capability-token', 'forged-token-xyz', '--answer', 'Dự án hệ thống quản lý dữ liệu lớn']);

    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('TURN_CAPABILITY_FORGED');
  });

  it('X01b — should deny commit with missing capability token entirely', () => {
    const res = runCli(['commit', '--answer', 'Dự án hệ thống quản lý dữ liệu lớn']);

    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('TURN_CAPABILITY_MISSING');
  });

  it('X01c — should deny replay of an already-consumed capability token via CLI commit', () => {
    const promptRaw = runHook(userPromptHook, { cwd: tmpDir, prompt: 'Hello' }) as unknown as {
      hookSpecificOutput?: { additionalContext?: string };
    } | null;
    const additionalContext = promptRaw?.hookSpecificOutput?.additionalContext ?? '';
    const tokenMatch = additionalContext.match(/\[Capability Token[^\]]*\]\n([0-9a-f]+)/);
    expect(tokenMatch).toBeTruthy();
    const token = tokenMatch![1];

    const first = runCli(['commit', '--capability-token', token, '--answer', 'Answer A']);
    expect(first.ok).toBe(true);

    const replay = runCli(['commit', '--capability-token', token, '--answer', 'Answer B']);
    expect(replay.ok).toBe(false);
    expect(replay.reason_code).toBe('TURN_CAPABILITY_REPLAY');
  });

  it('P8 — PreToolUse denies an unrecognized CLI subcommand instead of defaulting to allow', () => {
    const res = runHook(preToolHook, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: { command: `node "${cliPath}" totally-not-a-real-subcommand` },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(res?.hookSpecificOutput.permissionDecisionReason).toContain('totally-not-a-real-subcommand');
  });

  it('P8 — PreToolUse authorizes CLI deepen from the real canonical phase, not a hardcoded interview default', () => {
    // Prior to this fix, authorizeCliOperation was always called with a null
    // runtime snapshot, so `deepen` was denied unconditionally regardless of
    // the workspace's real phase. Seed a post-interview phase and confirm the
    // real canonical phase is what the decision is now based on.
    const progress = {
      version: '4.0.0',
      phase: 'ready-to-build',
      branch: 'web',
      calibrate_mode: 'fast',
      current_step: null,
      answered: ['S0', 'S1'],
      emitted_docs: ['docs/01-vision.md'],
      gates_passed: ['interview_done'],
      last_user_turn_id: 'turn-1',
      answered_len_at_last_turn: 2,
      updated_at: new Date().toISOString(),
    };
    writeFileSync(join(tmpDir, 'progress.json'), JSON.stringify(progress, null, 2), 'utf8');

    // Allow produces no stdout at all (early process.exit(0)), so a null
    // result IS the positive assertion here — a deny would emit JSON.
    const res = runHook(preToolHook, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: { command: `node "${cliPath}" deepen --module m1` },
    });
    expect(res).toBeNull();
  });

  it('P8.4 — PreToolUse denies CLI commit once the real phase is past interview, through the single collapsed authority', () => {
    // authorizeCliOperation (deleted) used to decide this on its own,
    // separately from evaluatePreAction. Now there is exactly one
    // authority — this proves the real wrapper reaches the same
    // COMMIT_NOT_ALLOWED decision evaluatePreAction.test.ts's unit-level
    // "P8.2" suite already pins for the pure function.
    const progress = {
      version: '4.0.0',
      phase: 'ready-to-build',
      branch: 'web',
      calibrate_mode: 'fast',
      current_step: null,
      answered: ['S0', 'S1'],
      emitted_docs: ['docs/01-vision.md'],
      gates_passed: ['interview_done'],
      last_user_turn_id: 'turn-1',
      answered_len_at_last_turn: 2,
      updated_at: new Date().toISOString(),
    };
    writeFileSync(join(tmpDir, 'progress.json'), JSON.stringify(progress, null, 2), 'utf8');

    const res = runHook(preToolHook, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: { command: `node "${cliPath}" commit --capability-token x` },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(res?.hookSpecificOutput.permissionDecisionReason).toContain('trong pha phỏng vấn');
  });

  it('P8.4 — a quoted CLI argument containing a space reaches Core intact through the real wrapper (not re-split)', () => {
    // Regression guard for P8.3's commandArgv threading: before it, the
    // wrapper's own quote-aware tokens were discarded and onPreToolUse
    // re-split the raw command string, which would have torn
    // "hello world" into separate broken tokens.
    const res = runHook(preToolHook, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: {
        command: `node "${cliPath}" commit --capability-token x --answer-text "hello world"`,
      },
    });
    // interview phase (this suite's default seeded progress.json) allows
    // commit unconditionally — a real deny here would mean the quoted
    // argument was mangled into something classifyCliSubcommand choked on.
    expect(res).toBeNull();
  });

  // --- Category B: Managed File Tampering Bypasses ---

  it('X05 — should deny direct Write to progress.json', () => {
    const res = runHook(preToolHook, {
      cwd: tmpDir,
      tool_name: 'Write',
      tool_input: { file_path: join(tmpDir, 'progress.json') },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('X06 — should deny direct Edit to Design/.interview/answers.json', () => {
    const res = runHook(preToolHook, {
      cwd: tmpDir,
      tool_name: 'Edit',
      tool_input: { file_path: join(tmpDir, 'Design/.interview/answers.json') },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('X07 — should deny direct Write to src/app.ts during interview phase', () => {
    const res = runHook(preToolHook, {
      cwd: tmpDir,
      tool_name: 'Write',
      tool_input: { file_path: join(tmpDir, 'src/app.ts') },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  // --- Category C: Command Chaining & Destruction Bypasses ---

  it('X10 — should deny destructive git commands (git clean -fdx, git restore)', () => {
    const resClean = runHook(preToolHook, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: { command: 'git clean -fdx' },
    });
    expect(resClean?.hookSpecificOutput.permissionDecision).toBe('deny');

    const resRestore = runHook(preToolHook, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: { command: 'git restore progress.json' },
    });
    expect(resRestore?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('X12 — should deny find -delete / find -exec destructive commands', () => {
    const res = runHook(preToolHook, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: { command: 'find . -name "*.json" -delete' },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('X15 — should deny command chaining (&&, ;, |) wrapping CLI calls', () => {
    const res = runHook(preToolHook, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: { command: `echo hello && node "${cliPath}" status` },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('X18 — should deny nested powershell/cmd invocation attempting shell bypass', () => {
    const res = runHook(preToolHook, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: { command: 'powershell -Command "Remove-Item progress.json"' },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  // --- Category D: Corrupted & Missing Assets ---

  it('X20 — should fail closed (deny code write) when progress.json is corrupt', () => {
    writeFileSync(join(tmpDir, 'progress.json'), 'invalid json{', 'utf8');

    const res = runHook(preToolHook, {
      cwd: tmpDir,
      tool_name: 'Write',
      tool_input: { file_path: join(tmpDir, 'src/index.ts') },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  // --- Category E: Phase Gate Transitions ---

  it('X22 — should deny code write when docs are emitted but plan is NOT validated (needs-validation)', () => {
    // Set state to docs-emitted / plan-validating
    const progress = {
      version: '4.0.0',
      phase: 'interview',
      branch: 'web',
      calibrate_mode: 'fast',
      current_step: null,
      answered: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'W1', 'W2', 'W3', 'W4', 'W5'],
      emitted_docs: ['docs/01-vision.md'],
      gates_passed: ['interview_done'],
      last_user_turn_id: 'turn-1',
      answered_len_at_last_turn: 14,
      updated_at: new Date().toISOString(),
    };
    writeFileSync(join(tmpDir, 'progress.json'), JSON.stringify(progress, null, 2), 'utf8');

    const res = runHook(preToolHook, {
      cwd: tmpDir,
      tool_name: 'Write',
      tool_input: { file_path: join(tmpDir, 'src/app.ts') },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('X24 — should ALLOW code write ONLY when state is ready-to-execute or executing AND path is in allowed_paths', () => {
    const plan: ExecutionPlanV3 = {
      metadata: { version: '3.0.0', updated_at: new Date().toISOString() },
      trace_links: [],
      risks: [],
      milestones: [{ id: 'M0-discovery', title: 'Discovery', tasks: ['T1-scaffold'] }],
      tasks: {
        'T1-scaffold': {
          id: 'T1-scaffold',
          type: 'spike',
          milestone: 'M0-discovery',
          intent: 'Scaffold',
          depends_on: [],
          allowed_paths: ['src/app.ts'],
          preconditions: [],
          commands: [],
          expected_result: 'Pass',
          evidence_required: [],
          failure_policy: 'abort',
        },
      },
      capabilities_evidence: [],
      discovery_status: 'pass',
    };

    const execDir = join(tmpDir, '.design-everything');
    mkdirSync(execDir, { recursive: true });
    const execPlanPath = join(execDir, 'execution-plan.json');
    writeFileSync(execPlanPath, JSON.stringify(plan, null, 2), 'utf8');

    const docs = loadEmittedDocs(tmpDir, execPlanPath);
    const state = {
      version: '4.0.0',
      phase: 'executing' as const,
      active_task: 'T1-scaffold',
      active_milestone: 'M0-discovery',
      completed_tasks: [],
      evidence: [],
      block_reason: null,
      validated_plan_digest: calculatePlanDigest(plan),
      validated_docs_digest: calculateDocsDigest(docs),
      validation_result_digest: 'pass',
      plan_revision: 1,
      amendment_history: [],
      open_break_tasks: [],
      reviewed_milestones: [],
      updated_at: new Date().toISOString(),
    };
    writeFileSync(join(execDir, 'execution-state.json'), JSON.stringify(state, null, 2), 'utf8');

    // Allowed path src/app.ts -> exit 0 without deny payload (null)
    const resAllowed = runHook(preToolHook, {
      cwd: tmpDir,
      tool_name: 'Write',
      tool_input: { file_path: join(tmpDir, 'src/app.ts') },
    });
    expect(resAllowed).toBeNull(); // exit 0 allows

    // Unallowed path src/unauthorized.ts -> should deny
    const resDenied = runHook(preToolHook, {
      cwd: tmpDir,
      tool_name: 'Write',
      tool_input: { file_path: join(tmpDir, 'src/unauthorized.ts') },
    });
    expect(resDenied?.hookSpecificOutput.permissionDecision).toBe('deny');
  });
});
