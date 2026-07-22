import type { EmittedDoc } from './emit.js';
import type { ProjectProfile } from './schemas/index.js';
import type { RenderedArtifact, ConsistencyIssue } from './schemas/tier2Render.js';
import { extractMustFeatures } from './validatePlan.js';
import { slugifyList } from './slugify.js';
import { parseDataModel } from './parseDataModel.js';

export interface ConsistencyWarning {
  id: string;
  files: string[];
  message: string;
}

// Bộ luật phát hiện docs tự mâu thuẫn — sinh ra từ ca thật: câu phỏng vấn sau
// sửa quyết định của câu trước (VD: C4 chốt Windows) nhưng slot đã chốt ở câu
// trước (VD: C3 ghi đường dẫn XDG) không được cập nhật lại. Luật cố ý bảo thủ:
// chỉ cảnh báo khi một file mang tín hiệu cũ mà KHÔNG mang tín hiệu mới, trong
// khi file khác trong cùng bộ docs đã mang tín hiệu mới. Cảnh báo không chặn
// emit — skill có trách nhiệm đối chiếu và sửa slot cũ rồi re-emit.

const WINDOWS_PATH_SIGNAL = /%APPDATA%|%LOCALAPPDATA%|platformdirs/i;
const XDG_PATH_SIGNAL = /~\/\.config|~\/\.local\/share|~\/\.cache|XDG_/;

const NODE_COMMAND_SIGNAL = /`npm (?:install|run|test)`|`node \S+`|`npx \S+`/;
const PYTHON_COMMAND_SIGNAL = /`pip install[^`]*`|`pytest`|`python -m [^`]*`/;

function isContentDoc(file: string): boolean {
  // Soát docs nội dung + README (có mục hướng dẫn build); plan JSON bỏ qua.
  return /^\d\d-.*\.md$/.test(file) || file === 'README.md';
}

export function checkDocsConsistency(
  docs: EmittedDoc[],
  profile?: Pick<ProjectProfile, 'language'> | null
): ConsistencyWarning[] {
  const warnings: ConsistencyWarning[] = [];
  const contentDocs = docs.filter((d) => isContentDoc(d.file));

  // Luật 1 — đường dẫn nền tảng mâu thuẫn: đã có file chốt đường dẫn kiểu
  // Windows/platformdirs mà file khác vẫn chỉ nói đường dẫn XDG thuần Linux.
  const hasWindowsDecision = contentDocs.some((d) => WINDOWS_PATH_SIGNAL.test(d.content));
  if (hasWindowsDecision) {
    const staleXdgFiles = contentDocs
      .filter((d) => XDG_PATH_SIGNAL.test(d.content) && !WINDOWS_PATH_SIGNAL.test(d.content))
      .map((d) => d.file);
    if (staleXdgFiles.length > 0) {
      warnings.push({
        id: 'path-convention-conflict',
        files: staleXdgFiles,
        message:
          `Docs đã chốt đường dẫn theo Windows/platformdirs nhưng ${staleXdgFiles.join(', ')} vẫn chỉ nhắc đường dẫn XDG (~/.config, ~/.local/share, ~/.cache). ` +
          'Cập nhật lại slot của các file này cho khớp quyết định mới rồi re-emit.',
      });
    }
  }

  // Luật 2 — lệnh sai ngôn ngữ: dự án Python nhưng docs hướng dẫn lệnh npm/node
  // (và ngược lại). Chỉ bắt lệnh cụ thể trong backtick để tránh false positive
  // khi văn bản bàn luận trade-off có nhắc tên ngôn ngữ khác.
  if (profile?.language === 'python') {
    const nodeCommandFiles = contentDocs
      .filter((d) => NODE_COMMAND_SIGNAL.test(d.content))
      .map((d) => d.file);
    if (nodeCommandFiles.length > 0) {
      warnings.push({
        id: 'stack-command-conflict',
        files: nodeCommandFiles,
        message:
          `Dự án đã chốt Python nhưng ${nodeCommandFiles.join(', ')} còn hướng dẫn lệnh npm/node. ` +
          'Sửa slot tương ứng sang lệnh Python (pip/pytest) rồi re-emit.',
      });
    }
  } else if (profile?.language === 'typescript' || profile?.language === 'javascript') {
    const pythonCommandFiles = contentDocs
      .filter((d) => PYTHON_COMMAND_SIGNAL.test(d.content))
      .map((d) => d.file);
    if (pythonCommandFiles.length > 0) {
      warnings.push({
        id: 'stack-command-conflict',
        files: pythonCommandFiles,
        message:
          `Dự án đã chốt Node/TypeScript nhưng ${pythonCommandFiles.join(', ')} còn hướng dẫn lệnh pip/pytest. ` +
          'Sửa slot tương ứng sang lệnh Node (npm) rồi re-emit.',
      });
    }
  }

  return warnings;
}

function findDoc(tier1Docs: Record<string, string>, name: string): string | undefined {
  for (const [path, content] of Object.entries(tier1Docs || {})) {
    if (path.replace(/\\/g, '/').endsWith(name)) return content;
  }
  return undefined;
}

/**
 * Consistency cho bản render tầng 2 (in-memory, CHƯA ghi đĩa). Trả issue có severity:
 *  - feature-spec cho tính năng KHÔNG thuộc Must của 02-scope → `error` (chặn emit ở B20b);
 *  - glossary nhắc entity KHÔNG có trong 03-data-model → `warning` (không chặn).
 */
export function checkTier2Consistency(
  renders: RenderedArtifact[],
  tier1Docs: Record<string, string>,
  answers: Record<string, string>
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  const mustSlugs = new Set(slugifyList(extractMustFeatures(answers)));
  for (const art of renders) {
    const m = art.path.replace(/\\/g, '/').match(/^design\/features\/(.+)\.md$/);
    if (m && !mustSlugs.has(m[1])) {
      issues.push({
        severity: 'error',
        code: 'feature-not-in-must',
        path: art.path,
        message: `Feature spec "${m[1]}" không nằm trong danh sách Must của 02-scope.`,
      });
    }
  }

  const dataModelDoc = findDoc(tier1Docs, '03-data-model.md');
  if (dataModelDoc) {
    const known = new Set(parseDataModel(dataModelDoc).entities.map((e) => e.toLowerCase().trim()));
    for (const art of renders) {
      if (!art.path.replace(/\\/g, '/').endsWith('design/glossary.md')) continue;
      const block = art.content.match(/## Thực Thể Từ Data Model\n([^\n]*)/);
      if (!block) continue;
      for (const raw of block[1].split(',')) {
        const entity = raw.trim();
        if (entity && !known.has(entity.toLowerCase())) {
          issues.push({
            severity: 'warning',
            code: 'entity-not-in-data-model',
            path: art.path,
            message: `Glossary nhắc entity "${entity}" không có trong 03-data-model.`,
          });
        }
      }
    }
  }

  return issues;
}
