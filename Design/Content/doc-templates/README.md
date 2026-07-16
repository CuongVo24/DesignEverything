# Template — `docs/README.md`

## Tại sao cần file này
File này là cửa vào của cả bộ tài liệu. Nó giúp người mới biết nên đọc theo thứ tự nào và mỗi file trong bộ docs dùng để trả lời câu hỏi gì, thay vì mở ra một thư mục rồi không biết bắt đầu từ đâu.

## Mười Phút Đầu Tiên
Lần đầu vào dự án (người hoặc AI agent), đi đúng bảng này:

| Phút | Việc | Kết quả mong đợi |
|---|---|---|
| 0–1 | Đọc hết README này | Biết bộ docs có gì, đọc theo thứ tự nào |
| 1–3 | Đọc `00-vision.md` + `01-personas.md` | Nói được nỗi đau gốc và người dùng thật đầu tiên |
| 3–4 | Đọc `02-scope.md` | Phân biệt được Must với Won't của MVP |
| 4–6 | Đọc `05-architecture.md` + `docs/conventions/` (nếu có) | Biết stack đã chốt và các khóa không được vượt |
| 6–8 | Đọc `08-build-plan.md` | Biết milestone kế tiếp và Done-when của nó |
| 8–10 | Đọc `09-execution-plan.md` | Biết task đang mở, allowed paths, lệnh kiểm chứng |

Sau 10 phút phải tự trả lời được 4 câu — chưa trả lời được câu nào thì đọc lại file tương ứng, KHÔNG bắt đầu code:
1. Sản phẩm giải quyết nỗi đau gì, cho ai?
2. Must gồm những gì, và cái gì cố ý KHÔNG làm trong MVP?
3. Stack đã chốt là gì, có những khóa conventions nào?
4. Milestone kế tiếp là gì, Done-when của nó kiểm chứng bằng hành vi thật nào?

## Đọc Theo Thứ Tự Này
1. `00-vision.md` — hiểu dự án là gì và nỗi đau gốc ở đâu.
2. `01-personas.md` — hiểu ai là người dùng thật đầu tiên.
3. `02-scope.md` — chốt phần bắt buộc của MVP.
4. `03-data-model.md` — hiểu sản phẩm cần nhớ những gì.
5. `04-flows.md` — xem một lần dùng điển hình từ đầu đến cuối.
6. `05-architecture.md` — xem các quyết định kỹ thuật bám theo nhu cầu.
7. `06-constraints.md` — xem giới hạn về người, thời gian, tiền.
8. {{docs_readme_release_step}}
9. `08-build-plan.md` — xem kế hoạch xây dựng theo milestone (đọc trước khi code).
10. `09-execution-plan.md` — xem kế hoạch thực thi chi tiết và quản lý rủi ro kỹ thuật.
<!-- anchor: id=docs-readme/reading-order  src={{planned_src_docs_readme_order}}::{{planned_symbol_docs_readme_order}}  rev=  status=planned -->

## Tóm Tắt Nhanh Dự Án
{{docs_readme_project_summary}}
<!-- anchor: id=docs-readme/project-summary  src={{planned_src_docs_readme_summary}}::{{planned_symbol_docs_readme_summary}}  rev=  status=planned -->

## Thuật Ngữ Dự Án
{{docs_readme_glossary}}
<!-- anchor: id=docs-readme/glossary  src={{planned_src_docs_readme_glossary}}::{{planned_symbol_docs_readme_glossary}}  rev=  status=planned -->

## Bản Đồ File
{{docs_readme_file_map}}
<!-- anchor: id=docs-readme/file-map  src={{planned_src_docs_readme_file_map}}::{{planned_symbol_docs_readme_file_map}}  rev=  status=planned -->

## Ghi Chú Về Nhánh Đã Chọn
{{docs_readme_branch_note}}
<!-- anchor: id=docs-readme/branch-note  src={{planned_src_docs_readme_branch_note}}::{{planned_symbol_docs_readme_branch_note}}  rev=  status=planned -->

## Ghi Chú Khi Bắt Đầu Build
{{docs_readme_build_notes}}
<!-- anchor: id=docs-readme/build-notes  src={{planned_src_docs_readme_build_notes}}::{{planned_symbol_docs_readme_build_notes}}  rev=  status=planned -->
