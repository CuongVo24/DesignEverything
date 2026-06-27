## Tại sao cần file này
Tài liệu này ghi nhận các quyết định thiết kế kiến trúc phần mềm cốt lõi để giải quyết các yêu cầu phi chức năng (non-functional requirements) như SEO, khả năng hiển thị đa thiết bị, bảo mật thông tin và hiệu năng. Đây là bộ khung kỹ thuật giúp AI và lập trình viên thống nhất stack phát triển.

## Hướng Triển Khai Tổng Quan
Hệ thống sử dụng Next.js làm framework cốt lõi. Sự kết hợp giữa Next.js App Router và NextAuth cung cấp kiến trúc tối giản nhưng mạnh mẽ, bảo mật cao và đáp ứng tốt cả trải nghiệm máy tính và điện thoại.
<!-- anchor: id=05-architecture/overview  src=src/features/architecture/architecture.ts::architectureOverview  rev=  status=planned -->

## Giao Diện Và Rendering
*   **Next.js (App Router)**: Được lựa chọn để kết hợp linh hoạt các chiến lược render nhằm giải quyết bài toán SEO (W1):
    *   **Static Site Generation (SSG) / Server-Side Rendering (SSR)**: Áp dụng cho trang chủ và các trang chi tiết công thức nấu ăn công khai. Google Bot có thể dễ dàng đọc được HTML tĩnh để lập chỉ mục tìm kiếm.
    *   **Client-Side Rendering (CSR)**: Áp dụng cho các trang sau đăng nhập như trang quản lý danh sách đi chợ cá nhân (`/shopping-list`) để tăng tốc độ tương tác cho Huy khi đi siêu thị.
*   **Giao diện Responsive và Mobile-first**: Sử dụng CSS Vanilla/TailwindCSS để co giãn bố cục:
    *   **Desktop Layout**: Tối ưu hóa không gian rộng để My dễ dàng gõ văn bản soạn thảo công thức dài, tải ảnh món ăn lên.
    *   **Mobile-first UI**: Tối ưu hóa kích thước nút bấm, checkbox của trang ShoppingList để Huy dễ dàng thao tác bằng một tay khi đang đẩy xe mua sắm ở siêu thị (W2).
<!-- anchor: id=05-architecture/client-rendering  src=src/features/architecture/architecture.ts::clientAndRenderingStrategy  rev=  status=planned -->

## Xác Thực Và Phân Quyền
*   **NextAuth.js (Auth.js)**: Tích hợp làm thư viện quản lý session và đăng nhập (W4).
*   **OAuth Provider**: Sử dụng Google OAuth làm cổng đăng nhập chính để loại bỏ việc quản lý mật khẩu phức tạp. Token được lưu trữ an toàn trong HttpOnly Cookie.
<!-- anchor: id=05-architecture/auth-access  src=src/features/architecture/architecture.ts::authAndAccessStrategy  rev=  status=planned -->

## Realtime, Push, Hoặc Đồng Bộ
*   **Reload/Fetch cơ bản**: Không sử dụng WebSocket hay Server-Sent Events (SSE) để giảm độ phức tạp (W5). Hệ thống sử dụng cơ chế Server Actions của Next.js để mutate dữ liệu và revalidate cache khi người dùng đăng công thức mới hoặc đánh dấu nguyên liệu đã mua.
<!-- anchor: id=05-architecture/realtime-sync  src=src/features/architecture/architecture.ts::realtimePushOrSyncStrategy  rev=  status=planned -->

## Năng Lực Thiết Bị Hoặc Quyền Đặc Biệt
*   **Trình duyệt Web tiêu chuẩn**: Ứng dụng chạy trên môi trường Web, không yêu cầu các quyền truy cập phần cứng đặc thù của điện thoại (như camera native, bluetooth) mà chỉ sử dụng khả năng Web API tiêu chuẩn cho tải ảnh.
<!-- anchor: id=05-architecture/device-capabilities  src=src/features/architecture/architecture.ts::deviceCapabilitiesAndPermissions  rev=  status=planned -->
