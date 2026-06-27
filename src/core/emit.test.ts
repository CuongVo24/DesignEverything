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

  test('should emit correct 9 files for web branch, including 07-deployment.md and excluding 07-release.md', () => {
    const emitted = emitTree(mockAnswers, 'web', realTemplatesDir);

    expect(emitted).toHaveLength(9);

    const fileNames = emitted.map((d) => d.file);
    expect(fileNames).toContain('00-vision.md');
    expect(fileNames).toContain('01-personas.md');
    expect(fileNames).toContain('02-scope.md');
    expect(fileNames).toContain('03-data-model.md');
    expect(fileNames).toContain('04-flows.md');
    expect(fileNames).toContain('05-architecture.md');
    expect(fileNames).toContain('06-constraints.md');
    expect(fileNames).toContain('07-deployment.md');
    expect(fileNames).toContain('README.md');
    expect(fileNames).not.toContain('07-release.md');

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

  test('should emit correct 9 files for mobile branch, including 07-release.md and excluding 07-deployment.md', () => {
    const emitted = emitTree(mockAnswers, 'mobile', realTemplatesDir);

    expect(emitted).toHaveLength(9);

    const fileNames = emitted.map((d) => d.file);
    expect(fileNames).toContain('07-release.md');
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
});
