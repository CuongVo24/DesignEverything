import { expect, test, describe } from 'vitest';
import { emitTree } from '../../src/core/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const realTemplatesDir = join(projectRoot, 'Design/Content/doc-templates');
const goldenCliDocsDir = join(projectRoot, 'Design/Content/golden-example-cli/docs');

function getStructure(content: string) {
  const headings = (content.match(/^##\s+.+$/gm) || []).map((h) => h.trim());
  const anchors = (content.match(/<!-- anchor:\s*id=[\S]+/g) || []).map((a) =>
    a.replace(/<!-- anchor:\s*id=/, '').trim()
  );
  return { headings, anchors };
}

describe('Golden CLI Regression Check', () => {
  test('should generate docs matching the golden cli structure and anchors exactly', () => {
    const answers: Record<string, string> = {
      S0: 'RecipeShare CLI tool giúp quản lý công thức nấu ăn qua dòng lệnh',
      S1: 'Nỗi đau là khó tìm công thức cũ; giải quyết tạm bằng grep file text.',
      S2: 'My (Recipe Contributor) muốn đăng món; Huy (Shopper) muốn xem danh sách đi chợ.',
      S3: 'Must: Thêm công thức, Xem danh sách công thức, Tìm kiếm. Should: Xuất file JSON.',
      S4: 'User, Recipe, ShoppingList',
      S5: 'Mở terminal -> gõ lệnh search -> xem công thức -> xuất file',
      S6: 'Solo, 3 tuần, cli',
      C1: 'Node.js (TypeScript)',
      C2: 'flags/arguments và interactive prompts',
      C3: 'file config JSON ~/.config/myapp.json và ENV',
      C4: 'cross-platform macOS, Linux, Windows',
      C5: 'NPM registry',
    };

    const emittedDocs = emitTree(answers, 'cli', realTemplatesDir);
    expect(emittedDocs).toHaveLength(10);

    const fileNames = emittedDocs.map((d) => d.file);
    expect(fileNames).toContain('07-distribution.md');
    expect(fileNames).not.toContain('07-deployment.md');
    expect(fileNames).not.toContain('07-release.md');

    for (const doc of emittedDocs) {
      const goldenFilePath = join(goldenCliDocsDir, doc.file);
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
