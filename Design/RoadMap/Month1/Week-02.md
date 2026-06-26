# Tuần 2/16 — Engine lõi + zod schemas + gate-policy.yaml + unit test

> Tháng 1 · Mốc: Bản chạy được · Phụ thuộc: Tuần 1 (repo scaffold + golden web)

## Tại sao cần file này
Tuần này biến tài liệu đã khóa thành lõi chạy được. Nếu adapter đi thẳng vào hook mà không có engine dùng chung đứng giữa, cả lời hứa "portable" lẫn kỷ luật "lõi béo, adapter gầy" sẽ vỡ ngay từ bản đầu tiên.

## Mục tiêu tuần (Definition of Done)
Cuối tuần phải có lõi dùng chung đọc được `script.yaml`, khởi tạo và tiến `progress.json` đúng luật, đánh giá gate từ artifact thật, và có unit test xanh trên fixture web lẫn mobile. Đây là tuần để biến contract/schema từ markdown thành logic kiểm được bằng máy.

## Việc chi tiết
- [ ] Viết zod schema mirror đúng 3 schema đã khoá (interview-script, state, gate-policy).
- [ ] `core/loadScript.ts` đọc + validate `script.yaml`.
- [ ] `core/advanceState.ts` theo quy tắc chuyển bước trong [../../Core/Schemas/state-schema.md](../../Core/Schemas/state-schema.md).
- [ ] `core/evaluateGate.ts` đối chiếu `requires_docs` ↔ artifact.
- [ ] Emit `gate-policy.yaml` máy-đọc-được song song `script.yaml`.
- [ ] Unit test bằng golden web + golden mobile làm fixture.
- [ ] `core/loadProgress.ts` đọc/ghi state với validate ở ranh giới I/O.
- [ ] Bổ sung test cho ca branch `web` và `mobile`, ca duplicate `last_user_turn_id`, và ca thiếu doc mở gate thất bại.

## Đầu vào / Phụ thuộc
Ba schema lõi đã khóa, `script.yaml`, golden mobile hiện có tại `Design/Content/golden-example-mobile/`, golden web từ tuần 1, cùng taxonomy và gate-policy để đối chiếu tên file đích. Tuần này chưa phụ thuộc vào cơ chế hook của Claude Code; nó chỉ cần dữ liệu đầu vào đủ sạch. Mọi bài test của tuần này phải bám 3 tầng trong [../../Conventions/TestStrategy.md](../../Conventions/TestStrategy.md), đặc biệt là tầng schema/content và tầng gate ca biên.

## Đầu ra / Artifact
- Các module lõi tối thiểu: `loadScript`, `loadProgress`, `advanceState`, `evaluateGate`, và loader gate policy máy-đọc-được.
- Một bản `gate-policy.yaml` hoặc dữ liệu tương đương để adapter không phải parse markdown runtime.
- Bộ unit test xanh cho lõi, có fixture web/mobile và ca biên state/gate.

## Rủi ro & cạm bẫy
Hai chỗ dễ lệch nhất là: `zod` không mirror đúng schema markdown, và engine lỡ nhúng logic nội dung phỏng vấn thay vì chỉ đọc `script.yaml`. Tuần này tuyệt đối không để logic Must/Should/Could hay taxonomy-specific wording lọt vào code lõi.

## Nghiệm thu
- [ ] `script.yaml` hợp lệ thì engine load được; sai schema thì fail rõ chỗ.
- [ ] `advanceState` xử lý đúng `S0 -> ... -> S6 -> W1/M1` và không double-advance cùng một lượt người thật.
- [ ] `evaluateGate` mở đúng `scope-locked` khi đủ `00-vision.md`, `01-personas.md`, `02-scope.md`.
- [ ] Unit test chạy xanh trên cả fixture web và mobile.
