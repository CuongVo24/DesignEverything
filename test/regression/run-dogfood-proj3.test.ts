import { expect, test, describe } from 'vitest';
import { emitTree } from '../../src/core/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const realTemplatesDir = join(projectRoot, 'Design/Content/doc-templates');
const outputDocsDir = join(projectRoot, 'Design/RoadMap/Month3/dogfood/proj-03/docs-generated');

describe('Dogfood Project #3 Emission (TaskFlow Mobile App)', () => {
  test('should generate documents for TaskFlow and save to docs-generated', () => {
    const answers: Record<string, string> = {
      S0: 'TaskFlow Mobile App - ứng dụng di động quản lý công việc và cộng tác nhóm thời gian thực cho doanh nghiệp vừa và nhỏ.',
      S1: 'Các thành viên trong nhóm khó theo dõi trạng thái công việc của nhau, dẫn đến chồng chéo công việc; giải pháp hiện tại là dùng các chat app (Zalo/Slack) nhưng trôi tin nhắn và không có tiến trình công việc rõ ràng.',
      S2: 'Minh (Project Manager) muốn tạo task, giao việc và xem biểu đồ Gantt/Kanban; Sơn (Developer) muốn nhận việc, cập nhật tiến độ và báo cáo hoàn thành.',
      S3: 'Must: Đăng nhập, Tạo công việc, Giao việc, Thay đổi trạng thái công việc (To Do, In Progress, Done). Should: Gửi thông báo đẩy khi có task mới, Đính kèm tài liệu/hình ảnh.',
      S4: 'User, Team, Task, TaskComment, Assignment.',
      S5: 'Minh tạo task -> Giao cho Sơn -> Sơn nhận thông báo trên điện thoại -> Sơn mở app làm và bấm hoàn thành task.',
      S6: 'Nhóm 3 người, 6 tuần, mobile',
      M1: 'React Native native CLI (không dùng Expo) để dễ dàng tích hợp các thư viện native chuyên sâu cho bảo mật.',
      M2: 'Offline-first. Sử dụng WatermelonDB để đồng bộ hóa hiệu năng cao với PostgreSQL database qua REST API.',
      M3: 'Quyền truy cập Photo Library và Files để tải file tài liệu đính kèm công việc.',
      M4: 'Cần FCM push notifications gửi ngay lập tức khi có task được giao hoặc có thay đổi khẩn cấp.',
      M5: 'Phát hành qua Apple Enterprise Program và Google Play Console Beta Testing để phục vụ nội bộ doanh nghiệp trước khi phát hành rộng rãi (mô hình thu phí B2B subscription).',
    };

    const docs = emitTree(answers, 'mobile', realTemplatesDir);
    expect(docs).toHaveLength(9);

    mkdirSync(outputDocsDir, { recursive: true });

    for (const doc of docs) {
      const filePath = join(outputDocsDir, doc.file);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, doc.content, 'utf8');
    }

    const fileNames = docs.map((d) => d.file);
    expect(fileNames).toContain('07-release.md');
    expect(fileNames).not.toContain('07-deployment.md');
  });
});
