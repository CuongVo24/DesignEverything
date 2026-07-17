/**
 * Đầu vào phỏng vấn của ba phiên dogfood Month3.
 *
 * Cả test hồi quy lẫn script regen (scripts/regen-dogfood.mjs) đều đọc từ đây,
 * để câu trả lời không trôi ra hai bản. Module này chỉ chứa dữ liệu và đường dẫn
 * tương đối — bên gọi tự nối với gốc dự án của mình, vì script regen chạy từ bản
 * biên dịch trong dist/ nên không thể suy ra gốc dự án từ __dirname.
 */

export const TEMPLATES_REL_DIR = 'Design/Content/doc-templates';

export interface DogfoodProject {
  /** Thư mục dogfood, ví dụ "proj-01". */
  id: string;
  title: string;
  branch: string;
  /** Ảnh chụp docs đã commit, dùng làm mốc so sánh cấu trúc. */
  docsRelDir: string;
  answers: Record<string, string>;
  expectedReleaseDoc: string;
  forbiddenReleaseDoc: string;
}

const proj01: DogfoodProject = {
  id: 'proj-01',
  title: 'HabitBuilder Mobile App',
  branch: 'mobile',
  docsRelDir: 'Design/RoadMap/Month3/dogfood/proj-01/docs-generated',
  expectedReleaseDoc: '07-release.md',
  forbiddenReleaseDoc: '07-deployment.md',
  answers: {
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
  },
};

const proj02: DogfoodProject = {
  id: 'proj-02',
  title: 'BookRegistry Web App',
  branch: 'web',
  docsRelDir: 'Design/RoadMap/Month3/dogfood/proj-02/docs-generated',
  expectedReleaseDoc: '07-deployment.md',
  forbiddenReleaseDoc: '07-release.md',
  answers: {
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
  },
};

const proj03: DogfoodProject = {
  id: 'proj-03',
  title: 'TaskFlow Mobile App',
  branch: 'mobile',
  docsRelDir: 'Design/RoadMap/Month3/dogfood/proj-03/docs-generated',
  expectedReleaseDoc: '07-release.md',
  forbiddenReleaseDoc: '07-deployment.md',
  answers: {
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
  },
};

export const dogfoodProjects: DogfoodProject[] = [proj01, proj02, proj03];

export function getDogfoodProject(id: string): DogfoodProject {
  const project = dogfoodProjects.find((p) => p.id === id);
  if (!project) {
    throw new Error(`Không tìm thấy dự án dogfood "${id}".`);
  }
  return project;
}
