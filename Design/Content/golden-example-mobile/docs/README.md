## Tại sao cần file này
File này là cửa vào của cả bộ tài liệu mẫu. Nó giúp một người mới mở thư mục `docs/` là biết nên đọc gì trước và vì sao từng file tồn tại, thay vì nhìn cả cây file rồi đoán.

## Đọc Theo Thứ Tự Này
1. `00-vision.md` — hiểu app là gì và giải quyết nỗi đau nào.
2. `01-personas.md` — hiểu ai dùng app đầu tiên.
3. `02-scope.md` — chốt phần Must của MVP.
4. `03-data-model.md` — xem app cần nhớ dữ liệu gì.
5. `04-flows.md` — xem một lần dùng điển hình từ đầu tới cuối.
6. `05-architecture.md` — hiểu các quyết định kỹ thuật gắn với nhu cầu.
7. `06-constraints.md` — hiểu giới hạn về thời gian, người, tiền.
8. `07-release.md` — hiểu cách bản mobile nên được phát hành thử trước.
<!-- anchor: id=docs-readme/reading-order  src=apps/mobile/src/features/docs/readme.ts::readingOrder  rev=  status=planned -->

## Tóm Tắt Nhanh Dự Án
Đây là một app mobile cho nhóm bạn ở trọ để ghi khoản chi chung, chia tiền minh bạch và biết ai còn nợ bao nhiêu mà không phải cộng tay trong chat.
<!-- anchor: id=docs-readme/project-summary  src=apps/mobile/src/features/docs/readme.ts::projectSummary  rev=  status=planned -->

## Bản Đồ File
- `00-vision.md`: định nghĩa dự án và nỗi đau.
- `01-personas.md`: chốt người dùng thật đầu tiên.
- `02-scope.md`: khóa MVP.
- `03-data-model.md`: khóa entity và quan hệ.
- `04-flows.md`: mô tả luồng chính.
- `05-architecture.md`: khóa hướng kỹ thuật mobile.
- `06-constraints.md`: giới hạn thực tế.
- `07-release.md`: đường ra bản thử và store.
<!-- anchor: id=docs-readme/file-map  src=apps/mobile/src/features/docs/readme.ts::fileMap  rev=  status=planned -->

## Ghi Chú Về Nhánh Đã Chọn
Bộ mẫu này đi theo nhánh mobile sau S6, nên file cuối là `07-release.md` thay vì `07-deployment.md`. File `07-deployment.md` vẫn tồn tại ở taxonomy và doc-template để phục vụ các dự án rẽ sang nhánh web.
<!-- anchor: id=docs-readme/branch-note  src=apps/mobile/src/features/docs/readme.ts::branchSpecificDocNote  rev=  status=planned -->

## Ghi Chú Khi Bắt Đầu Build
Bản mẫu này cố ý giữ MVP nhỏ: online-first, chưa offline-first đầy đủ, chưa đẩy push thành Must, và phát hành thử trước khi nghĩ tới store công khai.
<!-- anchor: id=docs-readme/build-notes  src=apps/mobile/src/features/docs/readme.ts::buildNotes  rev=  status=planned -->
