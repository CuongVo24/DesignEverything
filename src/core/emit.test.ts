import { expect, test, describe } from 'vitest';
import { emitDoc, emitTree, InterviewAnswers } from './emit.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const realTemplatesDir = join(projectRoot, 'Design/Content/doc-templates');

describe('emitDoc function', () => {
  test('should substitute placeholders and strip template metadata header', () => {
    const tempDir = join(__dirname, '../../test/fixtures/progress/temp-emit-test');
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    mkdirSync(tempDir, { recursive: true });

    const tempTemplateContent = `# Template — docs/00-vision.md

Elevator Pitch: {{vision_elevator_pitch}}
<!-- anchor: id=00-vision/elevator-pitch  src={{planned_src_elevator_pitch}}::{{planned_symbol_elevator_pitch}}  rev=  status=planned -->
`;
    const templateFileName = '00-vision.md';
    writeFileSync(join(tempDir, templateFileName), tempTemplateContent, 'utf8');

    const filledSlots = {
      vision_elevator_pitch: 'Trang web chia sẻ công thức nấu ăn',
      planned_src_elevator_pitch: 'src/features/vision/vision.ts',
      planned_symbol_elevator_pitch: 'projectVision',
    };

    const result = emitDoc(templateFileName, filledSlots, tempDir);

    expect(result).not.toContain('# Template — ');
    expect(result).toContain('Elevator Pitch: Trang web chia sẻ công thức nấu ăn');
    expect(result).toContain(
      '<!-- anchor: id=00-vision/elevator-pitch  src=src/features/vision/vision.ts::projectVision  rev=  status=planned -->'
    );

    // Clean up
    rmSync(tempDir, { recursive: true, force: true });
  });
});

describe('emitTree function', () => {
  const mockAnswers: InterviewAnswers = {
    S0: 'RecipeShare app',
    S1: 'Nỗi đau là A, xoay xở bằng B',
    S2: 'My (Recipe Contributor) và Huy (Shopper)',
    S3: 'Must: Đăng nhập, Tạo công thức. Should: Danh sách đi chợ.',
    S4: 'User, Recipe, ShoppingList',
    S5: 'Mở app -> xem công thức -> chọn món -> đi siêu thị',
    S6: 'Solo, 3 tuần, nhánh web',
    W1: 'Cần SEO, Next.js SSR',
    W2: 'Responsive, mobile-first',
    W3: 'Deploy Vercel free-tier',
    W4: 'NextAuth Google OAuth',
    W5: 'Không realtime ở MVP',
  };

  test('should emit correct 13 files for web branch, including 07-deployment.md and excluding 07-release.md', () => {
    const emitted = emitTree(mockAnswers, 'web', realTemplatesDir);

    expect(emitted).toHaveLength(13);

    const fileNames = emitted.map((d) => d.file);
    expect(fileNames).toContain('00-vision.md');
    expect(fileNames).toContain('01-personas.md');
    expect(fileNames).toContain('02-scope.md');
    expect(fileNames).toContain('03-data-model.md');
    expect(fileNames).toContain('04-flows.md');
    expect(fileNames).toContain('05-architecture.md');
    expect(fileNames).toContain('06-constraints.md');
    expect(fileNames).toContain('07-deployment.md');
    expect(fileNames).toContain('09-execution-plan.md');
    expect(fileNames).toContain('decisions.md');
    expect(fileNames).toContain('.design-everything/execution-plan.json');
    expect(fileNames).toContain('README.md');
    expect(fileNames).not.toContain('07-release.md');

    // Sổ quyết định phải nối được về câu phỏng vấn, không chỉ tồn tại.
    const decisionsDoc = emitted.find((d) => d.file === 'decisions.md');
    expect(decisionsDoc!.content).toContain('| D-shape | Hình-hài dự án | web | S7 |');
    expect(decisionsDoc!.content).toContain('Cần SEO, Next.js SSR');

    // Verify anchors in 00-vision.md
    const visionDoc = emitted.find((d) => d.file === '00-vision.md');
    expect(visionDoc).toBeDefined();
    expect(visionDoc!.content).toContain('status=planned');
    expect(visionDoc!.content).toContain('rev=');
    expect(visionDoc!.content).toContain('src=src/features/vision/vision.ts::projectVision');

    // Verify README.md project summary substitution
    const readmeDoc = emitted.find((d) => d.file === 'README.md');
    expect(readmeDoc).toBeDefined();
    expect(readmeDoc!.content).toContain('RecipeShare app');
    expect(readmeDoc!.content).toContain('Next.js/Vercel chi tiết ở 07-deployment.md');
  });

  test('should emit correct 13 files for mobile branch, including 07-release.md and excluding 07-deployment.md', () => {
    const emitted = emitTree(mockAnswers, 'mobile', realTemplatesDir);

    expect(emitted).toHaveLength(13);

    const fileNames = emitted.map((d) => d.file);
    expect(fileNames).toContain('07-release.md');
    expect(fileNames).toContain('09-execution-plan.md');
    expect(fileNames).toContain('.design-everything/execution-plan.json');
    expect(fileNames).not.toContain('07-deployment.md');

    // Verify mobile src paths prefix
    const visionDoc = emitted.find((d) => d.file === '00-vision.md');
    expect(visionDoc).toBeDefined();
    expect(visionDoc!.content).toContain('src=apps/mobile/src/features/vision/vision.ts::projectVision');

    // Verify README.md monetization strategy / store readiness
    const readmeDoc = emitted.find((d) => d.file === 'README.md');
    expect(readmeDoc).toBeDefined();
    expect(readmeDoc!.content).toContain('CH Play/App Store chi tiết ở 07-release.md');
  });

  test('should override srcPrefix when options.srcPrefix is provided', () => {
    const emittedWeb = emitTree(mockAnswers, 'web', realTemplatesDir, { srcPrefix: 'web-app/' });
    const visionWeb = emittedWeb.find((d) => d.file === '00-vision.md');
    expect(visionWeb!.content).toContain('src=web-app/features/vision/vision.ts::projectVision');

    const emittedMobile = emitTree(mockAnswers, 'mobile', realTemplatesDir, { srcPrefix: 'app/' });
    const visionMobile = emittedMobile.find((d) => d.file === '00-vision.md');
    expect(visionMobile!.content).toContain('src=app/features/vision/vision.ts::projectVision');
  });

  test('should emit correct 14 files for hybrid branch, including both 07-deployment.md and 07-release.md', () => {
    const hybridAnswers: InterviewAnswers = {
      ...mockAnswers,
      M1: 'Expo Standalone',
      M2: 'Offline first client',
      M3: 'CH Play free-tier',
      M4: 'OAuth integration mobile',
      M5: 'Firebase push notifications',
    };
    const emitted = emitTree(hybridAnswers, 'hybrid', realTemplatesDir);

    expect(emitted).toHaveLength(14);

    const fileNames = emitted.map((d) => d.file);
    expect(fileNames).toContain('07-deployment.md');
    expect(fileNames).toContain('07-release.md');
    expect(fileNames).toContain('09-execution-plan.md');
    expect(fileNames).toContain('.design-everything/execution-plan.json');

    // Verify architecture document contains combined slots
    const archDoc = emitted.find((d) => d.file === '05-architecture.md');
    expect(archDoc).toBeDefined();
    expect(archDoc!.content).toContain('[Web] Cần SEO, Next.js SSR');
    expect(archDoc!.content).toContain('[Mobile] Offline first client');

    // Verify readme file map contains both deployment and release
    const readmeDoc = emitted.find((d) => d.file === 'README.md');
    expect(readmeDoc).toBeDefined();
    expect(readmeDoc!.content).toContain('07-deployment.md');
    expect(readmeDoc!.content).toContain('07-release.md');
  });

  test('should emit correct 13 files for cli branch, including 07-distribution.md', () => {
    const cliAnswers: InterviewAnswers = {
      ...mockAnswers,
      C1: 'Node.js (TypeScript)',
      C2: 'flags/arguments và interactive prompts',
      C3: 'file config JSON ~/.config/myapp.json và ENV',
      C4: 'cross-platform macOS, Linux, Windows',
      C5: 'NPM registry',
    };

    const emitted = emitTree(cliAnswers, 'cli', realTemplatesDir);
    expect(emitted).toHaveLength(13);

    const fileNames = emitted.map((d) => d.file);
    expect(fileNames).toContain('00-vision.md');
    expect(fileNames).toContain('05-architecture.md');
    expect(fileNames).toContain('07-distribution.md');
    expect(fileNames).toContain('09-execution-plan.md');
    expect(fileNames).toContain('.design-everything/execution-plan.json');
    expect(fileNames).not.toContain('07-deployment.md');
    expect(fileNames).not.toContain('07-release.md');

    // Default srcPrefix for CLI should be 'src/'
    const visionDoc = emitted.find((d) => d.file === '00-vision.md');
    expect(visionDoc!.content).toContain('src=src/features/vision/vision.ts::projectVision');

    // Verify architecture document contains C1-C4 answers
    const archDoc = emitted.find((d) => d.file === '05-architecture.md');
    expect(archDoc).toBeDefined();
    expect(archDoc!.content).toContain('Node.js (TypeScript)');
    expect(archDoc!.content).toContain('flags/arguments và interactive prompts');
    expect(archDoc!.content).toContain('file config JSON ~/.config/myapp.json và ENV');
    expect(archDoc!.content).toContain('cross-platform macOS, Linux, Windows');

    // Verify distribution document contains C5 answer
    const distDoc = emitted.find((d) => d.file === '07-distribution.md');
    expect(distDoc).toBeDefined();
    expect(distDoc!.content).toContain('NPM registry');

    // Verify README.md references 07-distribution.md
    const readmeDoc = emitted.find((d) => d.file === 'README.md');
    expect(readmeDoc!.content).toContain('07-distribution.md');
  });

  test('should generate valid execution-plan.json conforming to executionPlanSchemaV3', async () => {
    const { executionPlanSchemaV3 } = await import('./schemas/index.js');
    const emitted = emitTree(mockAnswers, 'web', realTemplatesDir);
    const planFile = emitted.find((d) => d.file === '.design-everything/execution-plan.json');
    expect(planFile).toBeDefined();

    const planJson = JSON.parse(planFile!.content);
    const parsed = executionPlanSchemaV3.safeParse(planJson);
    expect(parsed.success).toBe(true);
  });

  test('should throw error for invalid branch', () => {
    expect(() => emitTree(mockAnswers, 'invalid_branch', realTemplatesDir)).toThrow(
      /Invalid branch\/shape/
    );
  });

  test('should emit a blocked discovery plan when workspaceDir option is an empty directory without manifest', () => {
    const tempDir = join(__dirname, '../../test/fixtures/progress/temp-empty-cwd-test');
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    mkdirSync(tempDir, { recursive: true });

    try {
      const emitted = emitTree(mockAnswers, 'web', realTemplatesDir, { workspaceDir: tempDir });
      const planDoc = emitted.find((d) => d.file === '.design-everything/execution-plan.json');
      expect(planDoc).toBeDefined();

      const planJson = JSON.parse(planDoc!.content);
      expect(planJson.discovery_status).toBe('blocked');
      expect(planJson.tasks['T0-discovery']).toBeDefined();
      expect(planJson.tasks['T1-scaffold']).toBeUndefined();

      const mdDoc = emitted.find((d) => d.file === '09-execution-plan.md');
      expect(mdDoc).toBeDefined();
      expect(mdDoc!.content).toContain('BỊ CHẶN');
      expect(mdDoc!.content).toContain('R-blocked');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe('A1-02 (Wave A1) — real per-artifact provenance in emitted docs', () => {
  const cliAnswers: InterviewAnswers = {
    S0: 'CLI tool',
    S1: 'Nỗi đau A, xoay xở B',
    S2: 'Dev (Contributor)',
    S3: 'Must: chạy lệnh chính. Should: log đẹp.',
    S4: 'Config, Job',
    S5: 'Mở terminal -> chạy lệnh -> xem kết quả',
    S6: 'Solo, 2 tuần',
    S8: 'Vài trăm người dùng, không lưu dữ liệu nhạy cảm.',
    C1: 'Node.js (TypeScript)',
    C2: 'flags/arguments',
    C3: 'file config JSON ~/.config/myapp.json',
    C4: 'macOS',
    C5: 'NPM registry',
  };

  test('04-flows.md cites S5 for the flow diagram', () => {
    const emitted = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const flows = emitted.find((d) => d.file === '04-flows.md');
    expect(flows!.content).toMatch(/^>\s*Nguồn: S5/m);
  });

  test('05-architecture.md cites the specific answered question per populated section, not a doc-wide guess', () => {
    const emitted = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const arch = emitted.find((d) => d.file === '05-architecture.md')!.content;
    // C1..C4 were all answered — each of their sections must cite exactly
    // that question, not some other one.
    expect(arch).toMatch(/^>\s*Nguồn: C1$/m);
    expect(arch).toMatch(/^>\s*Nguồn: C2$/m);
    expect(arch).toMatch(/^>\s*Nguồn: C3$/m);
    expect(arch).toMatch(/^>\s*Nguồn: C4$/m);
    expect(arch).toMatch(/^>\s*Nguồn: S8$/m);
  });

  test('removing S8 degrades its architecture sections to the unsourced fallback text with no citation — never a fabricated one', () => {
    const noS8: InterviewAnswers = { ...cliAnswers };
    delete noS8.S8;
    const emitted = emitTree(noS8, 'cli', realTemplatesDir);
    const arch = emitted.find((d) => d.file === '05-architecture.md')!.content;
    // The methodology-default fallback text still appears (S8's slot never
    // goes empty), but it must NOT claim "> Nguồn: S8" — nobody answered S8.
    expect(arch).toContain('Chưa khai báo dữ liệu nhạy cảm');
    expect(arch).not.toMatch(/^>\s*Nguồn: S8$/m);
  });

  test('docs/decisions.md points at its own existing per-row "Nối từ câu" column', () => {
    const emitted = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const decisions = emitted.find((d) => d.file === 'decisions.md')!.content;
    expect(decisions).toContain('Nối từ câu');
    expect(decisions).toMatch(/^>\s*Nguồn:/m);
  });

  test('08-build-plan.md cites S3/S5 for the deterministic milestone fallback', () => {
    const emitted = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const buildPlan = emitted.find((d) => d.file === '08-build-plan.md')!.content;
    expect(buildPlan).toMatch(/^>\s*Nguồn: S3, S5$/m);
  });

  test('execution-plan.json risks and tasks carry machine-readable source_refs where answer-derived, and omit it for procedural entries', () => {
    const emitted = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const planJson = JSON.parse(emitted.find((d) => d.file === '.design-everything/execution-plan.json')!.content);

    const r1 = planJson.risks.find((r: { id: string }) => r.id === 'R1');
    expect(r1.source_refs).toBeUndefined();

    const featureTask = Object.values(planJson.tasks).find(
      (t: unknown) => (t as { milestone: string }).milestone.startsWith('M4-')
    ) as { source_refs?: string[] } | undefined;
    if (featureTask) {
      expect(featureTask.source_refs).toEqual(['S3', 'S5']);
    }
  });

  test('docs/README.md flags externally-supplied glossary content as unverified rather than trusting it silently', () => {
    const withSkillGlossary: InterviewAnswers = {
      ...cliAnswers,
      docs_readme_glossary: 'Thuật ngữ riêng dự án do skill sinh.',
    };
    const emitted = emitTree(withSkillGlossary, 'cli', realTemplatesDir);
    const readme = emitted.find((d) => d.file === 'README.md')!.content;
    expect(readme).toContain('Thuật ngữ riêng dự án do skill sinh.');
    expect(readme).toContain('⚠ unknown — cần hỏi người');
  });

  test('docs/README.md marks the static methodology glossary fallback as not project-specific rather than citing a question', () => {
    const emitted = emitTree(cliAnswers, 'cli', realTemplatesDir);
    const readme = emitted.find((d) => d.file === 'README.md')!.content;
    expect(readme).toMatch(/^>\s*Nguồn: bảng thuật ngữ phương pháp/m);
  });
});
