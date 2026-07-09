# Contract — B4c Nội dung critic (2 điểm fire) + generalize cảnh báo "bẫy" theo shape

> **Tầng:** Nội dung. Nguồn: [V2-ExpansionPlan B4](../../../../RoadMap/V2-ExpansionPlan.md) + spec critic ở [Contract.md](../../../../Core/Contract.md) §3 + [claude-code.md](../../../../Adapters/claude-code.md) (mục CRITIC) + cảnh báo M2/M5 hiện có trong [script.yaml](../../../../Content/interview-script/script.yaml). Phụ thuộc: [B4a](b4a_script_s7_meta_kind_contract.md) `DONE`.

## 1. Micro-task target
Viết **nội dung** critic (câu thách thức) để skill chạy pass phản biện ở 2 điểm fire, và **tổng quát hoá** cảnh báo kiểu M2/M5 thành pattern "bẫy" theo từng shape. Đây là nội dung lõi (data), KHÔNG phải code adapter (B6a wiring).

## 2. Scope
**In scope:**
- Bổ sung **top-level `critics:` map** trong `script.yaml` (đã chốt, DecisionLog D24): key = `id` câu mà critic chạy **sau** (điểm fire: S3 + câu kiến trúc cuối mỗi shape); mỗi entry `{ challenge, ack_prompt }`. Schema `critics` đã khoá ở [B5a](../B5/b5a_shapes_registry_schema_loader_contract.md), B4c chỉ điền nội dung đúng shape.
- **Điểm fire 1 (sau S3):** câu thách thức scope creep — "Must có đang gánh thứ để-sau không? Cắt được gì để MVP nhỏ hơn?" + yêu cầu xác nhận.
- **Điểm fire 2 (sau câu kiến trúc mỗi shape):** bẫy phức tạp ẩn theo shape:
  - web: realtime/SSR chi phí ẩn; mobile: đã có M2 sync/M5 store — gom vào pattern; cli: phụ thuộc OS, đóng gói/ký nhị phân, breaking-change CLI API; hybrid: đồng bộ hai kênh phát hành.
- Mỗi critic chốt bằng câu bắt xác nhận ('Tôi đồng ý'/điều chỉnh), giọng devil's advocate, không dọa.

**Out of scope**
- KHÔNG code skill chạy critic (B6a).
- KHÔNG thêm hook/gate cho critic (critic là lớp skill, không chặn cứng — D14/D24).
- KHÔNG đổi placeholder doc.

## 3. Checklist
- [x] `critics:` top-level map, key = id câu (điểm fire), mỗi entry `{challenge, ack_prompt}`, optional — validate qua B5a.
- [x] Có nội dung critic cho fire-1 (scope) + fire-2 mỗi shape (web/mobile/hybrid/cli).
- [x] Cảnh báo M2/M5 cũ được gom vào pattern shape mà không mất nội dung/số phí $99/$25.
- [x] Mọi critic kết bằng câu bắt xác nhận; không chặn cứng.

## 4. Interfaces / Files expected to change
- `[MODIFY]` `Design/Content/interview-script/script.yaml` (nội dung critic)
- `[MODIFY]` `Design/Content/interview-script/S0-S6-core.md` + nhánh (`M-mobile.md`, `C-cli.md`…) — bản người-đọc phản ánh critic
- Không tự đổi zod — schema `critics` đã khoá ở [B5a](../B5/b5a_shapes_registry_schema_loader_contract.md); B4c chỉ điền nội dung đúng shape.

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Critic thành gatekeeper/dọa người mới | Cao | Giọng devil's advocate + luôn "người dùng quyết"; review tông giọng. |
| critics map lệch schema B5a | TB | B5a đã khoá zod `critics`; B4c chỉ điền đúng shape `{challenge, ack_prompt}`, key = id thật. |
| Mất nội dung cảnh báo M2/M5 khi gom pattern | TB | Checklist giữ nguyên số phí + nội dung sync/store. |

## 6. Verification plan
- `npx vitest run loadScript contentIntegrity` — script.yaml vẫn validate với critic content.
- Review thủ công: đọc 4 critic (mỗi shape) + fire-1, giọng đúng, có câu bắt xác nhận.
- `npm test` xanh (chưa cần B6a để pass content-level).

## 7. Status
`DONE`
