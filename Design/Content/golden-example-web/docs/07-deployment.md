## Tại sao cần file này
Tài liệu này đặc tả quy trình và các cấu hình cần thiết để đóng gói và đưa ứng dụng lên môi trường production. Nó giúp đảm bảo quá trình CI/CD diễn ra trơn tru, bảo mật các biến môi trường nhạy cảm và là hướng dẫn vận hành duy nhất khi bàn giao sản phẩm.

## 1. Hosting và CI/CD Pipeline
*   **Vercel Platform**: Ứng dụng Next.js được kết nối trực tiếp với GitHub Repository của dự án.
*   **Automatic Deployment**: Mỗi khi có commit mới được push lên nhánh `main`, Vercel sẽ tự động trigger pipeline để build và deploy bản mới nhất.
<!-- anchor: id=07-deployment/pipeline  src=src/features/deployment/deploy.ts::deployPipeline  rev=  status=planned -->

## 2. Quản lý Cơ sở dữ liệu Production
*   **Neon / Supabase Serverless PostgreSQL**: Cơ sở dữ liệu SQL được duy trì trên đám mây ở gói free-tier.
*   **Migration**: Sử dụng Prisma ORM để quản lý database schema. Lệnh `prisma db push` sẽ được chạy tự động trong build step của Vercel để đồng bộ schema database mới nhất.
<!-- anchor: id=07-deployment/database  src=src/features/deployment/deploy.ts::databaseConfig  rev=  status=planned -->

## 3. Cấu hình Biến môi trường (Environment Variables)
Các khóa bí mật và URL kết nối bắt buộc phải được khai báo trên Vercel Dashboard, không được lưu trực tiếp vào mã nguồn:
*   `DATABASE_URL`: Đường dẫn kết nối bảo mật tới serverless PostgreSQL.
*   `NEXTAUTH_SECRET`: Khóa mã hóa JWT session của NextAuth.js.
*   `NEXTAUTH_URL`: URL chạy ứng dụng (ví dụ: `https://recipeshareshare.vercel.app`).
*   `GOOGLE_CLIENT_ID`: ID ứng dụng đăng nhập Google.
*   `GOOGLE_CLIENT_SECRET`: Khóa bí mật đăng nhập Google.
<!-- anchor: id=07-deployment/env-vars  src=src/features/deployment/deploy.ts::environmentVariables  rev=  status=planned -->
