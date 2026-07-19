#!/usr/bin/env node
// DesignEverything CLI — lớp thao tác state cho skill /design-everything.
// Skill KHÔNG tự sửa progress.json; mọi commit/emit đi qua đây để giữ deterministic.
//
//   node cli.mjs status
//   node cli.mjs commit --turn <id> [--answer "<text>"] [--branch <shape>]
//                       [--calibrate deep|fast] [--slots-file <file.json>]
//   node cli.mjs emit [--slots-file <file.json>]
//   node cli.mjs review --milestone <M4-...>   (engine tự chạy lint/test, sinh break-task)
//
// Chạy với cwd = workspace của dự án đích (hoặc đặt CLAUDE_PROJECT_DIR).
import { pathToFileURL } from 'url';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';

const cliDir = dirname(fileURLToPath(import.meta.url));
const candidates = [
  join(cliDir, '..', '..'), // For development in adapter/claude-code
  cliDir,                  // For self-contained bundled installations
];
let corePath = null;
for (const cand of candidates) {
  const p = join(cand, 'dist/src/core/index.js');
  if (existsSync(p)) {
    corePath = p;
    break;
  }
}
if (!corePath) {
  console.error('[DesignEverything CLI] LỖI: Không thể định vị dist/src/core/index.js.');
  process.exit(1);
}
const workspaceRoot = process.env.CLAUDE_PROJECT_DIR || process.env.PLUGIN_ROOT || process.cwd();

const core = await import(pathToFileURL(corePath).href);

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


/**
 * Nhật ký tiến độ người-đọc-được. Render lại toàn bộ từ execution state (không
 * append) nên chạy bao nhiêu lần cũng ra một kết quả, và không thể lệch state.
 */
function writeProgressLog(plan, state) {
  try {
    const md = core.renderProgressLog({ plan, state });
    mkdirSync(join(workspaceRoot, 'docs'), { recursive: true });
    writeFileSync(join(workspaceRoot, 'docs', 'progress-log.md'), md, 'utf8');
    return 'docs/progress-log.md';
  } catch {
    // Nhật ký là phụ trợ: hỏng thì không được kéo theo verify/validate fail.
    return null;
  }
}

/**
 * Đọc lại số liệu từ file break-task của lần review TRƯỚC (dòng bảng dạng
 * `| Còn mở | 2 |`). Chỉ dùng để dựng mục lục; không đọc được thì trả 0 chứ
 * không đoán, vì mục lục sai số còn tệ hơn mục lục trống.
 */
function readBreakCount(filePath, label) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const match = content.match(new RegExp(`\\|\\s*${label}\\s*\\|\\s*(\\d+)\\s*\\|`));
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
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

    // Conventions lock (B16a): khóa stack + allowed paths + dependency cho dự án
    // đích tại docs/conventions/. Slot allowed_dependencies do skill suy từ mục
    // "Thư viện/thành phần chính" của 05-architecture rồi truyền qua slots-file.
    let conventionFiles = [];
    const emittedProfile = core.loadProjectProfile(workspaceRoot);
    if (emittedProfile?.target && emittedProfile.target !== 'unsupported') {
      const dependencies = String(answers['allowed_dependencies'] || '')
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      conventionFiles = core
        .emitProjectConventions({
          architectureDoc: tree.find((d) => d.file === '05-architecture.md')?.content ?? '',
          constraintsDoc: tree.find((d) => d.file === '06-constraints.md')?.content ?? '',
          profile: emittedProfile,
          cwd: workspaceRoot,
          dependencies,
        })
        .map((p) => relative(workspaceRoot, p).replace(/\\/g, '/'));
    }

    // Consistency pass: phát hiện docs tự mâu thuẫn (câu sau sửa quyết định
    // câu trước nhưng slot cũ chưa cập nhật). Không chặn emit — skill phải
    // trình bày cảnh báo, sửa slot rồi re-emit.
    const consistencyWarnings = core.checkDocsConsistency(tree, emittedProfile);

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
          conventions: conventionFiles,
          consistency_warnings: consistencyWarnings,
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
      execState = core.loadExecutionState(execStatePath);
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
    if (existsSync(execPlanPath)) {
      emittedDocs.push({
        file: '.design-everything/execution-plan.json',
        content: readFileSync(execPlanPath, 'utf8'),
      });
    }

    const valResult = core.validateExecutionPlan({
      shape: progress.branch,
      answers,
      execution_plan: v3Plan,
      emitted_docs: emittedDocs,
    });

    // Profile drift: plan được synth cho một profile không còn khớp thực tế
    // workspace (VD: emit lúc thư mục trống bị blocked, sau đó người dùng tự tạo
    // manifest). So TARGET là đủ — workspace_kind đổi empty→existing sau scaffold
    // là tiến triển bình thường, không phải drift.
    const savedProfile = core.loadProjectProfile(workspaceRoot);
    const freshProfile = core.inspectProjectProfile(
      workspaceRoot,
      core.inferProfileAnswersFromInterview(answers, progress.branch)
    ).profile;
    if ((savedProfile?.target ?? null) !== freshProfile.target) {
      valResult.pass = false;
      valResult.issues.push({
        id: 'profile-drift',
        message:
          `Profile drift: plan hiện tại synth cho target "${savedProfile?.target ?? null}" nhưng workspace giờ là "${freshProfile.target}". ` +
          'Chạy lại lệnh emit để re-synth execution plan theo profile mới.',
      });
    }

    const planDigest = core.calculatePlanDigest(v3Plan);
    const docsDigest = core.calculateDocsDigest(emittedDocs);
    const validationDigest = core.calculateValidationResultDigest(valResult);

    const nextState = core.transitionToReadyToExecute(execState, valResult.pass, {
      plan_digest: planDigest,
      docs_digest: docsDigest,
      validation_digest: validationDigest,
    });

    if (!valResult.pass) {
      nextState.block_reason = `Validation failed: ${valResult.issues.map(i => i.message).join('; ')}`;
    }
    core.saveExecutionState(execStatePath, nextState);
    const validateProgressLog = writeProgressLog(v3Plan, nextState);

    console.log(
      JSON.stringify(
        {
          pass: valResult.pass,
          issues: valResult.issues,
          phase: nextState.phase,
          block_reason: nextState.block_reason,
          progress_log: validateProgressLog,
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

    const emittedDocs = core.loadEmittedDocs(workspaceRoot, execPlanPath);
    try {
      core.assertValidatedSnapshot({ docs: emittedDocs, plan: v3Plan, state: execState });
    } catch (e) {
      core.saveExecutionState(execStatePath, execState);
      fail(e.message);
    }

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

    const emittedDocs = core.loadEmittedDocs(workspaceRoot, execPlanPath);
    try {
      core.assertValidatedSnapshot({ docs: emittedDocs, plan: v3Plan, state: execState });
    } catch (e) {
      core.saveExecutionState(execStatePath, execState);
      fail(e.message);
    }

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

  case 'verify': {
    if (!args.task || args.task === true) {
      fail('Thiếu --task <task_id>.');
    }
    if (!args.command || args.command === true) {
      fail('Thiếu --command <command_id>.');
    }
    if (!existsSync(execStatePath)) {
      fail('Chưa có execution-state.json.');
    }
    if (!existsSync(execPlanPath)) {
      fail('Không thấy execution-plan.json.');
    }
    const execState = core.loadExecutionState(execStatePath);
    const v3Plan = JSON.parse(readFileSync(execPlanPath, 'utf8'));

    const emittedDocs = core.loadEmittedDocs(workspaceRoot, execPlanPath);
    try {
      core.assertValidatedSnapshot({ docs: emittedDocs, plan: v3Plan, state: execState });
    } catch (e) {
      core.saveExecutionState(execStatePath, execState);
      fail(e.message);
    }

    let nextState;
    try {
      nextState = await core.runTaskVerification({
        workspace: workspaceRoot,
        plan: v3Plan,
        state: execState,
        task_id: args.task,
        command_id: args.command,
        user_confirmed: args.confirm === true,
      });
    } catch (e) {
      if (e.message.includes('user_confirmed=true')) {
        console.error('Hỏi người dùng thật; nếu họ đồng ý, chạy lại kèm --confirm.');
      }
      fail(e.message);
    }

    let outputPlan = v3Plan;
    let promoted = false;
    let promotedMilestones = [];
    if (
      v3Plan.no_features !== true &&
      nextState.completed_tasks.includes('T3-verify') &&
      !v3Plan.milestones.some((m) => m.id.startsWith('M4-'))
    ) {
      const answers = loadAnswers();
      try {
        if (Object.keys(answers).length === 0) throw new Error('missing Design/.interview/answers.json');
        outputPlan = core.promoteExecutionPlan({ workspace: workspaceRoot, answers, currentPlan: v3Plan, state: nextState });
        promotedMilestones = outputPlan.milestones.filter((m) => m.id.startsWith('M4-')).map((m) => m.id);
        writeFileSync(execPlanPath, JSON.stringify(outputPlan, null, 2), 'utf8');
        nextState = {
          ...nextState,
          phase: 'ready-to-execute',
          block_reason: null,
          validated_plan_digest: core.calculatePlanDigest(outputPlan),
          validated_docs_digest: core.calculateDocsDigest(core.loadEmittedDocs(workspaceRoot, execPlanPath)),
          updated_at: new Date().toISOString(),
        };
        promoted = true;
      } catch (e) {
        nextState = { ...nextState, phase: 'blocked', block_reason: `Plan promotion failed: ${e.message}`, updated_at: new Date().toISOString() };
      }
    }

    core.saveExecutionState(execStatePath, nextState);
    const progressLog = writeProgressLog(outputPlan, nextState);

    console.log(
      JSON.stringify(
        {
          verified: args.task,
          command: args.command,
          phase: nextState.phase,
          block_reason: nextState.block_reason,
          completed_tasks: nextState.completed_tasks,
          evidence_count: nextState.evidence.length,
          promoted,
          promoted_milestones: promotedMilestones,
          progress_log: progressLog,
        },
        null,
        2
      )
    );
    break;
  }

  case 'review': {
    // B17a — đóng vòng review của một feature-milestone. Engine TỰ chạy lint/test
    // của stack đã khóa; agent không được tự khai "sạch rồi".
    if (!args.milestone || args.milestone === true) {
      fail('Thiếu --milestone <M4-...>.');
    }
    if (!existsSync(execStatePath)) fail('Chưa có execution-state.json. Chạy "validate" trước.');
    if (!existsSync(execPlanPath)) fail('Không thấy execution-plan.json.');

    let reviewState = core.loadExecutionState(execStatePath);
    const reviewPlan = JSON.parse(readFileSync(execPlanPath, 'utf8'));
    const milestoneId = String(args.milestone);

    const milestone = (reviewPlan.milestones || []).find((m) => m.id === milestoneId);
    if (!milestone) fail(`Không tìm thấy milestone ${milestoneId} trong execution plan.`);

    // Vào pha reviewing (core gác điều kiện: phải xong hết task build của feature).
    if (reviewState.phase !== 'reviewing') {
      try {
        reviewState = core.transitionToReview(reviewState, milestoneId, reviewPlan);
      } catch (e) {
        fail(e.message);
      }
    }

    // Phạm vi feature = allowed_paths của chính các task thuộc milestone này.
    const changedPaths = [
      ...new Set(
        (milestone.tasks || []).flatMap((tid) => reviewPlan.tasks?.[tid]?.allowed_paths ?? [])
      ),
    ];

    const conventions = core.loadProjectConventionsFromCwd(workspaceRoot);
    const signal = await core.runFeatureReview({
      workspace: workspaceRoot,
      featureMilestone: milestoneId,
      changedPaths,
      conventions,
      conventionsRef: 'docs/conventions/',
    });

    const breakTasks = core.reviewFeatureOutput(signal);

    let outcomeState;
    try {
      outcomeState = core.applyReviewOutcome(
        reviewState,
        milestoneId,
        breakTasks.map((t) => t.id)
      );
    } catch (e) {
      fail(e.message);
    }
    core.saveExecutionState(execStatePath, outcomeState);

    // Ghi break-task ra markdown: state chỉ giữ ID, người đọc cần câu chữ.
    const breakDir = join(workspaceRoot, 'docs', 'break-tasks');
    mkdirSync(breakDir, { recursive: true });
    const docFile = core.breakTaskFileName(milestoneId);
    writeFileSync(
      join(breakDir, docFile),
      core.renderBreakTaskDoc({ featureMilestone: milestoneId, breakTasks, state: outcomeState }),
      'utf8'
    );

    // Dựng lại mục lục từ các file đã có, để nó phản ánh toàn cảnh nợ hiện tại.
    const entries = readdirSync(breakDir)
      .filter((f) => f.endsWith('.md') && f !== 'README.md')
      .map((f) => {
        const isCurrent = f === docFile;
        const total = isCurrent ? breakTasks.length : null;
        const open = isCurrent
          ? breakTasks.filter((t) => !outcomeState.completed_tasks.includes(t.id)).length
          : null;
        return {
          featureMilestone: f.replace(/\.md$/, ''),
          file: f,
          // File của lần review trước: đọc lại số liệu từ chính nội dung đã ghi.
          total: total ?? readBreakCount(join(breakDir, f), 'Break-task sinh ra'),
          open: open ?? readBreakCount(join(breakDir, f), 'Còn mở'),
        };
      });
    writeFileSync(join(breakDir, 'README.md'), core.renderBreakTaskIndex({ entries }), 'utf8');

    writeProgressLog(reviewPlan, outcomeState);

    console.log(
      JSON.stringify(
        {
          reviewed: milestoneId,
          lint_ok: signal.lint.ok,
          test_ok: signal.test.ok,
          break_tasks: breakTasks.map((t) => t.id),
          phase: outcomeState.phase,
          block_reason: outcomeState.block_reason,
          break_task_doc: `docs/break-tasks/${docFile}`,
          note:
            breakTasks.length === 0
              ? 'Review sạch: feature đã đóng, được phép mở feature kế.'
              : 'Feature CHƯA done: làm xong break-task (verify pass) rồi chạy lại review.',
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
          note: `Vui lòng sửa mã nguồn trong phạm vi cho phép, sau đó gọi lại verify --task <task_id> --command <command_id>.`,
        },
        null,
        2
      )
    );
    break;
  }

  case 'next-step': {
    let execPlan = null;
    if (existsSync(execPlanPath)) {
      try {
        execPlan = JSON.parse(readFileSync(execPlanPath, 'utf8'));
      } catch {
        // ignore
      }
    }
    let execState = null;
    if (existsSync(execStatePath)) {
      try {
        execState = core.loadExecutionState(execStatePath);
      } catch {
        // ignore
      }
    }
    let profile = core.loadProjectProfile(workspaceRoot);
    if (!profile && existsSync(join(workspaceRoot, '.design-everything/project-profile.json'))) {
      try {
        profile = JSON.parse(readFileSync(join(workspaceRoot, '.design-everything/project-profile.json'), 'utf8'));
      } catch {
        // ignore
      }
    }

    const card = core.renderNextStep(execPlan, execState, profile);
    const mode = args.calibrate || progress.calibrate_mode || 'fast';
    const text = core.renderNextStepMarkdown(card, mode);
    console.log(text);
    break;
  }

  case 'amend': {
    const action = rest[0];
    if (!action) {
      fail('Thiếu action cho lệnh amend. Dùng: propose | show | approve | reject.');
    }

    if (!existsSync(execStatePath)) {
      fail('Chưa có execution-state.json. Vui lòng validate trước.');
    }
    const execState = core.loadExecutionState(execStatePath);

    let execPlan = null;
    if (existsSync(execPlanPath)) {
      try {
        execPlan = JSON.parse(readFileSync(execPlanPath, 'utf8'));
      } catch (e) {
        fail(`Không đọc được execution-plan.json: ${e.message}`);
      }
    }
    if (!execPlan) {
      fail('Không thấy execution-plan.json.');
    }

    let profile = core.loadProjectProfile(workspaceRoot);
    if (!profile && existsSync(join(workspaceRoot, '.design-everything/project-profile.json'))) {
      try {
        profile = JSON.parse(readFileSync(join(workspaceRoot, '.design-everything/project-profile.json'), 'utf8'));
      } catch {
        // ignore
      }
    }

    if (action === 'propose') {
      const reason = args.reason;
      const changesFile = args.changes;
      if (!reason) fail('Thiếu --reason <reason_code>.');
      if (!changesFile) fail('Thiếu --changes <json_file>.');

      if (!existsSync(changesFile)) {
        fail(`Không tìm thấy changes file: ${changesFile}`);
      }

      let changes;
      try {
        changes = JSON.parse(readFileSync(changesFile, 'utf8'));
      } catch (e) {
        fail(`Changes file không phải JSON hợp lệ: ${e.message}`);
      }

      if (!profile) {
        fail('Project profile không tồn tại. Chạy lại lệnh emit để sinh project profile trước.');
      }

      let amendment;
      try {
        amendment = core.proposePlanAmendment({
          plan: execPlan,
          state: execState,
          profile,
          reason_code: reason,
          proposed_changes: changes,
          requested_by: args['requested-by'] || 'agent',
        });
      } catch (e) {
        fail(e.message);
      }

      core.saveExecutionState(execStatePath, execState);

      console.log(JSON.stringify({ proposed: amendment }, null, 2));
    } else if (action === 'show') {
      const amendId = rest[1];
      if (!amendId) fail('Thiếu <amendment_id>.');
      const amendment = execState.amendment_history.find(am => am.id === amendId);
      if (!amendment) fail(`Không tìm thấy amendment: ${amendId}`);
      console.log(JSON.stringify(amendment, null, 2));
    } else if (action === 'approve') {
      const amendId = rest[1];
      if (!amendId) fail('Thiếu <amendment_id>.');

      let result;
      try {
        result = core.approvePlanAmendment({
          workspace: workspaceRoot,
          plan: execPlan,
          state: execState,
          profile,
          amendmentId: amendId,
        });
      } catch (e) {
        fail(e.message);
      }

      console.log(
        JSON.stringify(
          {
            approved: amendId,
            plan_revision: result.state.plan_revision,
            phase: result.state.phase,
            note: 'Amendment approved. Cần chạy lại lệnh validate trước khi tiếp tục.',
          },
          null,
          2
        )
      );
    } else if (action === 'reject') {
      const amendId = rest[1];
      if (!amendId) fail('Thiếu <amendment_id>.');

      let amendment;
      try {
        amendment = core.rejectPlanAmendment(execState, amendId);
      } catch (e) {
        fail(e.message);
      }

      core.saveExecutionState(execStatePath, execState);
      console.log(JSON.stringify({ rejected: amendment.id }, null, 2));
    } else {
      fail(`Action không hợp lệ cho amend: ${action}. Dùng propose | show | approve | reject.`);
    }
    break;
  }

  default:
    fail(`Lệnh không hợp lệ: "${command ?? ''}". Dùng: status | commit | emit | validate | next | start | verify | review | repair | next-step | amend.`);
}
