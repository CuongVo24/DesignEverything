## Tại sao cần file này
Tài liệu này đặc tả cấu trúc dữ liệu mà ứng dụng cần lưu trữ để vận hành các tính năng. Định nghĩa rõ các thực thể (entities) và mối quan hệ giúp AI và lập trình viên thiết kế database chuẩn xác ngay từ đầu, tránh việc sửa schema database giữa chừng làm lỗi hệ thống.

## Các thực thể chính (Entities)

### 1. User (Người dùng)
*   `id`: String (Khóa chính)
*   `email`: String (Duy nhất)
*   `name`: String
*   `image`: String (URL ảnh đại diện từ Google OAuth)
<!-- anchor: id=03-data-model/user-entity  src=src/features/data-model/entities.ts::UserSchema  rev=  status=planned -->

### 2. Recipe (Công thức nấu ăn)
*   `id`: String (Khóa chính)
*   `title`: String (Tên món ăn)
*   `imageUrl`: String (Ảnh món ăn)
*   `authorId`: String (Khóa ngoại, trỏ tới `User.id`)
*   `ingredients`: Array<Ingredient> (Danh sách nguyên liệu)
*   `steps`: Array<String> (Các bước nấu)
*   `createdAt`: DateTime
<!-- anchor: id=03-data-model/recipe-entity  src=src/features/data-model/entities.ts::RecipeSchema  rev=  status=planned -->

### 3. Ingredient (Nguyên liệu chi tiết)
*   `name`: String (Tên nguyên liệu, ví dụ "Thịt ba chỉ")
*   `amount`: Number (Số lượng)
*   `unit`: String (Đơn vị tính, ví dụ "gram", "muỗng")
<!-- anchor: id=03-data-model/ingredient-type  src=src/features/data-model/entities.ts::IngredientSchema  rev=  status=planned -->

### 4. ShoppingList (Danh sách đi chợ)
*   `id`: String (Khóa chính)
*   `userId`: String (Khóa ngoại, trỏ tới `User.id`)
*   `items`: Array<ShoppingItem> (Danh sách nguyên liệu cần mua gom từ các công thức)
*   `updatedAt`: DateTime
<!-- anchor: id=03-data-model/shopping-list-entity  src=src/features/data-model/entities.ts::ShoppingListSchema  rev=  status=planned -->

### 5. ShoppingItem (Nguyên liệu trong danh sách đi chợ)
*   `name`: String
*   `amount`: Number
*   `unit`: String
*   `recipeId`: String (Trỏ tới `Recipe.id` để biết nguyên liệu này thuộc món nào)
*   `isBought`: Boolean (Trạng thái đã nhặt đồ vào giỏ siêu thị)
<!-- anchor: id=03-data-model/shopping-item-type  src=src/features/data-model/entities.ts::ShoppingItemSchema  rev=  status=planned -->

## Mối quan hệ giữa các thực thể (Relationships)
*   Một `User` có thể tạo ra nhiều `Recipe` (Quan hệ 1 - Nhiều).
*   Một `User` sở hữu duy nhất một `ShoppingList` hoạt động tại một thời điểm (Quan hệ 1 - 1).
*   Một `ShoppingList` gom nhiều `ShoppingItem` từ nhiều `Recipe` khác nhau (Quan hệ Nhiều - Nhiều ẩn qua `recipeId`).
<!-- anchor: id=03-data-model/relationships  src=src/features/data-model/entities.ts::dataRelationships  rev=  status=planned -->
