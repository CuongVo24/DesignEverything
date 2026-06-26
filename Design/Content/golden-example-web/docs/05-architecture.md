## Tại sao cần file này
Tài liệu này ghi nhận các quyết định thiết kế kiến trúc phần mềm cốt lõi để giải quyết các yêu cầu phi chức năng (non-functional requirements) như SEO, khả năng hiển thị đa thiết bị, bảo mật thông tin và hiệu năng. Đây là bộ khung kỹ thuật giúp AI và lập trình viên thống nhất stack phát triển.

## 1. Framework và Rendering Strategy (SEO & Public Access)
*   **Next.js (App Router)**: Được lựa chọn để kết hợp linh hoạt các chiến lược render nhằm giải quyết bài toán SEO (W1):
    *   **Static Site Generation (SSG) / Server-Side Rendering (SSR)**: Áp dụng cho trang chủ và các trang chi tiết công thức nấu ăn công khai. Google Bot có thể dễ dàng đọc được HTML tĩnh để lập chỉ mục tìm kiếm.
    *   **Client-Side Rendering (CSR)**: Áp dụng cho các trang sau đăng nhập như trang quản lý danh sách đi chợ cá nhân (`/shopping-list`) để tăng tốc độ tương tác cho Huy khi đi siêu thị.
<!-- anchor: id=05-architecture/rendering-strategy  src=src/features/architecture/rendering.ts::renderingStrategy  rev=  status=planned -->

## 2. Giao diện Responsive và Mobile-first (Hỗ trợ đa thiết bị)
*   **CSS Vanilla / TailwindCSS**: Sử dụng thiết kế responsive bằng Grid và Flexbox để co giãn linh hoạt (W2):
    *   **Desktop Layout**: Tối ưu hóa không gian rộng để My dễ dàng gõ văn bản soạn thảo công thức dài, tải ảnh món ăn lên.
    *   **Mobile-first UI**: Tối ưu hóa kích thước nút bấm, checkbox của trang ShoppingList để Huy dễ dàng thao tác bằng một tay khi đang đẩy xe mua sắm ở siêu thị.
<!-- anchor: id=05-architecture/responsive-ui  src=src/features/architecture/layout.ts::responsiveLayoutStrategy  rev=  status=planned -->

## 3. Xác thực và Bảo mật (Google OAuth)
*   **NextAuth.js (Auth.js)**: Tích hợp làm thư viện quản lý session và đăng nhập (W4).
*   **OAuth Provider**: Sử dụng Google OAuth làm cổng đăng nhập chính để loại bỏ việc quản lý mật khẩu phức tạp. Token được lưu trữ an toàn trong HttpOnly Cookie.
<!-- anchor: id=05-architecture/auth-security  src=src/features/architecture/auth.ts::authStrategy  rev=  status=planned -->

## 4. Chiến lược Truy xuất Dữ liệu (Data Fetching & Realtime)
*   **Reload/Fetch cơ bản**: Không sử dụng WebSocket hay Server-Sent Events (SSE) để giảm độ phức tạp (W5). Hệ thống sử dụng cơ chế Server Actions của Next.js để mutate dữ liệu và revalidate cache khi người dùng đăng công thức mới hoặc đánh dấu nguyên liệu đã mua.
<!-- anchor: id=05-architecture/data-fetching  src=src/features/architecture/fetching.ts::fetchingStrategy  rev=  status=planned -->
