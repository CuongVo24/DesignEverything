import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadShapes } from './loadShapes.js';
import {
  ValidatorInput,
  PlanValidationResult,
  ValidationIssue,
} from './schemas/planValidation.js';

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

function extractFeatures(text: string | undefined): string[] {
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

function extractMustFeatures(answers: Record<string, string>): string[] {
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

function extractWontFeatures(answers: Record<string, string>): string[] {
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

export function validatePlan(input: ValidatorInput): PlanValidationResult {
  const issues: ValidationIssue[] = [];

  // 1. Branch/Shape Conformity ('invalid-shape-docs')
  const registry = getShapesRegistry();
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
      const expectedFiles = [
        '00-vision.md',
        '01-personas.md',
        '02-scope.md',
        '03-data-model.md',
        '04-flows.md',
        '05-architecture.md',
        '06-constraints.md',
        ...shapeObj.release_docs,
        '08-build-plan.md',
        'README.md',
      ];

      // Check missing files
      for (const file of expectedFiles) {
        const found = input.emittedDocs.some((d) => d.file === file);
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

      for (const doc of input.emittedDocs) {
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

  // 2. README Conformance ('readme-mismatch')
  const readmeDoc = input.emittedDocs.find((d) => d.file === 'README.md');
  if (!readmeDoc) {
    issues.push({
      id: 'readme-mismatch',
      severity: 'error',
      message: 'Không tìm thấy tệp README.md trong danh sách tài liệu.',
      remediation: 'Đảm bảo README.md được sinh ra.',
    });
  } else {
    const registryExpectedFiles = registry
      ? registry.shapes.find((s) => s.id === input.shape)?.release_docs || []
      : [];
    const expectedFiles = [
      '00-vision.md',
      '01-personas.md',
      '02-scope.md',
      '03-data-model.md',
      '04-flows.md',
      '05-architecture.md',
      '06-constraints.md',
      ...registryExpectedFiles,
      '08-build-plan.md',
      'README.md',
    ];

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

  // 3. Must-to-Flow-to-Task Traceability ('traceability-missing')
  const mustFeatures = extractMustFeatures(input.answers);
  for (const mustFeature of mustFeatures) {
    const isMappedToTask = input.executionPlan.milestones.some((m) =>
      m.tasks.some((t) => t.scopeMapped.some((s) => isMatch(mustFeature, s)))
    );

    if (!isMappedToTask) {
      issues.push({
        id: 'traceability-missing',
        severity: 'error',
        message: `Tính năng Must-have "${mustFeature}" không được ánh xạ tới bất kỳ task nào trong Execution Plan.`,
        remediation: `Thêm task thực thi tính năng "${mustFeature}" vào Execution Plan và khai báo trong scopeMapped.`,
      });
    }
  }

  // Check empty verification fields
  for (const milestone of input.executionPlan.milestones) {
    for (const task of milestone.tasks) {
      if (!task.verificationExpected || task.verificationExpected.trim().length < 3) {
        issues.push({
          id: 'traceability-missing',
          severity: 'error',
          message: `Task "${task.title}" thiếu tiêu chí kiểm chứng (verificationExpected).`,
          remediation: `Nhập cụ thể kết quả kỳ vọng đạt được sau khi chạy lệnh kiểm chứng của task "${task.title}".`,
        });
      }
    }
  }

  // 4. Scope Leak Check ('scope-leak')
  const wontFeatures = extractWontFeatures(input.answers);
  for (const wontFeature of wontFeatures) {
    for (const milestone of input.executionPlan.milestones) {
      for (const task of milestone.tasks) {
        const isLeaked = task.scopeMapped.some((s) => isMatch(wontFeature, s));
        if (isLeaked) {
          issues.push({
            id: 'scope-leak',
            severity: 'error',
            message: `Tính năng Won't-have "${wontFeature}" bị đưa vào thực thi trong task "${task.title}".`,
            remediation: `Loại bỏ tính năng "${wontFeature}" khỏi phạm vi MVP của task "${task.title}".`,
          });
        }
      }
    }
  }

  // 5. Risk & Spike Check ('risk-unresolved')
  const hasSpikeTask = input.executionPlan.milestones.some((m) =>
    m.tasks.some((t) => /spike|feasibility|khảo sát|nghiên cứu|thử nghiệm/i.test(t.title))
  );

  const riskKeywords = ['rủi ro', 'chưa rõ', 'phức tạp', 'platform', 'dependency', 'limit', 'giới hạn'];
  const hasRiskKeywordInAnswers = Object.values(input.answers).some((ans) =>
    riskKeywords.some((kw) => ans.toLowerCase().includes(kw))
  );

  if (hasRiskKeywordInAnswers && !hasSpikeTask) {
    issues.push({
      id: 'risk-unresolved',
      severity: 'warning',
      message: 'Phát hiện từ khóa rủi ro trong câu trả lời nhưng chưa có task Feasibility Spike nào trong Execution Plan.',
      remediation: 'Hãy bổ sung một task dạng "Feasibility Spike" ở milestone đầu tiên để khảo sát các rủi ro kỹ thuật.',
    });
  }

  // 6. Phantom Command Check ('phantom-command')
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

  for (const milestone of input.executionPlan.milestones) {
    for (const task of milestone.tasks) {
      // Validate paths
      for (const file of task.filesToModify) {
        const isValidPrefix = allowedPathPrefixes.some((pref) => file.startsWith(pref));
        if (!isValidPrefix) {
          issues.push({
            id: 'phantom-command',
            severity: 'error',
            message: `Đường dẫn file cần sửa "${file}" trong task "${task.title}" không khớp với các thư mục dự án tiêu chuẩn (src/, test/, etc.).`,
            remediation: `Đảm bảo đường dẫn file chỉ sửa trong các thư mục src/, test/, Design/ hoặc cấu hình chuẩn.`,
          });
        }
      }

      // Validate commands
      for (const cmd of task.verificationCommands) {
        const baseCmd = cmd.trim().split(/\s+/)[0];
        if (
          baseCmd &&
          !allowedCommands.includes(baseCmd) &&
          !baseCmd.startsWith('./') &&
          !baseCmd.startsWith('.\\')
        ) {
          issues.push({
            id: 'phantom-command',
            severity: 'error',
            message: `Lệnh kiểm chứng "${cmd}" trong task "${task.title}" sử dụng lệnh lạ "${baseCmd}" không nằm trong danh sách lệnh được hỗ trợ.`,
            remediation: `Sử dụng các lệnh chuẩn như npm, npx, tsc, git hoặc các file script nội bộ bắt đầu bằng ./`,
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
