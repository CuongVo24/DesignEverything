# Quality Rubric — Thước đo doc tốt

> Người mới **không phân biệt được doc tốt/tệ** → không có "người dùng tự sửa" để cứu. Toàn bộ giá trị dồn vào chất lượng phương pháp. File này là chuẩn để viết VÀ để test nội dung.

## Tại sao cần file này
Nếu không định nghĩa "thế nào là một doc tốt" trước khi sản xuất, mỗi file ra một chất lượng → sản phẩm bạc nhược. Rubric vừa là kim chỉ nam viết, vừa là tiêu chí trong [TestStrategy.md](../Conventions/TestStrategy.md).

## A. Tiêu chí áp dụng cho MỌI file đầu ra
- [ ] **Có "Tại sao cần file này"** — 1–2 câu, ngôn ngữ người mới (insight HCMUS: vừa có sản phẩm vừa học nghề).
- [ ] **Đã dịch ngược** — nội dung là ngôn ngữ chuẩn, KHÔNG bê nguyên văn đời thường của người dùng.
- [ ] **Có mỏ neo truy vết** — theo [../Core/AnchorFormat.md](../Core/AnchorFormat.md) (`status=planned` ở phase này).
- [ ] **Ngắn vừa đủ** — đủ dựng nền móng, không làm người mới bỏ cuộc. Thừa chữ = tệ.
- [ ] **Tự đứng được** — người lạ đọc một mình vẫn hiểu, không cần hỏi lại.
- [ ] **Không mâu thuẫn file khác** — vd persona trong `01` khớp flow trong `04`.

## B. Tiêu chí riêng từng file

| File | Dấu hiệu TỐT | Dấu hiệu TỆ (reject) |
|---|---|---|
| `00-vision.md` | 1 câu elevator pitch rõ + nỗi đau cụ thể | Pitch chung chung "nền tảng kết nối mọi người" |
| `01-personas.md` | 1–2 người **cụ thể** + việc họ muốn làm xong | Liệt kê "mọi đối tượng", không ai cụ thể |
| `02-scope.md` | MoSCoW rõ; Must là bộ MVP **nhỏ nhất chạy được** | Mọi thứ đều "Must"; không có Won't |
| `03-data-model.md` | Entity suy được từ scope, có quan hệ | Bịa entity không tính năng nào dùng |
| `04-flows.md` | 1 luồng điển hình mở→xong, bám tính năng Must #1 | Flow cho tính năng chưa có trong scope |
| `05-architecture.md` | Quyết định khớp câu trả lời nhánh W/M + nêu lý do | Chọn tech "vì hot", không nối với nhu cầu |
| `06-constraints.md` | Solo/deadline/ngân sách thật, ảnh hưởng scope | Bỏ trống hoặc chép mặc định không kiểm |
| `09-execution-plan.md` | Môi trường thử nghiệm cụ thể, rủi ro phân loại rõ, có task spike đi trước task implementation | Kế hoạch chạy đa nền tảng mặc định, không có spike cho rủi ro chưa xác thực |

## C. Riêng S3 (câu khó nhất)
- [ ] Agent **chủ động phân loại** Must/Should/Could, không bắt người mới tự ưu tiên.
- [ ] Must phải là **tập nhỏ nhất** để sản phẩm có nghĩa (cắt được là cắt).
- [ ] Mỗi mục có lý do vì sao ở tầng đó.

## D. Riêng nhánh Mobile (2 bẫy phải bới ra sớm)
- [ ] **M2 offline/sync** — nếu người dùng nói "có", cảnh báo đội chi phí gấp đôi *trước khi* chốt.
- [ ] **M5 lên store** — nêu rõ review/ký app/phân phối, không để người mới tưởng "code xong là có app".

## V3 Execution Expansion — target 4.0.0

Một output được coi là plan-validated không chỉ vì mỗi file có đủ heading/anchor. Nó còn phải:

- [x] README phản ánh đúng shape, file thực tế và không có command/file scaffold ảo.
- [x] Mỗi Must nối được sang flow, task/milestone, acceptance và evidence expected.
- [x] Won't không xuất hiện trong task MVP.
- [x] Assumption/risk được ghi confirmed, assumption hoặc spike-required; chưa xác nhận không trình bày như fact.
- [x] Task đầu tiên có first environment, precondition, allowed paths, expected result và failure policy.

Các check deterministic và release evidence nằm ở B7a/B10a; rubric không tự cấp pass thay validator.

## E. Tiêu chí cho tài liệu thiết kế tầng 2 (docs/design/)
- [ ] **100% Cố định Nguồn gốc (Source Integrity)** — Mọi khối nội dung trong tài liệu tầng 2 bắt buộc phải cite đúng ngữ pháp SourceRef của [taxonomy-tier2.md](taxonomy-tier2.md).
- [ ] **Chống Tự Bịa Nguồn (Anti-fabrication)** — Mọi khẳng định không truy được nguồn (answers hoặc doc tầng 1) phải mang cờ `> ⚠ unknown — cần hỏi người`. Cấm tự ý bịa đặt nguồn hoặc viết văn mẫu chung chung thay cho nguồn thiếu.
- [ ] **Nhất quán Thực thể (Glossary)** — Thuật ngữ trong `glossary.md` phải khớp hoàn toàn với các thực thể trong `03-data-model.md` và câu hỏi DS1.
- [ ] **Đặc tả Tính năng (Feature Spec)** — Đảm bảo đúng 1 file cho mỗi Must-have feature. Nội dung mô tả phải khớp `02-scope.md` và các bước của flow phải khớp `04-flows.md` tương ứng.
- [ ] **Quyết định Thiết kế (ADR)** — Số thứ tự ADR dạng `ADR-{NNN}` phải tăng dần liên tục và tương thích hoàn toàn với danh sách quyết định trong `05-architecture.md`.
- [ ] **Chiến lược Kiểm thử (Test Strategy)** — Các tầng test (Unit, Integration, E2E) phải khớp với conventions của dự án, và kịch bản E2E phải khớp với luồng điển hình trong `04-flows.md`.

## F. Derived content — nguồn gốc và coverage
Mọi nội dung dẫn xuất (build-plan, architecture rationale, README glossary, mermaid, execution-plan risk classification) phải sinh theo [derived-recipes.yaml](interview-script/derived-recipes.yaml):
- [ ] Mỗi phần tử output có `source_refs` trỏ về ít nhất một `question_id`/`doc_id` hợp lệ theo `inputs` của recipe.
- [ ] Xoá một nguồn (answer revision hoặc doc) phải làm phần tử phụ thuộc fail hoặc chuyển `unknown`, không được tự bịa để lấp chỗ trống.
- [ ] Assertion không truy được nguồn ghi rõ `> ⚠ unknown — cần hỏi người` theo `fallback.on_missing_source`, không viết như fact đã xác nhận.
- [ ] Mermaid trong `04-flows.md` phải parse được và mỗi node/edge map lại đúng bước ở S5 (`node_source_map`).
- [ ] Risk/assumption trong `09-execution-plan.md` chỉ nhận ba nhãn `confirmed | assumption | spike-required`; không có nhãn tự do.

## G. Deterministic reject vs. human acknowledgement
Rubric tách rõ hai lớp để executor/LLM không tự ý xác nhận thay người dùng:
- **Deterministic reject** (outcome `invalid`) — cấu trúc tối thiểu sai: rỗng/placeholder, thiếu `Must`, thiếu `required_fields`, sai `enum_values`/`pattern`, thiếu `source_refs`. Không cần LLM phán đoán, [validateAnswer](../../src/core/validateAnswer.ts) chặn trước khi commit.
- **Human acknowledgement** (outcome `needs_user_ack`) — nghi vấn chủ quan có thể đúng nhưng cần người xác nhận: persona "ai cũng dùng" (S2), mọi mục đều Must (S3), chọn offline/sync (M2), chọn lên store thật (M5), chọn realtime (W5), chọn phân phối binary đa nền tảng (C5). Danh sách `warning_rules` cụ thể nằm ở [script.yaml](interview-script/script.yaml); rule tiếng Việt/Anh có thể lệch nên đây luôn là cảnh báo, không phải semantic judge duy nhất — executor không được tự bấm "đồng ý" thay người dùng.
- Một mục ở lớp B ghi "reject" trong bảng vẫn có thể chỉ là warning ở runtime nếu rule tương ứng khai `needs_user_ack`; nguồn sự thật là `answer_contract`/`derived-recipes.yaml`, bảng B chỉ mô tả ý định.

## Cách dùng làm test
Mỗi lần golden example hoặc output thật sinh ra → chấm theo A+B (+C/D/E/F/G nếu áp dụng). Một mục fail = nội dung chưa đạt, sửa kịch bản/template chứ không sửa tay output.

