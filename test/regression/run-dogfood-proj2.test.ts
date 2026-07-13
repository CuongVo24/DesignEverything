import { expect, test, describe } from 'vitest';
import { emitTree } from '../../src/core/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const realTemplatesDir = join(projectRoot, 'Design/Content/doc-templates');
const outputDocsDir = join(projectRoot, 'Design/RoadMap/Month3/dogfood/proj-02/docs-generated');

describe('Dogfood Project #2 Emission (BookRegistry Web App)', () => {
  test('should generate documents for BookRegistry and save to docs-generated', () => {
    const answers: Record<string, string> = {
      S0: 'BookRegistry Web App - ứng dụng web quản lý tủ sách cá nhân và ghi chú đọc sách.',
      S1: 'Khó theo dõi các đầu sách đã mua và tiến độ đọc sách của bản thân; giải pháp hiện tại là dùng Excel hoặc ghi chú tay nhưng bất tiện khi tìm kiếm hoặc cập nhật nhanh trên điện thoại.',
      S2: 'Nam (Book Lover) muốn nhập thông tin sách, cập nhật tiến độ đọc (trang hiện tại, nhận xét) và xem thống kê số sách đã đọc; Thu (Friend) muốn vào xem danh sách để mượn sách.',
      S3: 'Must: Đăng nhập, Thêm sách mới, Cập nhật trạng thái đọc, Xem danh sách sách. Should: Tìm kiếm sách theo tên/tác giả, Lọc sách theo thể loại.',
      S4: 'User, Book, ReadingLog, BorrowRequest.',
      S5: 'Đăng nhập -> Thêm sách (tên, tác giả, số trang) -> Cập nhật trạng thái (chưa đọc, đang đọc, đã đọc) -> Ghi nhận trang sách hiện tại.',
      S6: 'Solo, 2 tuần, web',
      W1: 'React + Vite (SPA) kết hợp Supabase client-side API để triển khai nhanh gọn.',
      W2: 'Responsive layout sử dụng CSS Grid để co giãn trên mobile.',
      W3: 'Triển khai frontend lên Vercel free-tier, database trên Supabase free-tier.',
      W4: 'Supabase Auth (Email/Password và Google OAuth).',
      W5: 'Reload trang để cập nhật trạng thái; không cần WebSocket/Realtime ở MVP.',
    };

    const docs = emitTree(answers, 'web', realTemplatesDir);
    expect(docs).toHaveLength(10);

    mkdirSync(outputDocsDir, { recursive: true });

    for (const doc of docs) {
      const filePath = join(outputDocsDir, doc.file);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, doc.content, 'utf8');
    }

    const fileNames = docs.map((d) => d.file);
    expect(fileNames).toContain('07-deployment.md');
    expect(fileNames).not.toContain('07-release.md');
  });
});
