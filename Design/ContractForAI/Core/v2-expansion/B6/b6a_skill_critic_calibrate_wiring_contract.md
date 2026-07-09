# Contract — B6a Skill: critic-pass + calibrate-mode + inject S7

> **Tầng:** Adapter. Nguồn: [V2-ExpansionPlan B6](../../../../RoadMap/V2-ExpansionPlan.md) + [claude-code.md](../../../../Adapters/claude-code.md) (mục CRITIC & CALIBRATE) + [render-inject.ts](../../../../../src/adapters/claude/skill/render-inject.ts) + critic content (B4c). Phụ thuộc: [B5b](../B5/b5b_emit_shape_map_meta_contract.md) + [B4c](../B4/b4c_critic_content_generalized_traps_contract.md) `DONE`.

## 1. Micro-task target
Cho lớp **skill** thực thi hành vi ngữ nghĩa v2: (a) inject câu `S7` chọn hình-hài + set `branch=<shape-id>` khi commit S7; (b) inject câu `meta` calibrate đầu phiên + giữ chế độ (kỹ/nhanh, độ gắt critic); (c) chạy **critic-pass** ở 2 điểm fire (sau S3, sau câu kiến trúc shape) — đọc critic content, cảnh báo, **bắt xác nhận** trước khi commit bước kế. Tất cả ở lớp skill; hook KHÔNG đổi (giữ D14/D24).

## 2. Scope
**In scope:**
- `render-inject.ts` (+ liên quan): inject `kind` (anchored/meta) đúng; với meta → không kỳ vọng target_doc, không emit.
- Logic skill commit: set `branch` khi commit `S7` (thay S6); validate ∈ registry.
- Critic-pass: sau khi user xác nhận translate_back của S3 và của câu kiến trúc cuối shape → skill tra `critics[<id>]` (map top-level, key = id vừa commit) lấy `challenge`+`ack_prompt`, phát ra + chờ user 'Tôi đồng ý'/điều chỉnh; chỉ commit bước kế sau xác nhận. Không chặn qua hook.
- Calibrate: skill set `progress.calibrate_mode = deep|fast` khi commit `CAL0` (field đã khoá ở state-schema/[B5a](../B5/b5a_shapes_registry_schema_loader_contract.md)); critic đọc field này chỉnh độ gắt.

**Out of scope**
- KHÔNG đổi hook (`userPromptSubmit`/`preToolUse`/`sessionStart`) — chúng đã đúng mô hình hai lớp; chỉ đảm bảo rate-limit vẫn tính CAL0/S7 như một bước.
- KHÔNG viết nội dung critic (B4c) — chỉ đọc & phát.
- KHÔNG đụng emit (B5b).

## 3. Checklist
- [x] Skill inject S7, set branch khi commit S7, validate registry.
- [x] CAL0 inject đúng (không đòi target_doc); skill set `calibrate_mode`; vẫn là 1 bước answered.
- [x] Critic-pass fire đúng 2 điểm, phát content B4c, bắt xác nhận, không chặn cứng.
- [x] Hook không đổi; rate-limit vẫn đúng với CAL0/S7.
- [x] Test skill: S7 set branch; critic-pass yêu cầu xác nhận; meta không emit.

## 4. Interfaces / Files expected to change
- `[MODIFY]` `src/adapters/claude/skill/render-inject.ts` (+ test)
- `[MODIFY]` `src/adapters/claude/userPromptSubmit.ts` chỉ nếu cần inject S7/meta context (giữ nguyên logic rate-limit)
- `[MODIFY]` test skill tương ứng

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Critic-pass lỡ chặn cứng qua hook | Cao | Critic chỉ ở skill; test khẳng định hook không thêm gate cho critic. |
| Meta câu làm rate-limit lệch | TB | CAL0 là 1 bước answered bình thường; test nhịp gồm CAL0. |
| branch set nhầm chỗ (S6 cũ) | Cao | Chỉ set branch khi commit S7; test S6 commit KHÔNG set branch. |

## 6. Verification plan
- `npx vitest run` (skill, userPromptSubmit, render-inject) — xanh, gồm ca S7/critic/meta.
- `npm run typecheck && npm run lint` — sạch.
- `npm test` — toàn bộ xanh.

## 7. Status
`DONE`
