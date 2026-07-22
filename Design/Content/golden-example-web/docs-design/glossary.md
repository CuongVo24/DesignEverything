# Thuật Ngữ Thiết Kế (Design Glossary)

## Tại sao cần file này
Tài liệu này định nghĩa chính xác các thực thể dữ liệu chính và thuật ngữ nghiệp vụ được sử dụng trong dự án. Việc chuẩn hóa thuật ngữ giúp đội ngũ phát triển và các tác nhân AI giao tiếp nhất quán, tránh hiểu nhầm hoặc đặt tên thực thể sai lệch trong cơ sở dữ liệu và mã nguồn.

---

## Danh Sách Thuật Ngữ

### User
Thành phần đại diện cho người dùng đã đăng ký tài khoản trong hệ thống để quản lý công thức nấu ăn cá nhân.
<!-- anchor: id=design-glossary/term/user  src=src/features/glossary/glossary.ts::term_user  rev=  status=planned -->
> Nguồn: doc:docs/03-data-model.md#03-data-model/core-entities

### Recipe
Thực thể đại diện cho một công thức nấu ăn, bao gồm tiêu đề, thành phần nguyên liệu, và các bước thực hiện chi tiết.
<!-- anchor: id=design-glossary/term/recipe  src=src/features/glossary/glossary.ts::term_recipe  rev=  status=planned -->
> Nguồn: doc:docs/03-data-model.md#03-data-model/core-entities

### ShoppingList
Danh sách mua sắm nguyên liệu được tạo ra dựa trên các thành phần có trong công thức nấu ăn.
<!-- anchor: id=design-glossary/term/shopping-list  src=src/features/glossary/glossary.ts::term_shopping_list  rev=  status=planned -->
> Nguồn: answers:DS1@shopping-list
