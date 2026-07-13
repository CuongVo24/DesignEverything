import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadShapes } from './loadShapes.js';

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
  options?: { srcPrefix?: string }
): EmittedDoc[] {
  // 1. Determine release docs from shapes.yaml registry
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const shapesPath = join(__dirname, '../../Design/Content/interview-script/shapes.yaml');
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
    'README.md',
  ];

  // 2. Prepare filledSlots mapping
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

  // Compute README slots
  filledSlots['docs_readme_project_summary'] =
    answers['docs_readme_project_summary'] ||
    filledSlots['vision_elevator_pitch'] ||
    'Tài liệu nền móng thiết kế dự án.';

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

  filledSlots['docs_readme_build_notes'] =
    answers['docs_readme_build_notes'] ||
    (branch === 'hybrid'
      ? 'Chạy Web local: `npm run dev`. Chạy Mobile Android: `npm run android`, iOS: `npm run ios`. Chạy tests: `npm test`.'
      : branch === 'web'
        ? 'Chạy local: `npm run dev`. Chạy tests: `npm test`.'
        : branch === 'mobile'
          ? 'Chạy Android: `npm run android`. Chạy iOS: `npm run ios`. Chạy tests: `npm test`.'
          : 'Cài đặt dependencies: `npm install`. Chạy CLI local: `node bin/index.js` (hoặc build: `npm run build`). Chạy tests: `npm test`.');

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
    main_flow_summary: { file: 'features/flows/flows.ts', symbol: 'mainFlowSummary' },
    main_flow_steps: { file: 'features/flows/flows.ts', symbol: 'mainFlowSteps' },
    flow_risks: { file: 'features/flows/flows.ts', symbol: 'flowRisks' },
    architecture_overview: { file: 'features/architecture/architecture.ts', symbol: 'architectureOverview' },
    client_rendering: { file: 'features/architecture/architecture.ts', symbol: 'clientAndRenderingStrategy' },
    auth_access: { file: 'features/architecture/architecture.ts', symbol: 'authAndAccessStrategy' },
    realtime_sync: { file: 'features/architecture/architecture.ts', symbol: 'realtimePushOrSyncStrategy' },
    device_capabilities: { file: 'features/architecture/architecture.ts', symbol: 'deviceCapabilitiesAndPermissions' },
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
    build_verification: { file: 'features/build/plan.ts', symbol: 'buildVerificationNotes' },
    docs_readme_order: { file: 'features/docs/readme.ts', symbol: 'readingOrder' },
    docs_readme_summary: { file: 'features/docs/readme.ts', symbol: 'projectSummary' },
    docs_readme_file_map: { file: 'features/docs/readme.ts', symbol: 'fileMap' },
    docs_readme_branch_note: { file: 'features/docs/readme.ts', symbol: 'branchSpecificDocNote' },
    docs_readme_build_notes: { file: 'features/docs/readme.ts', symbol: 'buildNotes' },
  };

  // Populate planned anchors
  for (const [key, val] of Object.entries(plannedMapping)) {
    filledSlots[`planned_src_${key}`] = answers[`planned_src_${key}`] || `${srcPrefix}${val.file}`;
    filledSlots[`planned_symbol_${key}`] = answers[`planned_symbol_${key}`] || val.symbol;
  }

  // 3. Emit tree
  return files.map((file) => {
    const content = emitDoc(file, filledSlots, templatesDir);
    return { file, content };
  });
}
