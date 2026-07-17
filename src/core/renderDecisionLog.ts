export interface DecisionSpec {
  /** Mã quyết định ổn định, VD 'D-shape', 'D-auth'. */
  id: string;
  title: string;
  /** Câu phỏng vấn đã chốt quyết định này. */
  source_question: string;
  /** File chứa nội dung chi tiết của quyết định. */
  detail_doc: string;
  /** Nội dung đã chốt (lấy từ slot đã dịch ngược). */
  value: string;
}

interface DecisionSource {
  id: string;
  title: string;
  source_question: string;
  detail_doc: string;
  /** '__branch__' = lấy thẳng hình-hài đã chốt, còn lại là tên slot. */
  slot: string;
}

/** Quyết định của khung lõi, đúng cho mọi hình-hài. */
const CORE_DECISIONS: DecisionSource[] = [
  { id: 'D-shape', title: 'Hình-hài dự án', source_question: 'S7', detail_doc: '06-constraints.md', slot: '__branch__' },
  { id: 'D-security', title: 'Mức bảo mật theo độ nhạy dữ liệu', source_question: 'S8', detail_doc: '05-architecture.md', slot: 'data_sensitivity_and_security' },
  { id: 'D-scale', title: 'Mức tối ưu theo quy mô dự kiến', source_question: 'S8', detail_doc: '05-architecture.md', slot: 'expected_scale_and_performance' },
];

const BRANCH_DECISIONS: Record<string, DecisionSource[]> = {
  web: [
    { id: 'D-rendering', title: 'Giao diện và chiến lược rendering', source_question: 'W1/W2', detail_doc: '05-architecture.md', slot: 'client_and_rendering_strategy' },
    { id: 'D-overview', title: 'Hướng triển khai tổng quan', source_question: 'W2', detail_doc: '05-architecture.md', slot: 'architecture_overview' },
    { id: 'D-hosting', title: 'Hosting và đường phát hành', source_question: 'W3', detail_doc: '07-deployment.md', slot: 'hosting_strategy' },
    { id: 'D-auth', title: 'Xác thực và phân quyền', source_question: 'W4', detail_doc: '05-architecture.md', slot: 'auth_and_access_strategy' },
    { id: 'D-realtime', title: 'Realtime, push hoặc đồng bộ', source_question: 'W5', detail_doc: '05-architecture.md', slot: 'realtime_push_or_sync_strategy' },
  ],
  mobile: [
    { id: 'D-platform', title: 'Nền tảng và chiến lược client', source_question: 'M1', detail_doc: '05-architecture.md', slot: 'client_and_rendering_strategy' },
    { id: 'D-overview', title: 'Hướng triển khai tổng quan (offline/sync)', source_question: 'M2', detail_doc: '05-architecture.md', slot: 'architecture_overview' },
    { id: 'D-distribution', title: 'Phân phối và phát hành store', source_question: 'M3', detail_doc: '07-release.md', slot: 'distribution_strategy' },
    { id: 'D-auth', title: 'Xác thực và phân quyền', source_question: 'M4', detail_doc: '05-architecture.md', slot: 'auth_and_access_strategy' },
    { id: 'D-realtime', title: 'Realtime, push hoặc đồng bộ', source_question: 'M5', detail_doc: '05-architecture.md', slot: 'realtime_push_or_sync_strategy' },
  ],
  cli: [
    { id: 'D-overview', title: 'Hướng triển khai tổng quan', source_question: 'C1', detail_doc: '05-architecture.md', slot: 'architecture_overview' },
    { id: 'D-interface', title: 'Giao diện dòng lệnh', source_question: 'C2', detail_doc: '05-architecture.md', slot: 'client_and_rendering_strategy' },
    { id: 'D-config', title: 'Cấu hình và quản lý khóa bí mật', source_question: 'C3', detail_doc: '05-architecture.md', slot: 'auth_and_access_strategy' },
    { id: 'D-platform', title: 'Hệ điều hành hỗ trợ đầu tiên', source_question: 'C4', detail_doc: '05-architecture.md', slot: 'device_capabilities_and_permissions' },
    { id: 'D-distribution', title: 'Kênh phân phối', source_question: 'C5', detail_doc: '07-distribution.md', slot: 'distribution_channel' },
  ],
};

/** Rút gọn giá trị nhiều dòng thành một ô bảng đọc được. */
function toCell(value: string): string {
  const oneLine = (value || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
  if (!oneLine) return '_(chưa chốt)_';
  return oneLine.length > 160 ? `${oneLine.slice(0, 157)}…` : oneLine;
}

export function collectDecisions(input: { branch: string; slots: Record<string, string> }): DecisionSpec[] {
  // Hybrid mang cả quyết định web lẫn mobile.
  const branchSpecs =
    BRANCH_DECISIONS[input.branch] ?? [...BRANCH_DECISIONS.web, ...BRANCH_DECISIONS.mobile];

  const seen = new Set<string>();
  return [...CORE_DECISIONS, ...branchSpecs]
    .filter((spec) => {
      // Web+mobile của hybrid có id trùng (D-auth, D-overview...); giữ bản đầu.
      if (seen.has(spec.id)) return false;
      seen.add(spec.id);
      return true;
    })
    .map((spec) => ({
      id: spec.id,
      title: spec.title,
      source_question: spec.source_question,
      detail_doc: spec.detail_doc,
      value: spec.slot === '__branch__' ? input.branch : input.slots[spec.slot] || '',
    }));
}

/**
 * Bảng quyết định cho `docs/decisions.md`: mỗi quyết định kỹ thuật đã chốt, nối
 * ngược về câu phỏng vấn sinh ra nó và trỏ tới file giữ chi tiết.
 *
 * Cố tình KHÔNG chép lại phần "vì sao" — phần đó sống ở 05-architecture.md và
 * được rót vào file này qua cùng một slot, nên hai file không thể lệch nhau.
 */
export function renderDecisionTable(input: {
  branch: string;
  slots: Record<string, string>;
  /** Ngày chốt — mặc định hôm nay. Truyền vào để test deterministic. */
  today?: string;
}): string {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const decisions = collectDecisions({ branch: input.branch, slots: input.slots });

  const lines: string[] = [];
  lines.push(`Chốt ngày ${today}, tại thời điểm sinh bộ tài liệu nền móng.`);
  lines.push('');
  lines.push('| Mã | Quyết định | Đã chốt là | Nối từ câu | Chi tiết tại |');
  lines.push('|---|---|---|---|---|');
  for (const d of decisions) {
    lines.push(`| ${d.id} | ${d.title} | ${toCell(d.value)} | ${d.source_question} | \`${d.detail_doc}\` |`);
  }
  return lines.join('\n');
}
