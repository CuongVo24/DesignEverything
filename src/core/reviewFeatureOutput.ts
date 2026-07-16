import { Contract, VerificationCommand } from './schemas/index.js';

/**
 * Kết quả kiểm tra thật của một feature vừa hoàn thành (lint/test) + diff.
 * Đây là dữ liệu do runner/harness thu, không phải tự khai (D36).
 */
export interface ReviewSignal {
  /** id feature-milestone vừa xong, ví dụ "M4-search-recipe". */
  featureMilestone: string;
  /** Các file đã đổi trong feature (để giới hạn allowed_paths của break-task). */
  changedPaths: string[];
  /** Kết quả lint: ok=false kèm danh sách vấn đề sạch/nợ kỹ thuật → polish. */
  lint: { ok: boolean; issues: string[] };
  /** Kết quả test: ok=false kèm danh sách test fail → fix. */
  test: { ok: boolean; issues: string[] };
  /** Lệnh verify tái dùng khi đóng break-task (thường là lệnh test của stack). */
  verification: VerificationCommand[];
  conventionsRef: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * B17a — Manager-check deterministic trên lint/test/diff thật của một feature.
 * Sinh break-task (fix_* cho bug, polish_* cho nợ kỹ thuật) khi output bẩn;
 * trả mảng rỗng khi sạch. KHÔNG tự sinh nội dung sửa — chỉ mô tả điểm bẩn +
 * verification cần đạt; executor mới là người làm.
 */
export function reviewFeatureOutput(signal: ReviewSignal): Contract[] {
  const breakTasks: Contract[] = [];
  const featureSlug = signal.featureMilestone.replace(/^M4-/, '');

  // allowed_paths của break-task giới hạn đúng file feature đã đụng; nếu không
  // có changedPaths thì fallback về một interface placeholder để giữ schema hợp lệ.
  const paths = signal.changedPaths.length > 0 ? signal.changedPaths : [`src/${featureSlug}.ts`];
  const interfaces = paths.map((p) => ({
    path: p,
    change: 'MODIFY' as const,
    signature: null,
    est_lines: 40,
  }));

  const mkBreak = (
    kind: 'fix' | 'polish',
    shortSlug: string,
    microTask: string,
    checklist: string[]
  ): Contract => ({
    id: `C-${featureSlug}-${kind}-${shortSlug}`,
    feature_milestone: signal.featureMilestone,
    layer: 'app',
    micro_task: microTask,
    scope: { in: paths, out: [] },
    checklist,
    interfaces,
    risks: [],
    verification: signal.verification,
    status: 'WAITING_FOR_APPROVAL',
    conventions_ref: signal.conventionsRef,
    derived_from: { must_id: signal.featureMilestone, entity_ids: [], flow_id: null },
  });

  // Test fail → fix (bug thật). Một break-task gom các test fail của feature.
  if (!signal.test.ok) {
    breakTasks.push(
      mkBreak(
        'fix',
        'failing-tests',
        `Sửa test fail của feature ${featureSlug}: ${signal.test.issues.join('; ') || 'test suite đỏ'}`,
        signal.test.issues.length > 0
          ? signal.test.issues.map((i) => `Test pass: ${i}`)
          : ['Test suite của feature chạy xanh']
      )
    );
  }

  // Lint bẩn → polish (nợ kỹ thuật/độ sạch).
  if (!signal.lint.ok) {
    breakTasks.push(
      mkBreak(
        'polish',
        'lint',
        `Dọn nợ kỹ thuật của feature ${featureSlug}: ${signal.lint.issues.join('; ') || 'lint có cảnh báo'}`,
        signal.lint.issues.length > 0
          ? signal.lint.issues.map((i) => `Sạch: ${i}`)
          : ['Lint không còn cảnh báo']
      )
    );
  }

  return breakTasks;
}

export { slugify as reviewSlugify };
