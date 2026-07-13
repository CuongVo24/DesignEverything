import { expect, test, describe } from 'vitest';
import { emitTree } from '../../src/core/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const realTemplatesDir = join(projectRoot, 'Design/Content/doc-templates');
const goldenWebDocsDir = join(projectRoot, 'Design/Content/golden-example-web/docs');

function getStructure(content: string) {
  const headings = (content.match(/^##\s+.+$/gm) || []).map((h) => h.trim());
  const anchors = (content.match(/<!-- anchor:\s*id=[\S]+/g) || []).map((a) =>
    a.replace(/<!-- anchor:\s*id=/, '').trim()
  );
  return { headings, anchors };
}

describe('Golden Web Regression Check', () => {
  test('should generate docs matching the golden web structure and anchors exactly', () => {
    const answers: Record<string, string> = {
      S0: 'RecipeShare web app giúp chia sẻ công thức nấu ăn',
      S1: 'Nỗi đau là khó tìm công thức cũ trong chat; giải quyết tạm bằng notepad.',
      S2: 'My (Recipe Contributor) muốn đăng món; Huy (Shopper) muốn xem danh sách đi chợ.',
      S3: 'Must: Đăng nhập, Xem công thức, Tạo công thức, Tìm kiếm. Should: Shopping List.',
      S4: 'User, Recipe, ShoppingList',
      S5: 'Mở web -> xem công thức -> chọn món -> tích nguyên liệu',
      S6: 'Solo, 3 tuần, web',
      W1: 'Next.js SSR cho SEO',
      W2: 'Responsive mobile-first',
      W3: 'Triển khai lên Vercel',
      W4: 'NextAuth Google OAuth',
      W5: 'Không realtime ở MVP',
    };

    const emittedDocs = emitTree(answers, 'web', realTemplatesDir);
    expect(emittedDocs).toHaveLength(10);

    const fileNames = emittedDocs.map((d) => d.file);
    expect(fileNames).toContain('07-deployment.md');
    expect(fileNames).not.toContain('07-release.md');

    for (const doc of emittedDocs) {
      const goldenFilePath = join(goldenWebDocsDir, doc.file);
      expect(existsSync(goldenFilePath)).toBe(true);

      const goldenContent = readFileSync(goldenFilePath, 'utf8');

      const emittedStruct = getStructure(doc.content);
      const goldenStruct = getStructure(goldenContent);

      // Verify headings and anchors match exactly
      expect(emittedStruct.headings).toEqual(goldenStruct.headings);
      expect(emittedStruct.anchors).toEqual(goldenStruct.anchors);

      // Verify every file (except README.md) uses the correct source path prefix (src/)
      if (doc.file !== 'README.md') {
        expect(doc.content).toContain('src=src/');
      }
    }
  });
});
