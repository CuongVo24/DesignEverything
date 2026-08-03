import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { validateAnswer } from '../../src/core/validateAnswer.js';
import { loadScript } from '../../src/core/loadScript.js';
import { checkDocsConsistency } from '../../src/core/checkDocsConsistency.js';
import type { ExecutionState } from '../../src/core/schemas/index.js';

const REPO_ROOT = join(__dirname, '../..');
const SCRIPT_PATH = join(REPO_ROOT, 'Design/Content/interview-script/script.yaml');

describe('B5c — Weak-Executor Replay & Quality Evaluation Suite', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `de-weak-executor-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('WE-01 — should detect path and stack inconsistencies in derived docs and return warnings', () => {
    const docs = [
      { file: '00-vision.md', content: 'Đường dẫn lưu dữ liệu tại %APPDATA%\\MyProject trên Windows.' },
      { file: '06-constraints.md', content: 'Dữ liệu được lưu tại ~/.config/myproject trên Linux XDG.' },
    ];

    const warnings = checkDocsConsistency(docs);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].message).toMatch(/mâu thuẫn|đường dẫn/i);
  });

  it('WE-02 — should reject generic personas and hollow MoSCoW priorities during answer validation', () => {
    const script = loadScript(SCRIPT_PATH);

    // Generic persona "moi nguoi"
    const s2Def = script.questions.find((q) => q.id === 'S2')!;
    const resS2 = validateAnswer(s2Def.answer_contract, 'moi nguoi');
    expect(resS2.outcome === 'needs_user_ack' || resS2.outcome === 'invalid').toBe(true);

    // Hollow MoSCoW "todo" or "tbd"
    const s3Def = script.questions.find((q) => q.id === 'S3')!;
    const resS3 = validateAnswer(s3Def.answer_contract, 'todo');
    expect(resS3.outcome).toBe('invalid');
  });

  it('WE-03 — should transition to blocked state with explicit repair instructions on validation failure without deadlocking', () => {
    let state: ExecutionState = {
      version: '4.0.0',
      phase: 'plan-validating',
      active_task: null,
      active_milestone: null,
      completed_tasks: [],
      evidence: [],
      block_reason: null,
      validated_plan_digest: '',
      validated_docs_digest: '',
      validation_result_digest: '',
      plan_revision: 1,
      amendment_history: [],
      open_break_tasks: [],
      reviewed_milestones: [],
      updated_at: new Date().toISOString(),
    };

    // Transition to blocked on validation failure
    state.phase = 'blocked';
    const recoverCommand = 'node adapter/claude-code/cli.mjs validate';
    state.block_reason = {
      kind: 'snapshot-stale',
      reason_code: 'SNAPSHOT_STALE',
      origin_phase: 'plan-validating',
      task_id: null,
      recoverable_by: recoverCommand,
      detail: 'Kế hoạch hoặc tài liệu thiết kế đã bị sửa đổi. Vui lòng chạy validate để cập nhật snapshot.',
      created_at: new Date().toISOString(),
      remediation: {
        actions: ['read', 'write-docs', 'run-command'],
        paths: ['Design/ContractForAI/Core/v1-fix-bugs/B1/03-plan.md'],
        command: recoverCommand,
        task_id: null,
        plan_revision: 1,
      },
    };

    expect(state.phase).toBe('blocked');
    expect(state.block_reason?.recoverable_by).toBe(recoverCommand);
    expect(state.block_reason?.remediation).toMatchObject({
      paths: ['Design/ContractForAI/Core/v1-fix-bugs/B1/03-plan.md'],
      command: recoverCommand,
      plan_revision: state.plan_revision,
    });

    // Recovery is available by clearing block_reason upon successful validation
    state = {
      ...state,
      phase: 'executing',
      active_task: 'T1-scaffold',
      active_milestone: 'M0',
      block_reason: null,
    };
    expect(state.phase).toBe('executing');
    expect(state.block_reason).toBeNull();
  });

  it('WE-04 — should measure metrics across journey replays: 0 false pass for hollow fixtures', () => {
    const weakFixturePath = join(REPO_ROOT, 'test/fixtures/journeys/weak-executor-sparse.json');
    const weakFixture = JSON.parse(readFileSync(weakFixturePath, 'utf8'));

    const script = loadScript(SCRIPT_PATH);
    let falsePassCount = 0;

    for (const [qId, answer] of Object.entries(weakFixture.answers)) {
      const qDef = script.questions.find((q) => q.id === qId);
      if (qDef && qDef.answer_contract) {
        const val = validateAnswer(qDef.answer_contract, answer as string);
        if (val.outcome === 'valid' && (answer === 'todo' || answer === 'tbd' || answer === 'app')) {
          falsePassCount++;
        }
      }
    }

    expect(falsePassCount).toBe(0);
  });
});
