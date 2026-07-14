import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadShapes } from './loadShapes.js';
import {
  PlanValidationInput,
  PlanValidationResult,
  ValidationIssue,
} from './schemas/planValidation.js';
import { executionPlanSchemaV3 } from './schemas/executionPlan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getShapesRegistry() {
  const paths = [
    join(process.cwd(), 'Design/Content/interview-script/shapes.yaml'),
    join(__dirname, '../../Design/Content/interview-script/shapes.yaml'),
    join(__dirname, '../Design/Content/interview-script/shapes.yaml'),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        return loadShapes(p);
      } catch {
        // continue
      }
    }
  }
  return null;
}

export function extractFeatures(text: string | undefined): string[] {
  if (!text) return [];
  const lines = text.split('\n');
  const features: string[] = [];
  for (const line of lines) {
    let cleaned = line.trim().replace(/^[-*•\d+.]\s*/, '').trim();
    if (!cleaned) continue;
    cleaned = cleaned.replace(/^(must|should|could|won't|wont|won’t)\s*:\s*/i, '').trim();
    if (cleaned) {
      const parts = cleaned.split(/[,;]/).map(x => x.trim()).filter(Boolean);
      features.push(...parts);
    }
  }
  return features.filter(f => f.length > 2);
}

export function extractMustFeatures(answers: Record<string, string>): string[] {
  const mustText = answers['must_have_scope'] || '';
  let fullText = mustText;
  if (!fullText && answers['S3']) {
    const s3 = answers['S3'];
    const mustIndex = s3.search(/must\s*:/i);
    if (mustIndex !== -1) {
      const rest = s3.slice(mustIndex + 5);
      const nextKeywordIndex = rest.search(/(?:should|could|wont|won't|won’t)\s*:/i);
      if (nextKeywordIndex !== -1) {
        fullText = rest.slice(0, nextKeywordIndex);
      } else {
        fullText = rest;
      }
    } else {
      fullText = s3;
    }
  }
  return extractFeatures(fullText);
}

export function extractWontFeatures(answers: Record<string, string>): string[] {
  const wontText = answers['wont_for_mvp_scope'] || '';
  let fullText = wontText;
  if (!fullText && answers['S3']) {
    const s3 = answers['S3'];
    const wontIndex = s3.search(/(?:wont|won't|won’t)\s*:/i);
    if (wontIndex !== -1) {
      const match = s3.slice(wontIndex).match(/(?:wont|won't|won’t)\s*:\s*/i);
      const startOffset = match ? match[0].length : 5;
      const rest = s3.slice(wontIndex + startOffset);
      const nextKeywordIndex = rest.search(/(?:must|should|could)\s*:/i);
      if (nextKeywordIndex !== -1) {
        fullText = rest.slice(0, nextKeywordIndex);
      } else {
        fullText = rest;
      }
    }
  }
  return extractFeatures(fullText);
}

function isMatch(feature: string, mappedItem: string): boolean {
  const f = feature.toLowerCase().trim();
  const m = mappedItem.toLowerCase().trim();
  return f.includes(m) || m.includes(f);
}

export function validateExecutionPlan(input: PlanValidationInput): PlanValidationResult {
  const issues: ValidationIssue[] = [];

  // 1. Zod schema validation of execution_plan
  const schemaParse = executionPlanSchemaV3.safeParse(input.execution_plan);
  if (!schemaParse.success) {
    issues.push({
      id: 'invalid-shape-docs',
      severity: 'error',
      message: `Cấu trúc execution-plan.json không hợp lệ: ${schemaParse.error.message}`,
      remediation: 'Chạy phỏng vấn và emit lại để cập nhật kế hoạch theo đúng schema V3.',
    });
    return {
      pass: false,
      issues,
      checkedAt: new Date().toISOString(),
      evidenceReferences: [],
    };
  }

  const plan = schemaParse.data;

  // 2. Shape doc checks
  const registry = getShapesRegistry();
  let expectedFiles: string[] = [];
  if (!registry) {
    issues.push({
      id: 'invalid-shape-docs',
      severity: 'error',
      message: 'Không tìm thấy shapes.yaml registry của hệ thống.',
      remediation: 'Đảm bảo shapes.yaml tồn tại ở Design/Content/interview-script/shapes.yaml',
    });
  } else {
    const shapeObj = registry.shapes.find((s) => s.id === input.shape);
    if (!shapeObj) {
      issues.push({
        id: 'invalid-shape-docs',
        severity: 'error',
        message: `Hình-hài dự án "${input.shape}" không tồn tại trong registry.`,
        remediation: `Đăng ký hình-hài "${input.shape}" trong shapes.yaml hoặc chọn một hình-hài hợp lệ.`,
      });
    } else {
      expectedFiles = [
        '00-vision.md',
        '01-personas.md',
        '02-scope.md',
        '03-data-model.md',
        '04-flows.md',
        '05-architecture.md',
        '06-constraints.md',
        ...shapeObj.release_docs,
        '08-build-plan.md',
        '09-execution-plan.md',
        '.design-everything/execution-plan.json',
        'README.md',
      ];

      // Check missing files
      for (const file of expectedFiles) {
        const found = input.emitted_docs.some(
          (d) => d.file === file || d.file.endsWith(file)
        );
        if (!found) {
          issues.push({
            id: 'invalid-shape-docs',
            severity: 'error',
            message: `Thiếu tệp tài liệu bắt buộc "${file}" đối với hình-hài "${input.shape}".`,
            remediation: `Đảm bảo tệp "${file}" được sinh ra trong cấu trúc tài liệu.`,
          });
        }
      }

      // Check wrong release docs
      const allPossibleReleaseDocs = registry.shapes
        .filter((s) => s.id !== input.shape)
        .flatMap((s) => s.release_docs);

      for (const doc of input.emitted_docs) {
        if (allPossibleReleaseDocs.includes(doc.file) && !shapeObj.release_docs.includes(doc.file)) {
          issues.push({
            id: 'invalid-shape-docs',
            severity: 'error',
            message: `Tệp phát hành "${doc.file}" không thuộc hình-hài dự án "${input.shape}".`,
            remediation: `Loại bỏ tệp phát hành "${doc.file}" khỏi danh sách tài liệu sinh ra cho hình-hài này.`,
          });
        }
      }
    }
  }

  // 3. Plan digest validation
  const planMd = input.emitted_docs.find((d) => d.file === '09-execution-plan.md' || d.file.endsWith('09-execution-plan.md'));
  const planJsonFile = input.emitted_docs.find((d) => d.file === '.design-everything/execution-plan.json' || d.file.endsWith('execution-plan.json'));

  if (planMd && planJsonFile) {
    const calculatedHash = createHash('sha256').update(planJsonFile.content.trim()).digest('hex');
    const digestMatch = planMd.content.match(/<!--\s*plan-digest:\s*([a-f0-9]+)\s*-->/i);

    if (!digestMatch) {
      issues.push({
        id: 'invalid-shape-docs',
        severity: 'error',
        message: 'Tài liệu 09-execution-plan.md thiếu chữ ký xác thực plan-digest.',
        remediation: 'Đảm bảo tệp 09-execution-plan.md có mã comment <!-- plan-digest: <hash> --> ở cuối.',
      });
    } else {
      const embeddedHash = digestMatch[1];
      if (embeddedHash !== calculatedHash) {
        issues.push({
          id: 'invalid-shape-docs',
          severity: 'error',
          message: 'Chữ ký plan-digest trong 09-execution-plan.md không khớp với nội dung thực tế của execution-plan.json.',
          remediation: 'Vui lòng chạy emit lại để sinh đồng bộ tệp 09 và file JSON.',
        });
      }
    }
  }

  // 4. README Conformance
  const readmeDoc = input.emitted_docs.find((d) => d.file === 'README.md' || d.file.endsWith('README.md'));
  if (!readmeDoc) {
    issues.push({
      id: 'readme-mismatch',
      severity: 'error',
      message: 'Không tìm thấy tệp README.md trong danh sách tài liệu.',
      remediation: 'Đảm bảo README.md được sinh ra.',
    });
  } else {
    for (const file of expectedFiles) {
      if (!readmeDoc.content.includes(file)) {
        issues.push({
          id: 'readme-mismatch',
          severity: 'error',
          message: `README.md không liệt kê tệp tài liệu bắt buộc: ${file}`,
          remediation: `Hãy cập nhật README.md để liệt kê đầy đủ tệp ${file}.`,
          sourceFile: 'README.md',
        });
      }
    }
  }

  // 5. Must-to-Flow-to-Task Traceability
  const mustFeatures = extractMustFeatures(input.answers);
  for (const mustFeature of mustFeatures) {
    const isMapped = plan.trace_links.some((t) => isMatch(mustFeature, t.must_id));
    if (!isMapped) {
      issues.push({
        id: 'traceability-missing',
        severity: 'error',
        message: `Tính năng Must-have "${mustFeature}" không được ánh xạ tới bất kỳ trace link nào trong Execution Plan.`,
        remediation: `Thêm trace link trong execution-plan.json map Must-have này với flow và task.`,
      });
    }
  }

  // Check: "Must không có flow"
  for (const link of plan.trace_links) {
    if (!link.flow_id || link.flow_id.trim().length === 0) {
      issues.push({
        id: 'traceability-missing',
        severity: 'error',
        message: `Trace link cho Must-have "${link.must_id}" không có flow_id.`,
        remediation: `Khai báo flow_id cụ thể cho trace link này.`,
      });
    }
  }

  // Check: "flow không có task"
  for (const link of plan.trace_links) {
    if (!link.task_ids || link.task_ids.length === 0) {
      issues.push({
        id: 'traceability-missing',
        severity: 'error',
        message: `Flow "${link.flow_id}" trong trace link không có task_ids.`,
        remediation: `Gắn ít nhất một task_id cho flow này.`,
      });
    }
  }

  // Check: "task không tồn tại"
  for (const link of plan.trace_links) {
    for (const tid of link.task_ids) {
      if (!plan.tasks[tid]) {
        issues.push({
          id: 'traceability-missing',
          severity: 'error',
          message: `Task ID "${tid}" trong trace link không tồn tại trong danh sách tasks.`,
          remediation: `Đảm bảo task_id "${tid}" có định nghĩa task card trong plan.`,
        });
      }
    }
  }

  // Check empty verificationExpected in all tasks
  for (const task of Object.values(plan.tasks)) {
    if (!task.expected_result || task.expected_result.trim().length < 3) {
      issues.push({
        id: 'traceability-missing',
        severity: 'error',
        message: `Task "${task.id}" thiếu tiêu chí kiểm chứng (expected_result).`,
        remediation: `Nhập cụ thể kết quả kỳ vọng đạt được sau khi chạy lệnh kiểm chứng của task "${task.id}".`,
      });
    }
  }

  // 6. Scope Leak Check
  const wontFeatures = extractWontFeatures(input.answers);
  for (const wontFeature of wontFeatures) {
    for (const task of Object.values(plan.tasks)) {
      const isLeaked =
        isMatch(wontFeature, task.intent || '') ||
        (task.allowed_paths || []).some((p) => isMatch(wontFeature, p));
      if (isLeaked) {
        issues.push({
          id: 'scope-leak',
          severity: 'error',
          message: `Tính năng Won't-have "${wontFeature}" bị đưa vào thực thi trong task "${task.id}".`,
          remediation: `Loại bỏ tính năng "${wontFeature}" khỏi phạm vi MVP của task "${task.id}".`,
        });
      }
    }

    for (const link of plan.trace_links) {
      if (isMatch(wontFeature, link.must_id)) {
        issues.push({
          id: 'scope-leak',
          severity: 'error',
          message: `Tính năng Won't-have "${wontFeature}" bị đưa vào trace link.`,
          remediation: `Loại bỏ trace link liên kết tới tính năng Won't-have "${wontFeature}".`,
        });
      }
    }
  }

  // 7. Risk & Spike Check
  const riskKeywords = ['rủi ro', 'chưa rõ', 'phức tạp', 'platform', 'dependency', 'limit', 'giới hạn'];
  const hasRiskKeywordInAnswers = Object.values(input.answers).some((ans) =>
    riskKeywords.some((kw) => ans.toLowerCase().includes(kw))
  );

  const hasUnresolvedRisks = plan.risks.some(
    (r) => r.status === 'assumption' || r.status === 'spike-required'
  );

  const hasSpikeTask = Object.values(plan.tasks).some(
    (t) => t.type === 'spike' || /spike|feasibility|khảo sát|nghiên cứu|thử nghiệm/i.test(t.id) || /spike|feasibility|khảo sát|nghiên cứu|thử nghiệm/i.test(t.intent || '')
  );

  if ((hasRiskKeywordInAnswers || hasUnresolvedRisks) && !hasSpikeTask) {
    issues.push({
      id: 'risk-unresolved',
      severity: 'error',
      message: 'Phát hiện từ khóa rủi ro hoặc rủi ro chưa xác nhận trong câu trả lời nhưng chưa có task Feasibility Spike nào trong Execution Plan.',
      remediation: 'Hãy bổ sung một task dạng "Feasibility Spike" ở milestone đầu tiên để khảo sát các rủi ro kỹ thuật.',
    });
  }

  // Enforce risk -> spike -> ordering: a spike must run BEFORE the work it
  // de-risks, so a spike task may only depend on other spike tasks.
  for (const task of Object.values(plan.tasks)) {
    if (task.type !== 'spike') continue;
    for (const dep of task.depends_on || []) {
      const depTask = plan.tasks[dep];
      if (depTask && depTask.type !== 'spike') {
        issues.push({
          id: 'risk-unresolved',
          severity: 'error',
          message: `Spike "${task.id}" phụ thuộc vào task không phải spike "${dep}"; spike phải được thực thi trước để gỡ rủi ro.`,
          remediation: `Đặt spike "${task.id}" ở milestone đầu tiên và loại bỏ phụ thuộc vào task triển khai "${dep}".`,
        });
      }
    }
  }

  // 8. Graph Validation
  // Validate duplicate milestone/task IDs
  const milestoneIds = new Set<string>();
  for (const m of plan.milestones) {
    if (milestoneIds.has(m.id)) {
      issues.push({
        id: 'phantom-command',
        severity: 'error',
        message: `Milestone ID trùng lặp: ${m.id}`,
        remediation: `Đảm bảo mỗi milestone có ID duy nhất.`,
      });
    }
    milestoneIds.add(m.id);
  }

  // Validate tasks belonging to milestones
  const tasksInMilestones = new Set<string>();
  for (const m of plan.milestones) {
    for (const tid of m.tasks) {
      if (tasksInMilestones.has(tid)) {
        issues.push({
          id: 'phantom-command',
          severity: 'error',
          message: `Task ID "${tid}" thuộc nhiều hơn một milestone.`,
          remediation: `Đảm bảo mỗi task chỉ thuộc đúng một milestone.`,
        });
      }
      tasksInMilestones.add(tid);

      if (!plan.tasks[tid]) {
        issues.push({
          id: 'phantom-command',
          severity: 'error',
          message: `Milestone "${m.id}" tham chiếu task "${tid}" không tồn tại.`,
          remediation: `Khai báo task card cho "${tid}" trong execution-plan.json.`,
        });
      }
    }
  }

  // Validate all defined tasks are in milestones
  for (const tid of Object.keys(plan.tasks)) {
    if (!tasksInMilestones.has(tid)) {
      issues.push({
        id: 'phantom-command',
        severity: 'error',
        message: `Task "${tid}" được định nghĩa nhưng không được đưa vào bất kỳ milestone nào.`,
        remediation: `Hãy đưa task "${tid}" vào một milestone cụ thể.`,
      });
    }
  }

  // Validate precondition/command/path không rỗng
  for (const task of Object.values(plan.tasks)) {
    if (task.type === 'implementation' || task.type === 'scaffold') {
      if (!task.allowed_paths || task.allowed_paths.length === 0) {
        issues.push({
          id: 'phantom-command',
          severity: 'error',
          message: `Task "${task.id}" thuộc loại scaffold/implementation nhưng allowed_paths rỗng.`,
          remediation: `Nhập ít nhất một đường dẫn tệp được phép sửa đổi cho task "${task.id}".`,
        });
      }
    }
    if (!task.commands || task.commands.length === 0) {
      issues.push({
        id: 'phantom-command',
        severity: 'error',
        message: `Task "${task.id}" không có lệnh kiểm chứng (commands rỗng).`,
        remediation: `Nhập lệnh kiểm chứng cụ thể cho task "${task.id}".`,
      });
    }
  }

  // Detect cycle & missing dependency in task dependency graph
  const adj: Record<string, string[]> = {};
  for (const [tid, task] of Object.entries(plan.tasks)) {
    const deps = task.depends_on || task.preconditions || [];
    adj[tid] = [];
    for (const dep of deps) {
      if (!plan.tasks[dep]) {
        issues.push({
          id: 'phantom-command',
          severity: 'error',
          message: `Task "${tid}" phụ thuộc vào task "${dep}" không tồn tại.`,
          remediation: `Đảm bảo task phụ thuộc "${dep}" tồn tại trong kế hoạch.`,
        });
      } else {
        adj[tid].push(dep);
      }
    }
  }

  // Cycle detection via DFS
  const visited: Record<string, number> = {}; // 0 = unvisited, 1 = visiting, 2 = visited
  let hasCycle = false;
  const cycleTasks: string[] = [];

  function dfs(u: string): boolean {
    visited[u] = 1;
    for (const v of adj[u] || []) {
      if (visited[v] === 1) {
        hasCycle = true;
        cycleTasks.push(u, v);
        return true;
      }
      if (!visited[v]) {
        if (dfs(v)) return true;
      }
    }
    visited[u] = 2;
    return false;
  }

  for (const tid of Object.keys(plan.tasks)) {
    if (!visited[tid]) {
      if (dfs(tid)) break;
    }
  }

  if (hasCycle) {
    issues.push({
      id: 'phantom-command',
      severity: 'error',
      message: `Phát hiện chu trình phụ thuộc vòng (dependency cycle) trong các task: ${cycleTasks.join(' -> ')}`,
      remediation: 'Loại bỏ phụ thuộc vòng trong depends_on/preconditions của các task.',
    });
  }

  // Phantom files and commands validation
  const allowedPathPrefixes = [
    'src/',
    'test/',
    'package.json',
    'eslint.config.mjs',
    'tsconfig.json',
    'vite.config.ts',
    'vitest.config.ts',
    'README.md',
    'Design/',
  ];
  const allowedCommands = ['npm', 'git', 'vitest', 'node', 'npx', 'tsc', 'eslint'];

  const hasPython = plan.capabilities_evidence?.some((c) => c.id === 'python-venv-project' || c.id === 'python-lang');
  const hasVite = plan.capabilities_evidence?.some((c) => c.id === 'vite-bundler');
  const hasNode = plan.capabilities_evidence?.some((c) => c.id === 'node-npm-project');

  if (hasPython) {
    allowedPathPrefixes.push('requirements.txt', 'pyproject.toml', 'poetry.lock', 'Pipfile', 'Pipfile.lock');
    allowedCommands.push('python', 'pip', 'pytest', 'poetry');
  }
  if (hasVite || hasNode) {
    allowedCommands.push('pnpm', 'yarn');
    allowedPathPrefixes.push('index.html', 'public/');
  }

  for (const task of Object.values(plan.tasks)) {
    for (const file of task.allowed_paths || []) {
      const isValidPrefix = allowedPathPrefixes.some((pref) => file.startsWith(pref) || file === pref || file.startsWith('**/'));
      if (!isValidPrefix) {
        issues.push({
          id: 'phantom-command',
          severity: 'error',
          message: `Đường dẫn file cần sửa "${file}" trong task "${task.id}" không khớp với các thư mục dự án tiêu chuẩn (src/, test/, etc.).`,
          remediation: `Đảm bảo đường dẫn file chỉ sửa trong các thư mục src/, test/, Design/ hoặc cấu hình chuẩn.`,
        });
      }
    }

    for (const cmd of task.commands || []) {
      if (!cmd.argv || cmd.argv.length === 0) {
        issues.push({
          id: 'phantom-command',
          severity: 'error',
          message: `Lệnh kiểm chứng "${cmd.id}" trong task "${task.id}" không có đối số argv.`,
          remediation: `Nhập argv cho lệnh kiểm chứng "${cmd.id}".`,
        });
        continue;
      }
      const baseCmd = cmd.argv[0];
      if (
        baseCmd &&
        !allowedCommands.includes(baseCmd) &&
        !baseCmd.startsWith('./') &&
        !baseCmd.startsWith('.\\')
      ) {
        issues.push({
          id: 'phantom-command',
          severity: 'error',
          message: `Lệnh kiểm chứng "${cmd.id}" trong task "${task.id}" sử dụng lệnh lạ "${baseCmd}" không nằm trong danh sách lệnh được hỗ trợ.`,
          remediation: `Sử dụng các lệnh chuẩn như npm, npx, tsc, git hoặc các file script nội bộ bắt đầu bằng ./`,
        });
      }
    }
  }

  // 9. Capability Gating & Discovery Check
  for (const task of Object.values(plan.tasks)) {
    if (task.requires_capability) {
      const hasCapability = plan.capabilities_evidence?.some((c) => c.id === task.requires_capability);
      if (!hasCapability) {
        issues.push({
          id: 'phantom-capability',
          severity: 'error',
          message: `Nhiệm vụ "${task.id}" yêu cầu capability "${task.requires_capability}" nhưng capability này không tồn tại trong danh sách capabilities_evidence.`,
          remediation: `Thêm capability evidence hợp lệ vào kế hoạch hoặc chạy discovery.`,
        });
      }
    } else {
      if (task.type === 'implementation') {
        issues.push({
          id: 'phantom-capability',
          severity: 'error',
          message: `Nhiệm vụ implementation "${task.id}" không được phép tồn tại khi không liên kết với capability nào.`,
          remediation: `Chỉ định requires_capability hợp lệ cho nhiệm vụ implementation "${task.id}".`,
        });
      }
      if (task.type !== 'spike') {
        for (const path of task.allowed_paths) {
          if (!path.startsWith('.design-everything/')) {
            issues.push({
              id: 'phantom-capability',
              severity: 'error',
              message: `Nhiệm vụ "${task.id}" yêu cầu allowed_path "${path}" bên ngoài thư mục .design-everything/ nhưng không có capability.`,
              remediation: `Chỉ cho phép allowed_path trong .design-everything/ đối với nhiệm vụ không có capability.`,
            });
          }
        }
        for (const evidence of task.evidence_required) {
          if (!evidence.startsWith('.design-everything/')) {
            issues.push({
              id: 'phantom-capability',
              severity: 'error',
              message: `Nhiệm vụ "${task.id}" yêu cầu evidence "${evidence}" bên ngoài thư mục .design-everything/ nhưng không có capability.`,
              remediation: `Chỉ cho phép evidence trong .design-everything/ đối với nhiệm vụ không có capability.`,
            });
          }
        }
        for (const cmd of task.commands) {
          const cmdStr = cmd.argv.join(' ');
          if (
            cmdStr.includes('npm') ||
            cmdStr.includes('test') ||
            cmdStr.includes('build') ||
            cmdStr.includes('run') ||
            cmdStr.includes('cargo') ||
            cmdStr.includes('python')
          ) {
            issues.push({
              id: 'phantom-capability',
              severity: 'error',
              message: `Nhiệm vụ "${task.id}" chạy lệnh thực thi "${cmdStr}" yêu cầu môi trường dự án nhưng không có capability.`,
              remediation: `Loại bỏ các lệnh build/test runtime khỏi nhiệm vụ không có capability.`,
            });
          }
        }
      }
    }

    if (task.type === 'scaffold') {
      if (task.requires_capability === 'node-npm-project') {
        const hasPackageJson = task.allowed_paths.some((p) => p.includes('package.json'));
        if (!hasPackageJson) {
          issues.push({
            id: 'missing-manifest-path',
            severity: 'error',
            message: `Nhiệm vụ scaffold "${task.id}" yêu cầu capability node-npm-project nhưng allowed_paths thiếu tệp cấu hình package.json.`,
            remediation: `Thêm package.json vào allowed_paths của nhiệm vụ scaffold.`,
          });
        }
      }
      if (task.requires_capability === 'rust-cargo-project') {
        const hasCargoToml = task.allowed_paths.some((p) => p.includes('Cargo.toml'));
        if (!hasCargoToml) {
          issues.push({
            id: 'missing-manifest-path',
            severity: 'error',
            message: `Nhiệm vụ scaffold "${task.id}" yêu cầu capability rust-cargo-project nhưng allowed_paths thiếu tệp cấu hình Cargo.toml.`,
            remediation: `Thêm Cargo.toml vào allowed_paths của nhiệm vụ scaffold.`,
          });
        }
      }
      if (task.requires_capability === 'python-pip-project') {
        const hasReqTxt = task.allowed_paths.some((p) => p.includes('requirements.txt'));
        if (!hasReqTxt) {
          issues.push({
            id: 'missing-manifest-path',
            severity: 'error',
            message: `Nhiệm vụ scaffold "${task.id}" yêu cầu capability python-pip-project nhưng allowed_paths thiếu tệp cấu hình requirements.txt.`,
            remediation: `Thêm requirements.txt vào allowed_paths của nhiệm vụ scaffold.`,
          });
        }
      }
    }
  }

  const pass = !issues.some((issue) => issue.severity === 'error');

  return {
    pass,
    issues,
    checkedAt: new Date().toISOString(),
    evidenceReferences: [],
  };
}
