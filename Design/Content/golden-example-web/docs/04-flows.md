## Tại sao cần file này
Tài liệu này mô tả chi tiết hành trình trải nghiệm của người dùng qua các màn hình và trạng thái của ứng dụng. Việc vẽ ra luồng công việc cụ thể giúp đội ngũ lập trình hình dung được các component giao diện cần thiết và các sự kiện (actions/mutations) cần xử lý trong code.

## Luồng điển hình: Chọn món ăn và đi chợ siêu thị

### Bước 1: Tìm kiếm món ăn mong muốn
*   **Hành động**: Huy mở trang web RecipeShare trên trình duyệt điện thoại. Tại trang chủ, Huy gõ từ khóa "Thịt kho tàu" vào thanh tìm kiếm.
*   **Kết quả**: Hệ thống lọc và hiển thị công thức món "Thịt kho tàu" do bạn My đăng tải.
<!-- anchor: id=04-flows/search-recipe  src=src/features/flows/shoppingFlow.ts::stepSearchRecipe  rev=  status=planned -->

### Bước 2: Xem chi tiết và chọn món
*   **Hành động**: Huy bấm vào bài viết để xem chi tiết công thức. Màn hình hiển thị ảnh món ăn, danh sách nguyên liệu và các bước làm. Huy thấy ưng ý nên bấm vào nút "Thêm vào giỏ đi chợ".
*   **Kết quả**: Hệ thống ghi nhận công thức được chọn, tự động tách danh sách nguyên liệu của món đó và đẩy vào `ShoppingList` của Huy.
<!-- anchor: id=04-flows/add-to-list  src=src/features/flows/shoppingFlow.ts::stepAddToList  rev=  status=planned -->

### Bước 3: Xem và gom danh sách đi chợ
*   **Hành động**: Huy chuyển sang tab "Danh sách đi chợ" trên web điện thoại.
*   **Kết quả**: Hệ thống tự động gộp các nguyên liệu trùng tên và hiển thị danh sách tổng hợp (ví dụ: "Thịt ba chỉ: 500g", "Trứng vịt: 10 quả",...).
<!-- anchor: id=04-flows/view-shopping-list  src=src/features/flows/shoppingFlow.ts::stepViewList  rev=  status=planned -->

### Bước 4: Mua sắm và đánh dấu đã mua tại thực địa
*   **Hành động**: Huy đẩy xe đi chợ trong siêu thị. Nhặt được hộp trứng vịt, Huy mở điện thoại và tích vào ô checkbox bên cạnh dòng "Trứng vịt".
*   **Kết quả**: Giao diện cập nhật gạch bỏ nguyên liệu "Trứng vịt" (thay đổi trạng thái `isBought` thành `true`). Hệ thống tự động lưu trạng thái này mà không cần tải lại trang.
<!-- anchor: id=04-flows/tick-items  src=src/features/flows/shoppingFlow.ts::stepTickItems  rev=  status=planned -->
