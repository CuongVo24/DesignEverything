import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, cpSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { runCliOperation } from '../../../src/adapters/shared/cliOperations.js';
import { calculatePlanDigest, calculateDocsDigest, loadEmittedDocs } from '../../../src/core/validatedSnapshot.js';
import { ExecutionPlanV3 } from '../../../src/core/schemas/index.js';
import { initializeInterviewStore } from '../../../src/core/interviewStore.js';

const REPO_ROOT = join(__dirname, '../../..');
const PRE_TOOL_HOOK = join(REPO_ROOT, 'adapter/claude-code/hooks/pre-tool-use.mjs');
const USER_PROMPT_HOOK = join(REPO_ROOT, 'adapter/claude-code/hooks/user-prompt-submit.mjs');

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: string;
    permissionDecision: string;
    permissionDecisionReason: string;
  };
}

describe('B5a — Adversarial Hook Protection Suite (U01-U04, X01-X24)', () => {
  let tmpDir: string;

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
      const raw = execSync(`node "${PRE_TOOL_HOOK}"`, {
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
      const raw = execSync(`node "${USER_PROMPT_HOOK}"`, {
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

  it('X01 — should deny forged capability token in commit CLI call', async () => {
    // Real UserPromptSubmit issues a real capability for the current step.
    runHook(USER_PROMPT_HOOK, { cwd: tmpDir, prompt: 'Hello' });

    // Attempting to run CLI commit with a forged capability token — the
    // exact TURN_CAPABILITY_FORGED reason code must surface, not a generic
    // COMMIT_FAILED (B1a/B4c: --turn is no longer a recognized flag at all).
    const res = await runCliOperation(tmpDir, [
      'commit',
      '--capability-token',
      'forged-token-xyz',
      '--answer',
      'Dự án hệ thống quản lý dữ liệu lớn',
    ]);

    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('TURN_CAPABILITY_FORGED');
  });

  it('X01b — should deny commit with missing capability token entirely', async () => {
    const res = await runCliOperation(tmpDir, [
      'commit',
      '--answer',
      'Dự án hệ thống quản lý dữ liệu lớn',
    ]);

    expect(res.ok).toBe(false);
    expect(res.reason_code).toBe('TURN_CAPABILITY_MISSING');
  });

  it('X01c — should deny replay of an already-consumed capability token via CLI commit', async () => {
    const promptRaw = runHook(USER_PROMPT_HOOK, { cwd: tmpDir, prompt: 'Hello' }) as unknown as {
      hookSpecificOutput?: { additionalContext?: string };
    } | null;
    const additionalContext = promptRaw?.hookSpecificOutput?.additionalContext ?? '';
    const tokenMatch = additionalContext.match(/\[Capability Token[^\]]*\]\n([0-9a-f]+)/);
    expect(tokenMatch).toBeTruthy();
    const token = tokenMatch![1];

    const first = await runCliOperation(tmpDir, ['commit', '--capability-token', token, '--answer', 'Answer A']);
    expect(first.ok).toBe(true);

    const replay = await runCliOperation(tmpDir, ['commit', '--capability-token', token, '--answer', 'Answer B']);
    expect(replay.ok).toBe(false);
    expect(replay.reason_code).toBe('TURN_CAPABILITY_REPLAY');
  });

  // --- Category B: Managed File Tampering Bypasses ---

  it('X05 — should deny direct Write to progress.json', () => {
    const res = runHook(PRE_TOOL_HOOK, {
      cwd: tmpDir,
      tool_name: 'Write',
      tool_input: { file_path: join(tmpDir, 'progress.json') },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('X06 — should deny direct Edit to Design/.interview/answers.json', () => {
    const res = runHook(PRE_TOOL_HOOK, {
      cwd: tmpDir,
      tool_name: 'Edit',
      tool_input: { file_path: join(tmpDir, 'Design/.interview/answers.json') },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('X07 — should deny direct Write to src/app.ts during interview phase', () => {
    const res = runHook(PRE_TOOL_HOOK, {
      cwd: tmpDir,
      tool_name: 'Write',
      tool_input: { file_path: join(tmpDir, 'src/app.ts') },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  // --- Category C: Command Chaining & Destruction Bypasses ---

  it('X10 — should deny destructive git commands (git clean -fdx, git restore)', () => {
    const resClean = runHook(PRE_TOOL_HOOK, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: { command: 'git clean -fdx' },
    });
    expect(resClean?.hookSpecificOutput.permissionDecision).toBe('deny');

    const resRestore = runHook(PRE_TOOL_HOOK, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: { command: 'git restore progress.json' },
    });
    expect(resRestore?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('X12 — should deny find -delete / find -exec destructive commands', () => {
    const res = runHook(PRE_TOOL_HOOK, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: { command: 'find . -name "*.json" -delete' },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('X15 — should deny command chaining (&&, ;, |) wrapping CLI calls', () => {
    const res = runHook(PRE_TOOL_HOOK, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: { command: 'echo hello && node adapter/claude-code/cli.mjs status' },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('X18 — should deny nested powershell/cmd invocation attempting shell bypass', () => {
    const res = runHook(PRE_TOOL_HOOK, {
      cwd: tmpDir,
      tool_name: 'Bash',
      tool_input: { command: 'powershell -Command "Remove-Item progress.json"' },
    });
    expect(res?.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  // --- Category D: Corrupted & Missing Assets ---

  it('X20 — should fail closed (deny code write) when progress.json is corrupt', () => {
    writeFileSync(join(tmpDir, 'progress.json'), 'invalid json{', 'utf8');

    const res = runHook(PRE_TOOL_HOOK, {
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

    const res = runHook(PRE_TOOL_HOOK, {
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
    const resAllowed = runHook(PRE_TOOL_HOOK, {
      cwd: tmpDir,
      tool_name: 'Write',
      tool_input: { file_path: join(tmpDir, 'src/app.ts') },
    });
    expect(resAllowed).toBeNull(); // exit 0 allows

    // Unallowed path src/unauthorized.ts -> should deny
    const resDenied = runHook(PRE_TOOL_HOOK, {
      cwd: tmpDir,
      tool_name: 'Write',
      tool_input: { file_path: join(tmpDir, 'src/unauthorized.ts') },
    });
    expect(resDenied?.hookSpecificOutput.permissionDecision).toBe('deny');
  });
});
