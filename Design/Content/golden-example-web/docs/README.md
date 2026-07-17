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
8. `07-deployment.md` — xem đường phát hành phù hợp với web.
9. `08-build-plan.md` — xem kế hoạch xây dựng theo milestone (đọc trước khi code).
10. `09-execution-plan.md` — xem kế hoạch thực thi chi tiết và quản lý rủi ro kỹ thuật.
11. `decisions.md` — tra nhanh mọi quyết định đã chốt và nó đến từ câu hỏi nào (đọc khi thắc mắc "vì sao lại chọn cái này?").

Hai file dưới đây do engine tự sinh trong lúc build, không có lúc mới emit — đừng sửa tay:
- `progress-log.md` — nhật ký đã làm được gì, chạy lệnh gì để chứng minh, vấp ở đâu.
- `break-tasks/` — các việc phải sửa mà review phát hiện sau mỗi feature.
<!-- anchor: id=docs-readme/reading-order  src=src/features/docs/readme.ts::readingOrder  rev=  status=planned -->

## Tóm Tắt Nhanh Dự Án
RecipeShare web app giúp chia sẻ công thức nấu ăn
<!-- anchor: id=docs-readme/project-summary  src=src/features/docs/readme.ts::projectSummary  rev=  status=planned -->

## Thuật Ngữ Dự Án
| Thuật ngữ | Nghĩa |
|---|---|
| Must / Should / Could / Won't | Bốn tầng phạm vi MVP (xem 02-scope.md). Won't là cố ý KHÔNG làm, không phải quên. |
| M0 — khung xương biết đi | Milestone đầu tiên: lát cắt mỏng nhất của flow chính chạy end-to-end với dữ liệu cứng. |
| Done-when | Điều kiện nghiệm thu của milestone, kiểm bằng hành vi thật (chạy gì, thấy gì) — không phải "code xong". |
| allowed_paths | Danh sách file được phép sửa trong một task; sửa ngoài phạm vi sẽ bị gate chặn. |
| verify / evidence | Lệnh kiểm chứng do engine tự chạy và bằng chứng nó ghi lại; task chỉ done khi verify pass. |

(Thuật ngữ nghiệp vụ riêng của dự án: xem thực thể trong 03-data-model.md.)
<!-- anchor: id=docs-readme/glossary  src=src/features/docs/readme.ts::projectGlossary  rev=  status=planned -->

## Bản Đồ File
docs/
├── 00-vision.md          # Tầm nhìn & Nỗi đau cốt lõi
├── 01-personas.md        # Đối tượng người dùng mục tiêu
├── 02-scope.md           # Phạm vi tính năng MVP (MoSCoW)
├── 03-data-model.md      # Thiết kế thực thế dữ liệu (Database Schema)
├── 04-flows.md           # Luồng trải nghiệm người dùng điển hình
├── 05-architecture.md    # Quyết định kiến trúc & Tech stack
├── 06-constraints.md     # Ràng buộc về thời gian, ngân sách, nhân lực
├── 07-deployment.md      # Quy trình CI/CD và cấu hình Hosting (Vercel)
├── 08-build-plan.md      # Kế hoạch build theo milestone (đọc trước khi code)
├── 09-execution-plan.md  # Kế hoạch thực thi chi tiết & quản lý rủi ro kỹ thuật
├── decisions.md          # Sổ quyết định: chốt gì, từ câu hỏi nào, chi tiết ở đâu
├── progress-log.md       # (engine sinh lúc build) Nhật ký đã làm gì, vấp ở đâu
├── break-tasks/          # (engine sinh lúc review) Việc phải sửa sau mỗi feature
├── conventions/          # Khóa stack, allowed paths, dependencies
├── .design-everything/execution-plan.json # File cấu hình thực thi máy-đọc
└── README.md             # Mục lục tài liệu (File này)
<!-- anchor: id=docs-readme/file-map  src=src/features/docs/readme.ts::fileMap  rev=  status=planned -->

## Ghi Chú Về Nhánh Đã Chọn
Dự án phát triển trên nền tảng Web. Cấu hình triển khai Next.js/Vercel chi tiết ở 07-deployment.md.
<!-- anchor: id=docs-readme/branch-note  src=src/features/docs/readme.ts::branchSpecificDocNote  rev=  status=planned -->

## Ghi Chú Khi Bắt Đầu Build
Chạy local: `npm run dev`. Chạy tests: `npm test`.
<!-- anchor: id=docs-readme/build-notes  src=src/features/docs/readme.ts::buildNotes  rev=  status=planned -->
