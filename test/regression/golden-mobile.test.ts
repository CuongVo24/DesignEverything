import { expect, test, describe } from 'vitest';
import { emitTree } from '../../src/core/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
import { getStructure } from './docStructure.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const realTemplatesDir = join(projectRoot, 'Design/Content/doc-templates');
const goldenMobileDocsDir = join(projectRoot, 'Design/Content/golden-example-mobile/docs');

describe('Golden Mobile Regression Check', () => {
  test('should generate docs matching the golden mobile structure and anchors exactly', () => {
    const answers: Record<string, string> = {
      S0: 'RecipeShare mobile app giúp chia sẻ công thức nấu ăn',
      S1: 'Nỗi đau là khó tìm công thức cũ trong chat; giải quyết tạm bằng notepad.',
      S2: 'My (Recipe Contributor) muốn đăng món; Huy (Shopper) muốn xem danh sách đi chợ.',
      S3: 'Must: Đăng nhập, Xem công thức, Tạo công thức, Tìm kiếm. Should: Shopping List.',
      S4: 'User, Recipe, ShoppingList',
      S5: 'Mở app -> xem công thức -> chọn món -> tích nguyên liệu',
      S6: 'Solo, 3 tuần, mobile',
      M1: 'React Native cross-platform',
      M2: 'Offline-first với SQLite sync',
      M3: 'Camera và Photo Library access',
      M4: 'FCM push notifications',
      M5: 'TestFlight beta trước, thu phí IAP',
    };

    const emittedDocs = emitTree(answers, 'mobile', realTemplatesDir);
    const docFilesOnly = emittedDocs.filter(d => !d.file.startsWith('.design-everything/'));
    expect(docFilesOnly).toHaveLength(12);

    const fileNames = docFilesOnly.map((d) => d.file);
    expect(fileNames).toContain('07-release.md');
    expect(fileNames).not.toContain('07-deployment.md');

    for (const doc of docFilesOnly) {
      const goldenFilePath = join(goldenMobileDocsDir, doc.file);
      expect(existsSync(goldenFilePath)).toBe(true);

      const goldenContent = readFileSync(goldenFilePath, 'utf8');

      const emittedStruct = getStructure(doc.content);
      const goldenStruct = getStructure(goldenContent);

      // Verify headings and anchors match exactly
      expect(emittedStruct.headings).toEqual(goldenStruct.headings);
      expect(emittedStruct.anchors).toEqual(goldenStruct.anchors);

      // Verify every file (except README.md) uses the correct source path prefix (apps/mobile/src/)
      if (doc.file !== 'README.md') {
        expect(doc.content).toContain('src=apps/mobile/src/');
      }
    }
  });
});
