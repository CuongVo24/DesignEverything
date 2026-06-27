## Tại sao cần file này
Tài liệu này đặc tả quy trình và các cấu hình cần thiết để đóng gói và đưa ứng dụng lên môi trường production. Nó giúp đảm bảo quá trình CI/CD diễn ra trơn tru, bảo mật các biến môi trường nhạy cảm và là hướng dẫn vận hành duy nhất khi bàn giao sản phẩm.

## Mục Tiêu Triển Khai (Goal)
*   **Vercel Platform**: Ứng dụng Next.js được kết nối trực tiếp với GitHub Repository của dự án.
*   **Automatic Deployment**: Mỗi khi có commit mới được push lên nhánh `main`, Vercel sẽ tự động trigger pipeline để build và deploy bản mới nhất.
<!-- anchor: id=07-deployment/deployment-goal  src=src/features/deployment/deploy.ts::deployPipeline  rev=  status=planned -->

## Chiến Lược Hosting & Hạ Tầng
*   **Neon / Supabase Serverless PostgreSQL**: Cơ sở dữ liệu SQL được duy trì trên đám mây ở gói free-tier.
*   **Migration**: Sử dụng Prisma ORM để quản lý database schema. Lệnh `prisma db push` sẽ được chạy tự động trong build step của Vercel để đồng bộ schema database mới nhất.
<!-- anchor: id=07-deployment/hosting-strategy  src=src/features/deployment/deploy.ts::hostingStrategy  rev=  status=planned -->

## Quản Lý Tên Miền & Truy Cập
*   **Subdomain mặc định**: Sử dụng subdomain miễn phí do Vercel cấp (ví dụ: `https://recipeshareshare.vercel.app`). Chưa cần cấu hình tên miền riêng cho giai đoạn MVP.
<!-- anchor: id=07-deployment/domain-access  src=src/features/deployment/deploy.ts::domainAndAccessStrategy  rev=  status=planned -->

## Hướng Dẫn Vận Hành (Ops)
Các khóa bí mật và URL kết nối bắt buộc phải được khai báo trên Vercel Dashboard, không được lưu trực tiếp vào mã nguồn:
*   `DATABASE_URL`: Đường dẫn kết nối bảo mật tới serverless PostgreSQL.
*   `NEXTAUTH_SECRET`: Khóa mã hóa JWT session của NextAuth.js.
*   `NEXTAUTH_URL`: URL chạy ứng dụng (ví dụ: `https://recipeshareshare.vercel.app`).
*   `GOOGLE_CLIENT_ID`: ID ứng dụng đăng nhập Google.
*   `GOOGLE_CLIENT_SECRET`: Khóa bí mật đăng nhập Google.
<!-- anchor: id=07-deployment/ops-notes  src=src/features/deployment/deploy.ts::initialOpsNotes  rev=  status=planned -->
