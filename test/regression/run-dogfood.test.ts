import { expect, test, describe } from 'vitest';
import { emitTree } from '../../src/core/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const realTemplatesDir = join(projectRoot, 'Design/Content/doc-templates');
const outputDocsDir = join(projectRoot, 'Design/RoadMap/Month3/dogfood/proj-01/docs-generated');

describe('Dogfood Project #1 Emission', () => {
  test('should generate documents for HabitBuilder and save to docs-generated', () => {
    const answers: Record<string, string> = {
      S0: 'HabitBuilder Mobile App - ứng dụng di động giúp xây dựng và theo dõi thói quen hàng ngày.',
      S1: 'Khó giữ thói quen lâu dài vì thiếu động lực và hay quên; giải pháp hiện tại là dùng lịch giấy hoặc ứng dụng nhắc nhở thông thường nhưng không có thống kê tiến độ trực quan.',
      S2: 'Nam (Habit Builder) muốn tạo, tích chọn thói quen hàng ngày và xem biểu đồ tiến độ; An (Habit Partner) muốn nhận thông báo khi Nam hoàn thành thói quen để cùng thúc đẩy.',
      S3: 'Must: Đăng nhập, Tạo thói quen, Tích chọn hoàn thành, Xem thống kê tuần. Should: Đồng bộ offline, Nhận thông báo nhắc nhở hàng ngày.',
      S4: 'User, Habit, HabitLog, PartnerConnection.',
      S5: 'Mở ứng dụng -> Thêm thói quen (tên, tần suất) -> Mỗi ngày mở app tích chọn -> Xem màn hình thống kê tiến độ hình tròn.',
      S6: 'Nhóm 2 người, 4 tuần, mobile',
      M1: 'React Native + Expo để build cross-platform nhanh chóng và dễ test trên thiết bị thật qua Expo Go.',
      M2: 'Offline-first. Cần lưu trữ logs hoàn thành thói quen cục bộ bằng SQLite; đồng bộ lên Supabase PostgreSQL khi có mạng.',
      M3: 'Quyền truy cập camera để thay đổi ảnh đại diện và đính kèm ảnh minh chứng đã hoàn thành thói quen.',
      M4: 'Cần thông báo nhắc nhở (push notifications) hàng ngày qua Expo Notification Service (hoặc FCM) lúc 8 giờ sáng để nhắc nhở người dùng thực hiện thói quen.',
      M5: 'Phát hành bản thử nghiệm qua Expo Application Services (EAS) Internal Testing trước, sau đó phát hành lên Apple App Store và Google Play Store (áp dụng mô hình miễn phí kèm gói Premium mua qua In-App Purchase).',
    };

    const docs = emitTree(answers, 'mobile', realTemplatesDir);
    expect(docs).toHaveLength(9);

    mkdirSync(outputDocsDir, { recursive: true });

    for (const doc of docs) {
      const filePath = join(outputDocsDir, doc.file);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, doc.content, 'utf8');
    }

    // Assert files are correctly generated
    const fileNames = docs.map((d) => d.file);
    expect(fileNames).toContain('07-release.md');
    expect(fileNames).not.toContain('07-deployment.md');
  });
});
