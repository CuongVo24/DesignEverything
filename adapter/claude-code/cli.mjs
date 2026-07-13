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
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const ENGINE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const workspaceRoot = process.env.CLAUDE_PROJECT_DIR || process.cwd();

const core = await import(pathToFileURL(join(ENGINE_ROOT, 'dist/src/core/index.js')).href);

const progressPath = join(workspaceRoot, 'progress.json');
const scriptPath = join(workspaceRoot, 'Design/Content/interview-script/script.yaml');
const policyPath = join(workspaceRoot, 'Design/Content/interview-script/gate-policy.yaml');
const templatesDir = join(workspaceRoot, 'Design/Content/doc-templates');
const answersDir = join(workspaceRoot, 'Design', '.interview');
const answersPath = join(answersDir, 'answers.json');

function fail(msg) {
  console.error(`[DesignEverything CLI] LỖI: ${msg}`);
  process.exit(1);
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

  default:
    fail(`Lệnh không hợp lệ: "${command ?? ''}". Dùng: status | commit | emit.`);
}
