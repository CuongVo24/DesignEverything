#!/usr/bin/env node
// DesignEverything CLI — lớp thao tác state cho skill /design.
// Skill KHÔNG tự sửa progress.json; mọi commit/emit đi qua đây để giữ deterministic.
//
//   node cli.mjs status
//   node cli.mjs commit --turn <id> [--answer "<text>"] [--branch <shape>]
//                       [--calibrate deep|fast] [--slots-file <file.json>]
//   node cli.mjs emit [--slots-file <file.json>]
//
// Chạy với cwd = workspace của dự án đích (hoặc đặt CLAUDE_PROJECT_DIR).
import { pathToFileURL } from 'url';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';

const ENGINE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const workspaceRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();

const core = await import(pathToFileURL(join(ENGINE_ROOT, 'dist/src/core/index.js')).href);

const progressPath = join(workspaceRoot, 'progress.json');
const scriptPath = join(workspaceRoot, 'Design/Content/interview-script/script.yaml');
const policyPath = join(workspaceRoot, 'Design/Content/interview-script/gate-policy.yaml');
const templatesDir = join(workspaceRoot, 'Design/Content/doc-templates');
const answersDir = join(workspaceRoot, 'Design', '.interview');
const answersPath = join(answersDir, 'answers.json');
const execStatePath = join(workspaceRoot, '.design-everything/execution-state.json');
const execPlanPath = join(workspaceRoot, '.design-everything/execution-plan.json');

function fail(msg) {
  console.error(`[DesignEverything CLI] LỖI: ${msg}`);
  process.exit(1);
}

function convertV3PlanToLegacy(v3Plan, answers) {
  return {
    milestones: (v3Plan.milestones || []).map((m) => {
      return {
        id: m.id,
        title: m.title,
        tasks: (m.tasks || []).map((taskId) => {
          const t = v3Plan.tasks?.[taskId] || {};
          const scopeMapped = [];
          const mustText = answers.must_have_scope || answers.S3 || '';
          const features = (mustText.match(/[^,*•\d+.-]+/g) || [])
            .map(x => x.trim())
            .filter(x => x.length > 2 && !/must|should|could|wont/i.test(x));

          for (const f of features) {
            if (t.intent && t.intent.toLowerCase().includes(f.toLowerCase())) {
              scopeMapped.push(f);
            }
          }
          if (scopeMapped.length === 0) {
            scopeMapped.push('core');
          }
          return {
            id: taskId,
            title: t.intent || taskId,
            scopeMapped,
            filesToModify: t.allowed_paths || [],
            verificationCommands: t.commands || [],
            verificationExpected: t.expected_result || '',
            preconditions: t.depends_on || t.preconditions || [],
          };
        }),
        preconditions: [],
      };
    }),
    risksAcknowledged: (v3Plan.risks || []).map((r) => r.id),
  };
}

function loadAnswers() {
  if (!existsSync(answersPath)) return {};
  try {
    return JSON.parse(readFileSync(answersPath, 'utf8'));
  } catch (e) {
    fail(`answers.json hỏng: ${e.message}`);
  }
}

function saveAnswers(answers) {
  mkdirSync(answersDir, { recursive: true });
  writeFileSync(answersPath, JSON.stringify(answers, null, 2), 'utf8');
}

function questionInfo(script, qid) {
  if (qid === null) return null;
  const q = script.questions.find((x) => x.id === qid);
  if (!q) return null;
  const critic = script.critics?.[q.id] ?? null;
  return {
    id: q.id,
    kind: q.kind ?? 'anchored',
    ask: q.ask,
    default: q.default ?? null,
    target_doc: q.target_doc,
    translate_back: q.translate_back,
    critic: critic ? { challenge: critic.challenge, ack_prompt: critic.ack_prompt } : null,
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

if (!existsSync(progressPath)) {
  fail('progress.json chưa tồn tại. Mở một phiên Claude Code mới trong dự án (SessionStart sẽ tạo), hoặc kiểm tra lại thư mục làm việc.');
}
if (!existsSync(scriptPath)) {
  fail(`Không thấy ${scriptPath}. Chạy lại installer để copy lõi nội dung vào dự án.`);
}

const progress = core.loadProgress(progressPath);
const script = core.loadScript(scriptPath);

switch (command) {
  case 'status': {
    let execState = null;
    if (existsSync(execStatePath)) {
      try {
        execState = core.loadExecutionState(execStatePath);
      } catch {
        // ignore
      }
    }
    console.log(
      JSON.stringify(
        {
          phase: progress.phase,
          branch: progress.branch,
          calibrate_mode: progress.calibrate_mode,
          current_step: progress.current_step,
          question: questionInfo(script, progress.current_step),
          answered: progress.answered,
          emitted_docs: progress.emitted_docs,
          gates_passed: progress.gates_passed,
          execution_state: execState ? {
            phase: execState.phase,
            active_task: execState.active_task,
            active_milestone: execState.active_milestone,
            completed_tasks: execState.completed_tasks,
            evidence_count: execState.evidence.length,
            block_reason: execState.block_reason,
          } : null,
        },
        null,
        2
      )
    );
    break;
  }

  case 'commit': {
    if (!args.turn || args.turn === true) fail('Thiếu --turn <TURN_ID> (lấy từ context hook UserPromptSubmit của lượt hiện tại).');
    const qid = progress.current_step;
    if (qid === null) fail('Phỏng vấn đã hoàn tất; không còn bước để commit. Dùng "emit" để sinh docs.');

    const q = script.questions.find((x) => x.id === qid);
    const isMeta = (q?.kind ?? 'anchored') === 'meta';
    if (!isMeta && (!args.answer || args.answer === true)) {
      fail(`Câu ${qid} là câu anchored, bắt buộc có --answer "<câu trả lời đã chuẩn hoá sau dịch ngược>".`);
    }

    // 1. Lưu câu trả lời (trước khi advance để không mất dữ liệu nếu commit fail thì không lưu).
    const answers = loadAnswers();

    // 2. Commit bước qua core (rate-limit + branch một chiều + duplicate-turn đều do core gác).
    let next;
    try {
      next = core.commitStep(progress, script, {
        userTurnId: String(args.turn),
        branchChoice: typeof args.branch === 'string' ? args.branch : undefined,
      });
    } catch (e) {
      fail(e.message);
    }

    // 3. Calibrate mode (chỉ có nghĩa khi commit CAL0, nhưng cho phép chỉnh lại tường minh).
    if (typeof args.calibrate === 'string') {
      if (!['deep', 'fast'].includes(args.calibrate)) fail('--calibrate phải là deep hoặc fast.');
      next.calibrate_mode = args.calibrate;
    }
    if (qid === 'CAL0' && next.calibrate_mode === null) {
      fail('Commit CAL0 phải kèm --calibrate deep|fast.');
    }

    if (typeof args.answer === 'string') answers[qid] = args.answer;
    if (typeof args['slots-file'] === 'string') {
      const slotsFile = args['slots-file'];
      if (!existsSync(slotsFile)) fail(`Không thấy slots file: ${slotsFile}`);
      let slots;
      try {
        slots = JSON.parse(readFileSync(slotsFile, 'utf8'));
      } catch (e) {
        fail(`slots file không phải JSON hợp lệ: ${e.message}`);
      }
      Object.assign(answers, slots);
    }

    core.saveProgress(progressPath, next);
    saveAnswers(answers);

    console.log(
      JSON.stringify(
        {
          committed: qid,
          branch: next.branch,
          calibrate_mode: next.calibrate_mode,
          phase: next.phase,
          next_question: questionInfo(script, next.current_step),
          interview_done: next.current_step === null,
          note:
            next.current_step === null
              ? 'Phỏng vấn xong. Chạy "emit" để sinh cây docs/.'
              : 'Hỏi tiếp next_question ở lượt sau; nhớ dịch ngược và chờ xác nhận trước khi commit.',
        },
        null,
        2
      )
    );
    break;
  }

  case 'emit': {
    if (progress.current_step !== null) {
      fail(`Phỏng vấn chưa xong (đang ở ${progress.current_step}); chưa được emit.`);
    }
    if (!progress.branch) fail('State lỗi: phỏng vấn xong nhưng branch chưa được set.');
    if (!existsSync(templatesDir)) fail(`Không thấy doc-templates tại ${templatesDir}. Chạy lại installer.`);

    const answers = loadAnswers();
    // Slot bổ sung lúc emit — chủ yếu cho file dẫn xuất 08-build-plan.md (D28):
    // skill suy milestones từ Must (S3) + flow (S5) rồi truyền vào đây.
    if (typeof args['slots-file'] === 'string') {
      const slotsFile = args['slots-file'];
      if (!existsSync(slotsFile)) fail(`Không thấy slots file: ${slotsFile}`);
      let slots;
      try {
        slots = JSON.parse(readFileSync(slotsFile, 'utf8'));
      } catch (e) {
        fail(`slots file không phải JSON hợp lệ: ${e.message}`);
      }
      Object.assign(answers, slots);
      saveAnswers(answers);
    }
    let tree;
    try {
      tree = core.emitTree(answers, progress.branch, templatesDir);
    } catch (e) {
      fail(e.message);
    }

    const docsDir = join(workspaceRoot, 'docs');
    mkdirSync(docsDir, { recursive: true });
    for (const doc of tree) {
      if (doc.file.startsWith('.design-everything/')) {
        const dest = join(workspaceRoot, doc.file);
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, doc.content, 'utf8');
      } else {
        writeFileSync(join(docsDir, doc.file), doc.content, 'utf8');
      }
    }

    // Cập nhật state: emitted_docs + gates_passed + phase.
    const next = { ...progress, emitted_docs: tree.map((d) => d.file) };
    if (existsSync(policyPath)) {
      const policy = core.loadGatePolicy(policyPath);
      const existing = tree.map((d) => join(docsDir, d.file));
      for (const gateId of core.passedGates(policy, existing)) {
        if (!next.gates_passed.includes(gateId)) next.gates_passed.push(gateId);
      }
    }
    // Đủ mọi target_doc của nhánh + mọi gate mở → ready-to-build.
    const compatible = (qb) =>
      qb === 'core' ||
      (next.branch === 'hybrid' ? qb === 'web' || qb === 'mobile' : qb === next.branch);
    const requiredDocs = [...new Set(
      script.questions.filter((q) => compatible(q.branch) && q.target_doc).map((q) => q.target_doc)
    )];
    const requiredGates = [...new Set(
      script.questions.filter((q) => compatible(q.branch) && q.gate).map((q) => q.gate)
    )];
    const allDocs = requiredDocs.every((d) => next.emitted_docs.includes(d));
    const allGates = requiredGates.every((g) => next.gates_passed.includes(g));
    next.phase = allDocs && allGates ? 'ready-to-build' : 'docs-emitted';
    next.updated_at = new Date().toISOString();
    core.saveProgress(progressPath, next);

    console.log(
      JSON.stringify(
        {
          emitted: tree.map((d) => `docs/${d.file}`),
          phase: next.phase,
          gates_passed: next.gates_passed,
          note:
            next.phase === 'ready-to-build'
              ? 'Gate đã mở: được phép bắt đầu sinh code.'
              : 'Docs đã emit nhưng chưa đủ điều kiện ready-to-build; kiểm tra gates.',
        },
        null,
        2
      )
    );
    break;
  }

  case 'validate': {
    if (!existsSync(execPlanPath)) {
      fail('Không tìm thấy execution-plan.json. Vui lòng phỏng vấn hoàn tất và emit.');
    }
    let execState;
    if (existsSync(execStatePath)) {
      try {
        execState = core.loadExecutionState(execStatePath);
      } catch (e) {
        execState = core.initExecutionState();
      }
    } else {
      execState = core.initExecutionState();
    }

    const answers = loadAnswers();
    let v3Plan;
    try {
      v3Plan = JSON.parse(readFileSync(execPlanPath, 'utf8'));
    } catch (e) {
      fail(`Không đọc được execution-plan.json: ${e.message}`);
    }

    const legacyPlan = convertV3PlanToLegacy(v3Plan, answers);
    const emittedDocs = [];
    const docsDir = join(workspaceRoot, 'docs');
    if (existsSync(docsDir)) {
      const getFilesRecursive = (dir) => {
        let results = [];
        const list = readdirSync(dir);
        for (const file of list) {
          const filePath = join(dir, file);
          const stat = statSync(filePath);
          if (stat && stat.isDirectory()) {
            results = results.concat(getFilesRecursive(filePath));
          } else {
            results.push(filePath);
          }
        }
        return results;
      };
      const files = getFilesRecursive(docsDir);
      for (const f of files) {
        const rel = relative(docsDir, f).replace(/\\/g, '/');
        emittedDocs.push({
          file: rel,
          content: readFileSync(f, 'utf8'),
        });
      }
    }

    const valResult = core.validatePlan({
      shape: progress.branch,
      answers,
      executionPlan: legacyPlan,
      emittedDocs,
    });

    const nextState = core.transitionToReadyToExecute(execState, valResult.pass);
    if (!valResult.pass) {
      nextState.block_reason = `Validation failed: ${valResult.issues.map(i => i.message).join('; ')}`;
    }
    core.saveExecutionState(execStatePath, nextState);

    console.log(
      JSON.stringify(
        {
          pass: valResult.pass,
          issues: valResult.issues,
          phase: nextState.phase,
          block_reason: nextState.block_reason,
        },
        null,
        2
      )
    );
    break;
  }

  case 'next': {
    if (!existsSync(execStatePath)) {
      fail('Chưa có execution-state.json. Chạy "validate" trước.');
    }
    if (!existsSync(execPlanPath)) {
      fail('Không thấy execution-plan.json.');
    }
    const execState = core.loadExecutionState(execStatePath);
    const v3Plan = JSON.parse(readFileSync(execPlanPath, 'utf8'));

    const runnable = [];
    for (const milestone of v3Plan.milestones || []) {
      for (const taskId of milestone.tasks || []) {
        const task = v3Plan.tasks?.[taskId];
        if (!task) continue;
        if (execState.completed_tasks.includes(taskId)) continue;

        const pre = task.depends_on || task.preconditions || [];
        const preMet = pre.every(p => execState.completed_tasks.includes(p));
        if (preMet) {
          runnable.push({
            id: taskId,
            milestone: milestone.id,
            type: task.type,
            intent: task.intent,
            allowed_paths: task.allowed_paths,
            preconditions: pre,
            commands: task.commands,
            expected_result: task.expected_result,
            evidence_required: task.evidence_required,
          });
        }
      }
    }

    console.log(JSON.stringify({ runnable }, null, 2));
    break;
  }

  case 'start': {
    if (!args.task || args.task === true) {
      fail('Thiếu tham số --task <task_id>.');
    }
    if (!existsSync(execStatePath)) {
      fail('Chưa có execution-state.json. Chạy "validate" trước.');
    }
    if (!existsSync(execPlanPath)) {
      fail('Không thấy execution-plan.json.');
    }
    const execState = core.loadExecutionState(execStatePath);
    const v3Plan = JSON.parse(readFileSync(execPlanPath, 'utf8'));

    let milestoneId = null;
    for (const m of v3Plan.milestones || []) {
      if ((m.tasks || []).includes(args.task)) {
        milestoneId = m.id;
        break;
      }
    }
    if (!milestoneId) {
      fail(`Không tìm thấy task ${args.task} trong execution plan milestones.`);
    }

    let nextState;
    try {
      nextState = core.startTask(execState, milestoneId, args.task, v3Plan);
    } catch (e) {
      fail(e.message);
    }

    core.saveExecutionState(execStatePath, nextState);
    const task = v3Plan.tasks[args.task];

    console.log(
      JSON.stringify(
        {
          started: args.task,
          milestone: milestoneId,
          phase: nextState.phase,
          task_details: {
            id: args.task,
            intent: task.intent,
            allowed_paths: task.allowed_paths,
            preconditions: task.depends_on || task.preconditions || [],
            commands: task.commands,
            expected_result: task.expected_result,
            evidence_required: task.evidence_required,
          },
          note: 'Vui lòng chỉ chỉnh sửa các file thuộc allowed_paths của task hiện tại.',
        },
        null,
        2
      )
    );
    break;
  }

  case 'record-evidence': {
    if (!args.task || args.task === true) {
      fail('Thiếu --task <task_id>.');
    }
    if (args['exit-code'] === undefined || args['exit-code'] === true) {
      fail('Thiếu --exit-code <0|1>.');
    }
    if (!existsSync(execStatePath)) {
      fail('Chưa có execution-state.json.');
    }
    if (!existsSync(execPlanPath)) {
      fail('Không thấy execution-plan.json.');
    }
    const execState = core.loadExecutionState(execStatePath);
    const v3Plan = JSON.parse(readFileSync(execPlanPath, 'utf8'));

    const exitCode = parseInt(args['exit-code'], 10);
    const evidenceRecord = {
      task_id: args.task,
      command: v3Plan.tasks?.[args.task]?.commands?.join(' && ') || 'manual',
      exit_code: exitCode,
      expected_result: v3Plan.tasks?.[args.task]?.expected_result || '',
      observed_result: typeof args.observed === 'string' ? args.observed : (exitCode === 0 ? 'success' : 'failed'),
      timestamp: new Date().toISOString(),
      artifact_paths: typeof args.artifact === 'string' ? [args.artifact] : [],
      actor: 'claude-code',
    };

    let nextState;
    try {
      nextState = core.recordEvidence(execState, evidenceRecord, v3Plan);
    } catch (e) {
      fail(e.message);
    }

    core.saveExecutionState(execStatePath, nextState);

    console.log(
      JSON.stringify(
        {
          recorded: args.task,
          exit_code: exitCode,
          phase: nextState.phase,
          block_reason: nextState.block_reason,
          completed_tasks: nextState.completed_tasks,
          evidence_count: nextState.evidence.length,
        },
        null,
        2
      )
    );
    break;
  }

  case 'repair': {
    if (!existsSync(execStatePath)) {
      fail('Chưa có execution-state.json.');
    }
    const execState = core.loadExecutionState(execStatePath);
    if (execState.phase !== 'repairing') {
      fail(`Không thể khởi động sửa lỗi khi pha là ${execState.phase}; pha phải là repairing.`);
    }

    console.log(
      JSON.stringify(
        {
          phase: execState.phase,
          active_task: execState.active_task,
          note: `Vui lòng sửa mã nguồn trong phạm vi cho phép và chạy lại lệnh kiểm chứng, sau đó gọi record-evidence.`,
        },
        null,
        2
      )
    );
    break;
  }

  default:
    fail(`Lệnh không hợp lệ: "${command ?? ''}". Dùng: status | commit | emit | validate | next | start | record-evidence | repair.`);
}
