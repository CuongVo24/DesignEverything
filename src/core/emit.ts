import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadShapes } from './loadShapes.js';
import { createHash } from 'crypto';

import { loadProjectProfile, saveProjectProfile } from './projectProfileState.js';
import { inspectProjectProfile, inferProfileAnswersFromInterview } from './inspectProjectProfile.js';
import { synthesizeExecutionPlan } from './synthesizeExecutionPlan.js';
import { planWeeklySchedule, renderWeeklySchedule } from './planWeeklySchedule.js';
import { entityDiagramFromSlots, flowDiagramFromSlots } from './renderMermaid.js';
import { renderDecisionTable } from './renderDecisionLog.js';
import { extractMustFeatures, extractWontFeatures } from './validatePlan.js';
import type { ProjectProfile } from './schemas/index.js';

/**
 * Resolve project profile cho workspace đích. Với workspace trống (greenfield),
 * seed target/package manager từ câu trả lời phỏng vấn để execution plan không
 * rơi vào blocked stub mâu thuẫn với 08-build-plan. Profile cũ bị kẹt null-target
 * (emit trước khi có suy luận stack) cũng được re-inspect theo cùng cách.
 */
function resolveProjectProfile(cwd: string, answers: InterviewAnswers, branch: string): ProjectProfile {
  const existing = loadProjectProfile(cwd);
  const inferred = inferProfileAnswersFromInterview(answers, branch);

  const staleEmptyProfile =
    existing && existing.workspace_kind === 'empty' && !existing.target && !!inferred.target;

  if (existing && !staleEmptyProfile) {
    return existing;
  }

  const { profile } = inspectProjectProfile(cwd, inferred);
  if (profile.workspace_kind === 'empty' && profile.target && inferred.target) {
    profile.evidence.push({
      name: 'Stack suy ra từ câu trả lời phỏng vấn (C/W-series)',
      observed_at: new Date().toISOString(),
      confidence: 0.8,
    });
  }
  saveProjectProfile(cwd, profile);
  return profile;
}

export type InterviewAnswers = Record<string, string>;

export interface EmittedDoc {
  file: string;     // relative path (e.g. '00-vision.md')
  content: string;  // markdown content with replaced placeholders
}

/**
 * Emits a single document content by replacing placeholders in its template file.
 */
export function emitDoc(
  targetDoc: string,
  filledSlots: Record<string, string>,
  templatesDir: string
): string {
  const templatePath = join(templatesDir, targetDoc);
  if (!existsSync(templatePath)) {
    throw new Error(`Template not found for: ${targetDoc}`);
  }

  const templateContent = readFileSync(templatePath, 'utf8');

  // Strip first line if it's the template metadata header
  let content = templateContent;
  if (content.startsWith('# Template — ')) {
    const lines = content.split('\n');
    lines.shift();
    content = lines.join('\n').trimStart();
  }

  // Replace placeholders: {{key}} -> filledSlots[key]
  const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  return content.replace(regex, (_, key) => {
    if (key in filledSlots) {
      return filledSlots[key];
    }
    return '';
  });
}

/**
 * Emits the entire document tree for a given branch based on interview answers.
 */
export function emitTree(
  answers: InterviewAnswers,
  branch: string,
  templatesDir: string,
  options?: { srcPrefix?: string; workspaceDir?: string }
): EmittedDoc[] {
  // 1. Determine release docs from shapes.yaml registry
  const __dirname = dirname(fileURLToPath(import.meta.url));
  let shapesPath = join(process.cwd(), 'Design/Content/interview-script/shapes.yaml');
  if (!existsSync(shapesPath)) {
    shapesPath = join(__dirname, '../../Design/Content/interview-script/shapes.yaml');
  }
  if (!existsSync(shapesPath)) {
    shapesPath = join(__dirname, '../../../Design/Content/interview-script/shapes.yaml');
  }
  let releaseDocs: string[] = [];

  if (existsSync(shapesPath)) {
    const registry = loadShapes(shapesPath);
    const shape = registry.shapes.find((s) => s.id === branch);
    if (!shape) {
      throw new Error(`Invalid branch/shape: ${branch}`);
    }
    releaseDocs = shape.release_docs;
  } else {
    // Fallback if shapes.yaml does not exist
    if (branch === 'hybrid') {
      releaseDocs = ['07-deployment.md', '07-release.md'];
    } else if (branch === 'web') {
      releaseDocs = ['07-deployment.md'];
    } else if (branch === 'mobile') {
      releaseDocs = ['07-release.md'];
    } else if (branch === 'cli') {
      releaseDocs = ['07-distribution.md'];
    } else {
      throw new Error(`Invalid branch/shape: ${branch}`);
    }
  }

  const files = [
    '00-vision.md',
    '01-personas.md',
    '02-scope.md',
    '03-data-model.md',
    '04-flows.md',
    '05-architecture.md',
    '06-constraints.md',
    ...releaseDocs,
    '08-build-plan.md',
    '09-execution-plan.md',
    'decisions.md',
    'README.md',
  ];

  // 2. Prepare filledSlots mapping
  const cwd = options?.workspaceDir ?? process.cwd();
  const profile = resolveProjectProfile(cwd, answers, branch);
  const filledSlots: Record<string, string> = {};

  // Map user content answers falling back from S0-S6, W1-W5, M1-M5, C1-C5
  filledSlots['vision_elevator_pitch'] = answers['vision_elevator_pitch'] || answers['S0'] || '';
  filledSlots['problem_summary'] = answers['problem_summary'] || answers['S1'] || '';
  filledSlots['current_workaround'] = answers['current_workaround'] || answers['S1'] || '';

  filledSlots['primary_persona_summary'] = answers['primary_persona_summary'] || answers['S2'] || '';
  filledSlots['primary_persona_job_to_be_done'] = answers['primary_persona_job_to_be_done'] || answers['S2'] || '';
  filledSlots['secondary_persona_summary'] = answers['secondary_persona_summary'] || answers['S2'] || '';
  filledSlots['secondary_persona_job_to_be_done'] = answers['secondary_persona_job_to_be_done'] || answers['S2'] || '';

  filledSlots['must_have_scope'] = answers['must_have_scope'] || answers['S3'] || '';
  filledSlots['should_have_scope'] = answers['should_have_scope'] || answers['S3'] || '';
  filledSlots['could_have_scope'] = answers['could_have_scope'] || answers['S3'] || '';
  filledSlots['wont_for_mvp_scope'] = answers['wont_for_mvp_scope'] || answers['S3'] || '';

  filledSlots['core_entities'] = answers['core_entities'] || answers['S4'] || '';
  filledSlots['entity_relationships'] = answers['entity_relationships'] || answers['S4'] || '';
  filledSlots['deferred_data_notes'] = answers['deferred_data_notes'] || answers['S4'] || '';

  filledSlots['main_flow_summary'] = answers['main_flow_summary'] || answers['S5'] || '';
  filledSlots['main_flow_steps'] = answers['main_flow_steps'] || answers['S5'] || '';
  filledSlots['main_flow_risks_or_edge_cases'] = answers['main_flow_risks_or_edge_cases'] || answers['S5'] || '';

  filledSlots['team_and_ownership_constraints'] = answers['team_and_ownership_constraints'] || answers['S6'] || '';
  filledSlots['timeline_constraints'] = answers['timeline_constraints'] || answers['S6'] || '';
  filledSlots['budget_constraints'] = answers['budget_constraints'] || answers['S6'] || '';
  filledSlots['constraint_impact_on_scope'] = answers['constraint_impact_on_scope'] || answers['S6'] || '';

  if (branch === 'web') {
    filledSlots['client_and_rendering_strategy'] = answers['client_and_rendering_strategy'] || answers['W1'] || answers['W2'] || '';
    filledSlots['architecture_overview'] = answers['architecture_overview'] || answers['W2'] || '';
    filledSlots['hosting_strategy'] = answers['hosting_strategy'] || answers['W3'] || '';
    filledSlots['deployment_goal'] = answers['deployment_goal'] || answers['W3'] || '';
    filledSlots['auth_and_access_strategy'] = answers['auth_and_access_strategy'] || answers['W4'] || '';
    filledSlots['realtime_push_or_sync_strategy'] = answers['realtime_push_or_sync_strategy'] || answers['W5'] || '';
    filledSlots['initial_ops_notes'] = answers['initial_ops_notes'] || answers['W5'] || '';
    filledSlots['domain_and_access_strategy'] = answers['domain_and_access_strategy'] || answers['W3'] || '';
    filledSlots['device_capabilities_and_permissions'] = answers['device_capabilities_and_permissions'] || 'Không áp dụng đối với Web.';
  } else if (branch === 'mobile') {
    filledSlots['client_and_rendering_strategy'] = answers['client_and_rendering_strategy'] || answers['M1'] || answers['M2'] || '';
    filledSlots['architecture_overview'] = answers['architecture_overview'] || answers['M2'] || '';
    filledSlots['distribution_strategy'] = answers['distribution_strategy'] || answers['M3'] || '';
    filledSlots['release_goal'] = answers['release_goal'] || answers['M3'] || '';
    filledSlots['auth_and_access_strategy'] = answers['auth_and_access_strategy'] || answers['M4'] || '';
    filledSlots['realtime_push_or_sync_strategy'] = answers['realtime_push_or_sync_strategy'] || answers['M5'] || '';
    filledSlots['store_readiness_notes'] = answers['store_readiness_notes'] || answers['M5'] || '';
    filledSlots['device_capabilities_and_permissions'] = answers['device_capabilities_and_permissions'] || answers['M1'] || '';
    filledSlots['monetization_strategy'] = answers['monetization_strategy'] || answers['M3'] || '';
  } else if (branch === 'cli') {
    filledSlots['architecture_overview'] = answers['architecture_overview'] || answers['C1'] || '';
    filledSlots['client_and_rendering_strategy'] = answers['client_and_rendering_strategy'] || answers['C2'] || '';
    filledSlots['auth_and_access_strategy'] = answers['auth_and_access_strategy'] || answers['C3'] || '';
    filledSlots['device_capabilities_and_permissions'] = answers['device_capabilities_and_permissions'] || answers['C4'] || '';
    filledSlots['realtime_push_or_sync_strategy'] = answers['realtime_push_or_sync_strategy'] || 'Không áp dụng đối với CLI.';

    // CLI distribution templates slots
    filledSlots['distribution_channel'] = answers['distribution_channel'] || answers['C5'] || '';
    filledSlots['versioning_strategy'] = answers['versioning_strategy'] || answers['C5'] || '';
    filledSlots['installation_guide'] = answers['installation_guide'] || answers['C5'] || '';
  } else {
    // hybrid
    const webStrategy = answers['client_and_rendering_strategy'] || answers['W1'] || answers['W2'] || '';
    const mobileStrategy = answers['client_and_rendering_strategy'] || answers['M1'] || answers['M2'] || '';
    filledSlots['client_and_rendering_strategy'] = `[Web] ${webStrategy}\n\n[Mobile] ${mobileStrategy}`;

    const webOverview = answers['architecture_overview'] || answers['W2'] || '';
    const mobileOverview = answers['architecture_overview'] || answers['M2'] || '';
    filledSlots['architecture_overview'] = `[Web] ${webOverview}\n\n[Mobile] ${mobileOverview}`;

    const webAuth = answers['auth_and_access_strategy'] || answers['W4'] || '';
    const mobileAuth = answers['auth_and_access_strategy'] || answers['M4'] || '';
    filledSlots['auth_and_access_strategy'] = `[Web] ${webAuth}\n\n[Mobile] ${mobileAuth}`;

    const webSync = answers['realtime_push_or_sync_strategy'] || answers['W5'] || '';
    const mobileSync = answers['realtime_push_or_sync_strategy'] || answers['M5'] || '';
    filledSlots['realtime_push_or_sync_strategy'] = `[Web] ${webSync}\n\n[Mobile] ${mobileSync}`;

    filledSlots['device_capabilities_and_permissions'] = answers['device_capabilities_and_permissions'] || answers['M1'] || '';

    // Web deployment slots
    filledSlots['hosting_strategy'] = answers['hosting_strategy'] || answers['W3'] || '';
    filledSlots['deployment_goal'] = answers['deployment_goal'] || answers['W3'] || '';
    filledSlots['initial_ops_notes'] = answers['initial_ops_notes'] || answers['W5'] || '';
    filledSlots['domain_and_access_strategy'] = answers['domain_and_access_strategy'] || answers['W3'] || '';

    // Mobile release slots
    filledSlots['distribution_strategy'] = answers['distribution_strategy'] || answers['M3'] || '';
    filledSlots['release_goal'] = answers['release_goal'] || answers['M3'] || '';
    filledSlots['store_readiness_notes'] = answers['store_readiness_notes'] || answers['M5'] || '';
    filledSlots['monetization_strategy'] = answers['monetization_strategy'] || answers['M3'] || '';
  }

  // Sơ đồ dẫn xuất từ chính slot đã chốt — người mới đọc hình nhanh hơn đọc
  // danh sách, và sơ đồ lệch text là không thể vì cả hai sinh từ một nguồn.
  filledSlots['data_model_diagram'] =
    answers['data_model_diagram'] ||
    entityDiagramFromSlots({
      coreEntities: filledSlots['core_entities'],
      entityRelationships: filledSlots['entity_relationships'],
    });
  filledSlots['flow_diagram'] =
    answers['flow_diagram'] ||
    flowDiagramFromSlots({ mainFlowSteps: filledSlots['main_flow_steps'] });

  // S8 — yêu cầu phi chức năng. Đây là hai thứ đổi kiến trúc nhiều nhất mà người
  // mới không biết để tự nêu: dữ liệu nhạy cảm (quyết định mức bảo mật) và quy mô
  // (quyết định mức tối ưu). Fallback là mức mặc định của S8, KHÔNG bịa cam kết.
  filledSlots['data_sensitivity_and_security'] =
    answers['data_sensitivity_and_security'] ||
    answers['S8'] ||
    'Chưa khai báo dữ liệu nhạy cảm ngoài thông tin đăng nhập cơ bản. Mức bảo mật tương ứng: băm mật khẩu, không log thông tin đăng nhập, không commit khóa bí mật vào repo. Nếu sau này có thêm dữ liệu cá nhân/thanh toán/sức khỏe, phải cập nhật lại mục này TRƯỚC khi code phần đó.';
  filledSlots['expected_scale_and_performance'] =
    answers['expected_scale_and_performance'] ||
    answers['S8'] ||
    'Quy mô dự kiến năm đầu ở mức nhỏ (vài chục tới vài trăm người dùng). Ở mức này KHÔNG cần cache, queue, sharding hay microservice — làm sớm chỉ tốn thời gian. Khi nào đo được nghẽn thật thì mới tối ưu, và ghi lại số đo vào mục này.';

  // Quyết định kiến trúc mà không ghi lý do và phương án đã loại thì 6 tháng sau
  // không ai (kể cả tác giả) biết vì sao chọn vậy — và người mới không học được
  // gì ngoài một cái tên công nghệ. Đây là phần đưa doc lên mức kiến-trúc-sư.
  filledSlots['architecture_decision_rationale'] =
    answers['architecture_decision_rationale'] ||
    'Chưa ghi lý do cho các quyết định ở trên. Mỗi lựa chọn kỹ thuật cần nối ngược về một câu trả lời phỏng vấn cụ thể (nhu cầu người dùng, ràng buộc, hoặc rủi ro) — nếu không nối được thì đó là chọn theo trend, nên xem lại.';
  filledSlots['architecture_alternatives_considered'] =
    answers['architecture_alternatives_considered'] ||
    'Chưa ghi phương án nào bị loại. Một quyết định không có phương án thay thế thường là chưa quyết định — chỉ là mặc định. Ghi rõ đã cân nhắc gì và vì sao loại, để sau này đổi ý còn biết điều kiện nào đã thay đổi.';

  // Sổ quyết định — PHẢI dựng sau khi mọi slot kiến trúc (gồm S8 và rationale) đã
  // điền xong, nếu không bảng sẽ ghi "(chưa chốt)" cho chính thứ vừa chốt. Dựng
  // từ cùng bộ slot với 05-architecture nên hai file không thể lệch nhau.
  filledSlots['decision_table'] =
    answers['decision_table'] || renderDecisionTable({ branch, slots: filledSlots });

  // 08-build-plan.md — file dẫn xuất (D28): slot do skill điền lúc emit;
  // fallback deterministic dựng từ answers thô S3 (Must) + S5 (flow) nếu skill không cung cấp.
  filledSlots['build_plan_principles'] =
    answers['build_plan_principles'] ||
    'Đi từng milestone một, theo đúng thứ tự — không nhảy cóc. Milestone đầu tiên luôn là "khung xương biết đi" (walking skeleton): một lát cắt mỏng nhất của flow chính chạy được từ đầu tới cuối, dù xấu. Mỗi milestone sau chỉ thêm đúng một mục Must, và phải chạy lại được flow chính trước khi sang milestone kế. Chưa xong Must thì chưa đụng Should/Could.';
  filledSlots['build_milestones'] =
    answers['build_milestones'] ||
    `M0 — Khung xương biết đi: dựng project chạy được với lát cắt mỏng nhất của flow chính (xem 04-flows.md). Done-when: chạy được một lượt flow từ đầu tới cuối với dữ liệu cứng.\n\nCác milestone kế tiếp — mỗi mục Must trong 02-scope.md là một milestone, xếp theo thứ tự xuất hiện trong flow chính:\n${filledSlots['must_have_scope']}\n\nDone-when của mỗi milestone: bước tương ứng trong 04-flows.md chạy được thật (không mock), và các milestone trước vẫn chạy.`;
  filledSlots['build_verification_notes'] =
    answers['build_verification_notes'] ||
    `Sau mỗi milestone: chạy lại toàn bộ flow chính trong 04-flows.md như một người dùng thật, và rà các điểm dễ vỡ đã ghi nhận: ${filledSlots['main_flow_risks_or_edge_cases'] || '(xem 04-flows.md mục Điểm Dễ Vỡ)'}`;

  // Lịch tuần dẫn xuất từ deadline S6 + Must-list S3. Không khai deadline thì
  // không sinh lịch — kế hoạch vẫn chạy theo thứ tự phụ thuộc như cũ.
  filledSlots['build_weekly_schedule'] =
    answers['build_weekly_schedule'] ||
    renderWeeklySchedule(
      planWeeklySchedule({
        timelineText: filledSlots['timeline_constraints'] || answers['S6'] || '',
        milestones: [
          'M0 — Khung xương biết đi (lát cắt mỏng nhất của flow chính)',
          ...extractMustFeatures(answers)
            .filter((m) => !extractWontFeatures(answers).includes(m))
            // Mục Must cuối câu hay dính dấu chấm của câu S3.
            .map((m) => m.replace(/\.$/, '').trim()),
        ],
      })
    );

  // Compute README slots
  filledSlots['docs_readme_project_summary'] =
    answers['docs_readme_project_summary'] ||
    filledSlots['vision_elevator_pitch'] ||
    'Tài liệu nền móng thiết kế dự án.';

  // Glossary: skill điền thuật ngữ nghiệp vụ riêng của dự án lúc emit (D28);
  // fallback deterministic là bảng thuật ngữ của chính phương pháp — luôn đúng
  // cho mọi dự án, giúp người mới đọc docs không vấp khái niệm.
  filledSlots['docs_readme_glossary'] =
    answers['docs_readme_glossary'] ||
    `| Thuật ngữ | Nghĩa |
|---|---|
| Must / Should / Could / Won't | Bốn tầng phạm vi MVP (xem 02-scope.md). Won't là cố ý KHÔNG làm, không phải quên. |
| M0 — khung xương biết đi | Milestone đầu tiên: lát cắt mỏng nhất của flow chính chạy end-to-end với dữ liệu cứng. |
| Done-when | Điều kiện nghiệm thu của milestone, kiểm bằng hành vi thật (chạy gì, thấy gì) — không phải "code xong". |
| allowed_paths | Danh sách file được phép sửa trong một task; sửa ngoài phạm vi sẽ bị gate chặn. |
| verify / evidence | Lệnh kiểm chứng do engine tự chạy và bằng chứng nó ghi lại; task chỉ done khi verify pass. |

(Thuật ngữ nghiệp vụ riêng của dự án: xem thực thể trong 03-data-model.md.)`;

  filledSlots['docs_readme_file_map'] =
    answers['docs_readme_file_map'] ||
    (branch === 'hybrid'
      ? `docs/
├── 00-vision.md          # Tầm nhìn & Nỗi đau cốt lõi
├── 01-personas.md        # Đối tượng người dùng mục tiêu
├── 02-scope.md           # Phạm vi tính năng MVP (MoSCoW)
├── 03-data-model.md      # Thiết kế thực thế dữ liệu (Database Schema)
├── 04-flows.md           # Luồng trải nghiệm người dùng điển hình
├── 05-architecture.md    # Quyết định kiến trúc & Tech stack
├── 06-constraints.md     # Ràng buộc về thời gian, ngân sách, nhân lực
├── 07-deployment.md      # Quy trình CI/CD và cấu hình Hosting (Vercel)
├── 07-release.md         # Kế hoạch phát hành & Phân phối cửa hàng
├── 08-build-plan.md      # Kế hoạch build theo milestone (đọc trước khi code)
├── 09-execution-plan.md  # Kế hoạch thực thi chi tiết & quản lý rủi ro kỹ thuật
├── decisions.md          # Sổ quyết định: chốt gì, từ câu hỏi nào, chi tiết ở đâu
├── progress-log.md       # (engine sinh lúc build) Nhật ký đã làm gì, vấp ở đâu
├── break-tasks/          # (engine sinh lúc review) Việc phải sửa sau mỗi feature
├── conventions/          # Khóa stack, allowed paths, dependencies
├── .design-everything/execution-plan.json # File cấu hình thực thi máy-đọc
└── README.md             # Mục lục tài liệu (File này)`
      : (branch === 'web'
        ? `docs/
├── 00-vision.md          # Tầm nhìn & Nỗi đau cốt lõi
├── 01-personas.md        # Đối tượng người dùng mục tiêu
├── 02-scope.md           # Phạm vi tính năng MVP (MoSCoW)
├── 03-data-model.md      # Thiết kế thực thế dữ liệu (Database Schema)
├── 04-flows.md           # Luồng trải nghiệm người dùng điển hình
├── 05-architecture.md    # Quyết định kiến trúc & Tech stack
├── 06-constraints.md     # Ràng buộc về thời gian, ngân sách, nhân lực
├── 07-deployment.md      # Quy trình CI/CD và cấu hình Hosting (Vercel)
├── 08-build-plan.md      # Kế hoạch build theo milestone (đọc trước khi code)
├── 09-execution-plan.md  # Kế hoạch thực thi chi tiết & quản lý rủi ro kỹ thuật
├── decisions.md          # Sổ quyết định: chốt gì, từ câu hỏi nào, chi tiết ở đâu
├── progress-log.md       # (engine sinh lúc build) Nhật ký đã làm gì, vấp ở đâu
├── break-tasks/          # (engine sinh lúc review) Việc phải sửa sau mỗi feature
├── conventions/          # Khóa stack, allowed paths, dependencies
├── .design-everything/execution-plan.json # File cấu hình thực thi máy-đọc
└── README.md             # Mục lục tài liệu (File này)`
        : branch === 'mobile'
          ? `docs/
├── 00-vision.md          # Tầm nhìn & Nỗi đau cốt lõi
├── 01-personas.md        # Đối tượng người dùng mục tiêu
├── 02-scope.md           # Phạm vi tính năng MVP (MoSCoW)
├── 03-data-model.md      # Thiết kế thực thế dữ liệu (Database Schema)
├── 04-flows.md           # Luồng trải nghiệm người dùng điển hình
├── 05-architecture.md    # Quyết định kiến trúc & Tech stack
├── 06-constraints.md     # Ràng buộc về thời gian, ngân sách, nhân lực
├── 07-release.md         # Kế hoạch phát hành & Phân phối cửa hàng
├── 08-build-plan.md      # Kế hoạch build theo milestone (đọc trước khi code)
├── 09-execution-plan.md  # Kế hoạch thực thi chi tiết & quản lý rủi ro kỹ thuật
├── decisions.md          # Sổ quyết định: chốt gì, từ câu hỏi nào, chi tiết ở đâu
├── progress-log.md       # (engine sinh lúc build) Nhật ký đã làm gì, vấp ở đâu
├── break-tasks/          # (engine sinh lúc review) Việc phải sửa sau mỗi feature
├── conventions/          # Khóa stack, allowed paths, dependencies
├── .design-everything/execution-plan.json # File cấu hình thực thi máy-đọc
└── README.md             # Mục lục tài liệu (File này)`
          : `docs/
├── 00-vision.md          # Tầm nhìn & Nỗi đau cốt lõi
├── 01-personas.md        # Đối tượng người dùng mục tiêu
├── 02-scope.md           # Phạm vi tính năng MVP (MoSCoW)
├── 03-data-model.md      # Thiết kế thực thế dữ liệu (Database Schema)
├── 04-flows.md           # Luồng trải nghiệm người dùng điển hình
├── 05-architecture.md    # Quyết định kiến trúc & Tech stack
├── 06-constraints.md     # Ràng buộc về thời gian, ngân sách, nhân lực
├── 07-distribution.md    # Hướng dẫn đóng gói, phân phối và cài đặt
├── 08-build-plan.md      # Kế hoạch build theo milestone (đọc trước khi code)
├── 09-execution-plan.md  # Kế hoạch thực thi chi tiết & quản lý rủi ro kỹ thuật
├── decisions.md          # Sổ quyết định: chốt gì, từ câu hỏi nào, chi tiết ở đâu
├── progress-log.md       # (engine sinh lúc build) Nhật ký đã làm gì, vấp ở đâu
├── break-tasks/          # (engine sinh lúc review) Việc phải sửa sau mỗi feature
├── conventions/          # Khóa stack, allowed paths, dependencies
├── .design-everything/execution-plan.json # File cấu hình thực thi máy-đọc
└── README.md             # Mục lục tài liệu (File này)`
      )
    );

  filledSlots['docs_readme_branch_note'] =
    answers['docs_readme_branch_note'] ||
    (branch === 'hybrid'
      ? 'Dự án Hybrid (Web & Mobile). Chi tiết triển khai Web ở 07-deployment.md, quy trình phân phối Mobile ở 07-release.md.'
      : branch === 'web'
        ? 'Dự án phát triển trên nền tảng Web. Cấu hình triển khai Next.js/Vercel chi tiết ở 07-deployment.md.'
        : branch === 'mobile'
          ? 'Dự án phát triển trên nền tảng Mobile. Quy trình phân phối CH Play/App Store chi tiết ở 07-release.md.'
          : 'Dự án Công cụ dòng lệnh (CLI). Quy trình đóng gói và phân phối chi tiết ở 07-distribution.md.');

  filledSlots['docs_readme_release_step'] =
    answers['docs_readme_release_step'] ||
    (branch === 'hybrid'
      ? '`07-deployment.md` và `07-release.md` — xem đường phát hành phù hợp với web và mobile.'
      : branch === 'web'
        ? '`07-deployment.md` — xem đường phát hành phù hợp với web.'
        : branch === 'mobile'
          ? '`07-release.md` — xem quy trình phát hành & phân phối cửa hàng di động.'
          : '`07-distribution.md` — xem hướng dẫn đóng gói, phân phối và cài đặt công cụ dòng lệnh.');

  filledSlots['docs_readme_build_notes'] =
    answers['docs_readme_build_notes'] ||
    (branch === 'hybrid'
      ? 'Chạy Web local: `npm run dev`. Chạy Mobile Android: `npm run android`, iOS: `npm run ios`. Chạy tests: `npm test`.'
      : branch === 'web'
        ? 'Chạy local: `npm run dev`. Chạy tests: `npm test`.'
        : branch === 'mobile'
          ? 'Chạy Android: `npm run android`. Chạy iOS: `npm run ios`. Chạy tests: `npm test`.'
          : profile.language === 'python'
            ? 'Cài đặt: tạo virtualenv rồi `pip install -e .`. Chạy CLI local: `python -m <tên_package>` (hoặc lệnh entrypoint khai báo trong pyproject.toml). Chạy tests: `pytest`.'
            : 'Cài đặt dependencies: `npm install`. Chạy CLI local: `node bin/index.js` (hoặc build: `npm run build`). Chạy tests: `npm test`.');

  const synthesis = synthesizeExecutionPlan({
    answers,
    profile,
    docs: ['00-vision.md', '01-personas-jtbd.md', '02-non-functional-requirements.md', '03-project-scope.md', '04-data-model.md', '05-user-flows.md', '06-system-architecture.md', '07-engineering-constraints.md', '08-ops-distribution.md', '09-execution-plan.md'],
  });

  const planJson = synthesis.plan;

  if (synthesis.blocked) {
    filledSlots['first_supported_environment'] =
      `- Trạng thái: BỊ CHẶN (Blocked)\n- Lý do: ${synthesis.message || 'Thiếu project manifest hoặc chưa xác nhận cấu hình.'}`;

    filledSlots['risk_register'] =
      `| Mã rủi ro | Mức độ | Trạng thái | Tiêu chuẩn thoát (Exit Criterion) |\n|---|---|---|---|\n| R-blocked | Cao | spike-required | ${synthesis.message || 'Khởi tạo tệp tin cấu hình dự án.'} |`;

    filledSlots['feasibility_spikes'] =
      '- **Khảo sát rủi ro**: Khởi tạo tệp manifest của stack đã chốt ngay tại thư mục gốc (`package.json` cho Node CLI, `pyproject.toml` hoặc `requirements.txt` cho Python CLI, scaffold Vite cho web), sau đó chạy lại lệnh `emit` để engine sinh lại execution plan theo stack thật.';

    filledSlots['task_cards'] =
      `### [Task T0-discovery] Khảo sát môi trường và cấu hình tệp dự án\n- Loại: spike\n- Mục tiêu: Thiết lập cấu hình dự án hợp lệ.\n- Preconditions: Không.\n- Lệnh kiểm chứng: Không.`;

    filledSlots['acceptance_evidence_rules'] =
      '- **Chặn quy trình (Blocked)**: Toàn bộ quá trình triển khai bị chặn cho đến khi phát hiện được project manifest hợp lệ.';
  } else {
    filledSlots['first_supported_environment'] =
      `- Target: ${profile.target}\n- Runtime: ${profile.runtime}\n- Package Manager: ${profile.package_manager}\n- Language: ${profile.language}\n- Capabilities: ${profile.capabilities.join(', ')}`;

    filledSlots['risk_register'] =
      `| Mã rủi ro | Tiêu đề | Trạng thái | Tiêu chuẩn thoát (Exit Criterion) |\n|---|---|---|---|\n` +
      planJson.risks.map((r) => `| ${r.id} | ${r.title} | ${r.status} | ${r.exit_criterion} |`).join('\n');

    filledSlots['feasibility_spikes'] =
      planJson.risks
        .filter((r) => r.status === 'spike-required')
        .map((r) => `- **Spike ${r.id}**: ${r.exit_criterion}`)
        .join('\n') || '- Không có spike yêu cầu khảo sát thêm.';

    filledSlots['task_cards'] = Object.values(planJson.tasks)
      .map((task) => {
        const cmdLines = task.commands.map((cmd) => `  * \`${cmd.argv.join(' ')}\` (expected: ${cmd.expected.kind} ${cmd.expected.value || ''})`).join('\n');
        return `### [Task ${task.id}] ${task.intent}\n` +
          `- Loại: ${task.type}\n` +
          `- Milestone: ${task.milestone}\n` +
          `- Preconditions: ${task.preconditions.join(', ') || 'Không'}\n` +
          `- Allowed paths: ${task.allowed_paths.join(', ') || 'Không'}\n` +
          `- Lệnh kiểm chứng:\n${cmdLines || '  * Không'}`;
      })
      .join('\n\n');

    filledSlots['acceptance_evidence_rules'] =
      '- **Bằng chứng (Evidence)**: Mỗi task hoàn thành phải đính kèm tệp log output hoặc bằng chứng tương ứng.\n- **Tiếp tục (Resume)**: Khi đổi phiên làm việc hoặc khởi động lại Agent, đọc lại `execution-state.json` và tiếp tục từ task chưa hoàn thành gần nhất.';
  }

  // Compute planned anchor source/symbol placeholders based on branch
  const srcPrefix = options?.srcPrefix ?? (branch === 'mobile' ? 'apps/mobile/src/' : 'src/');

  const plannedMapping: Record<string, { file: string; symbol: string }> = {
    elevator_pitch: { file: 'features/vision/vision.ts', symbol: 'projectVision' },
    problem_summary: { file: 'features/vision/problem.ts', symbol: 'problemSummary' },
    current_workaround: { file: 'features/vision/workaround.ts', symbol: 'currentWorkaround' },
    primary_persona: { file: 'features/personas/personas.ts', symbol: 'primaryPersona' },
    primary_job: { file: 'features/personas/personas.ts', symbol: 'primaryJobToBeDone' },
    secondary_persona: { file: 'features/personas/personas.ts', symbol: 'secondaryPersona' },
    secondary_job: { file: 'features/personas/personas.ts', symbol: 'secondaryJobToBeDone' },
    must_have: { file: 'features/scope/scope.ts', symbol: 'mustHaveScope' },
    should_have: { file: 'features/scope/scope.ts', symbol: 'shouldHaveScope' },
    could_have: { file: 'features/scope/scope.ts', symbol: 'couldHaveScope' },
    wont_for_mvp: { file: 'features/scope/scope.ts', symbol: 'wontForMvpScope' },
    core_entities: { file: 'features/data-model/dataModel.ts', symbol: 'coreEntities' },
    entity_relationships: { file: 'features/data-model/dataModel.ts', symbol: 'entityRelationships' },
    deferred_data: { file: 'features/data-model/dataModel.ts', symbol: 'deferredDataNotes' },
    data_model_diagram: { file: 'features/data-model/dataModel.ts', symbol: 'dataModelDiagram' },
    main_flow_summary: { file: 'features/flows/flows.ts', symbol: 'mainFlowSummary' },
    main_flow_steps: { file: 'features/flows/flows.ts', symbol: 'mainFlowSteps' },
    flow_diagram: { file: 'features/flows/flows.ts', symbol: 'flowDiagram' },
    flow_risks: { file: 'features/flows/flows.ts', symbol: 'flowRisks' },
    architecture_overview: { file: 'features/architecture/architecture.ts', symbol: 'architectureOverview' },
    client_rendering: { file: 'features/architecture/architecture.ts', symbol: 'clientAndRenderingStrategy' },
    auth_access: { file: 'features/architecture/architecture.ts', symbol: 'authAndAccessStrategy' },
    realtime_sync: { file: 'features/architecture/architecture.ts', symbol: 'realtimePushOrSyncStrategy' },
    device_capabilities: { file: 'features/architecture/architecture.ts', symbol: 'deviceCapabilitiesAndPermissions' },
    data_sensitivity: { file: 'features/architecture/architecture.ts', symbol: 'dataSensitivityAndSecurity' },
    expected_scale: { file: 'features/architecture/architecture.ts', symbol: 'expectedScaleAndPerformance' },
    decision_rationale: { file: 'features/architecture/architecture.ts', symbol: 'architectureDecisionRationale' },
    alternatives_considered: { file: 'features/architecture/architecture.ts', symbol: 'architectureAlternativesConsidered' },
    team_ownership: { file: 'features/constraints/constraints.ts', symbol: 'teamAndOwnershipConstraints' },
    timeline: { file: 'features/constraints/constraints.ts', symbol: 'timelineConstraints' },
    budget: { file: 'features/constraints/constraints.ts', symbol: 'budgetConstraints' },
    scope_impact: { file: 'features/constraints/constraints.ts', symbol: 'constraintImpactOnScope' },
    deployment_goal: { file: 'features/deployment/deploy.ts', symbol: 'deployPipeline' },
    hosting_strategy: { file: 'features/deployment/deploy.ts', symbol: 'hostingStrategy' },
    domain_access: { file: 'features/deployment/deploy.ts', symbol: 'domainAndAccessStrategy' },
    ops_notes: { file: 'features/deployment/deploy.ts', symbol: 'initialOpsNotes' },
    release_goal: { file: 'features/release/release.ts', symbol: 'releaseGoal' },
    distribution_strategy: { file: 'features/release/release.ts', symbol: 'distributionStrategy' },
    store_readiness: { file: 'features/release/release.ts', symbol: 'storeReadinessNotes' },
    monetization_strategy: { file: 'features/release/release.ts', symbol: 'monetizationStrategy' },
    distribution_channel: { file: 'features/distribution/dist.ts', symbol: 'distributionChannel' },
    versioning_strategy: { file: 'features/distribution/dist.ts', symbol: 'versioningStrategy' },
    installation_guide: { file: 'features/distribution/dist.ts', symbol: 'installationGuide' },
    build_principles: { file: 'features/build/plan.ts', symbol: 'buildPlanPrinciples' },
    build_milestones: { file: 'features/build/plan.ts', symbol: 'buildMilestones' },
    build_weekly_schedule: { file: 'features/build/plan.ts', symbol: 'buildWeeklySchedule' },
    build_verification: { file: 'features/build/plan.ts', symbol: 'buildVerificationNotes' },
    decision_table: { file: 'features/decisions/decisions.ts', symbol: 'decisionTable' },
    decision_change_policy: { file: 'features/decisions/decisions.ts', symbol: 'decisionChangePolicy' },
    docs_readme_order: { file: 'features/docs/readme.ts', symbol: 'readingOrder' },
    docs_readme_summary: { file: 'features/docs/readme.ts', symbol: 'projectSummary' },
    docs_readme_glossary: { file: 'features/docs/readme.ts', symbol: 'projectGlossary' },
    docs_readme_file_map: { file: 'features/docs/readme.ts', symbol: 'fileMap' },
    docs_readme_branch_note: { file: 'features/docs/readme.ts', symbol: 'branchSpecificDocNote' },
    docs_readme_build_notes: { file: 'features/docs/readme.ts', symbol: 'buildNotes' },
    environment: { file: 'features/execution/plan.ts', symbol: 'firstSupportedEnvironment' },
    risk_register: { file: 'features/execution/plan.ts', symbol: 'riskRegister' },
    spikes: { file: 'features/execution/plan.ts', symbol: 'feasibilitySpikes' },
    task_cards: { file: 'features/execution/plan.ts', symbol: 'taskCards' },
    resume_rules: { file: 'features/execution/plan.ts', symbol: 'resumeRules' },
  };

  // Populate planned anchors. Mapping mặc định viết theo TypeScript; với dự án
  // Python đổi đuôi file và symbol sang idiom Python để anchor trỏ tới đích thật.
  const isPython = profile.language === 'python';
  const camelToSnake = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  for (const [key, val] of Object.entries(plannedMapping)) {
    const file = isPython
      ? camelToSnake(val.file).replace(/-/g, '_').replace(/\.ts$/, '.py')
      : val.file;
    const symbol = isPython ? camelToSnake(val.symbol) : val.symbol;
    filledSlots[`planned_src_${key}`] = answers[`planned_src_${key}`] || `${srcPrefix}${file}`;
    filledSlots[`planned_symbol_${key}`] = answers[`planned_symbol_${key}`] || symbol;
  }

  // 3. Emit tree
  const tree = files.map((file) => {
    const content = emitDoc(file, filledSlots, templatesDir);
    return { file, content };
  });

  const planJsonContent = JSON.stringify(planJson, null, 2);
  const digest = createHash('sha256').update(planJsonContent.trim()).digest('hex');

  // Append digest to 09-execution-plan.md
  const planMdEntry = tree.find((t) => t.file === '09-execution-plan.md');
  if (planMdEntry) {
    planMdEntry.content += `\n\n<!-- plan-digest: ${digest} -->`;
  }

  tree.push({
    file: '.design-everything/execution-plan.json',
    content: planJsonContent,
  });

  return tree;
}

import { ExecutionPlanV3 } from './schemas/executionPlan.js';

export function generateExecutionPlanJson(
  answers: InterviewAnswers,
  branch: string,
  workspaceDir: string = process.cwd()
): ExecutionPlanV3 {
  const profile = resolveProjectProfile(workspaceDir, answers, branch);

  const synthesis = synthesizeExecutionPlan({
    answers,
    profile,
    docs: ['00-vision.md', '01-personas-jtbd.md', '02-non-functional-requirements.md', '03-project-scope.md', '04-data-model.md', '05-user-flows.md', '06-system-architecture.md', '07-engineering-constraints.md', '08-ops-distribution.md', '09-execution-plan.md'],
  });

  return synthesis.plan;
}
