# Contract — W3D Skill INJECT + commit ngữ nghĩa

> **Tầng:** Adapter (Claude Code) + ranh giới lớp skill. Nguồn: [Week-03](../../../../RoadMap/Month1/Week-03.md) + [claude-code.md](../../../../Adapters/claude-code.md) §INJECT + §"Việc của skill" + [state-schema.md](../../../../Core/Schemas/state-schema.md) §3–§4.

## 1. Micro-task target
Skill/slash command (vd `/design`) đóng vai **lớp ngữ nghĩa**: hỏi đúng câu hiện tại theo 4 quy tắc vàng, dịch ngược, và sau khi user xác nhận thì **commit một bước** (gọi `commitStep`, set `branch` ở S6). Đây là actor duy nhất diễn giải ý nghĩa.

## 2. Scope
**In scope** — `src/adapters/claude/skill/` (+ định nghĩa skill/slash command):
- Đọc `current_step` từ state + câu tương ứng trong `script.yaml`; render INJECT: mục tiêu phiên, 4 quy tắc vàng, `ask`, `default`, `translate_back`, `target_doc`, nhắc "mỗi lượt một câu".
- Hướng dẫn vận hành lớp skill: sau khi user xác nhận bản dịch ngược, gọi `commitStep(progress, script, { userTurnId, branchChoice? })` (W2C) — truyền `branchChoice` web/mobile khi ở `S6` (suy từ câu trả lời đã chốt), rồi `saveProgress`.
- Không bịa câu ngoài `script.yaml`; không nhồi logic web/mobile ngoài script.

**Out of scope**
- Rate-limit/gate (hook W3B/W3C). Đổi nội dung câu hỏi (đó là lõi `Content/`).

## 3. Checklist
- [x] Inject ra đúng `ask`/`default`/`translate_back`/`target_doc` của `current_step` + 4 quy tắc vàng.
- [x] Chỉ commit sau xác nhận, qua `commitStep`; ở `S6` truyền `branchChoice`.
- [x] Không hỏi 2 câu/lượt; không bịa câu ngoài script.
- [x] Smoke: chạy được một vài bước S0→S2 trên Claude Code.

## 4. Interfaces / Files expected to change
- `[NEW]` `src/adapters/claude/skill/render-inject.ts` (build text inject từ state + script)
- `[NEW]` định nghĩa skill/slash command `/design` (theo cơ chế Claude Code)
- `[NEW]` test cho `render-inject`

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Skill nhồi cứng transcript vào system prompt | TB | Chỉ render từ `current_step`; không nhúng cả script. |
| Quên truyền `branchChoice` ở S6 | Cao | `commitStep` throw nếu thiếu (W2C) → bắt sớm. |
| Hỏi nhiều câu/lượt | TB | Inject nhắc "một câu"; hook W3B rào nhịp ở lớp cứng. |

## 6. Verification plan
- `render-inject` với `current_step='S3'` → text chứa `ask`/`translate_back` của S3 + 4 quy tắc vàng.
- Smoke trên Claude Code: hỏi S0 → trả lời → xác nhận → state sang S1.

## 7. Status
`DONE`

### Quyết định thực tế & Nghiệm thu
- Đã tách logic sinh context phỏng vấn thành module thuần **[render-inject.ts](file:///e:/DesignEverything/src/adapters/claude/skill/render-inject.ts)**:
  - Sinh chuỗi context `injectedContext` chuẩn chỉnh cho câu hỏi `current_step` hiện tại gồm các trường `ask`, `default`, `translate_back`, `target_doc`.
  - Kết hợp 4 quy tắc vàng của phỏng vấn và hướng dẫn vận hành của lớp skill (yêu cầu xác nhận dịch ngược và commit một bước).
  - Trả về chuỗi rỗng khi `current_step === null` và ném lỗi nếu `current_step` không tồn tại trong `script.yaml`.
- Đã liên kết và tinh gọn hook `onUserPromptSubmit` để gọi trực tiếp helper `renderInject` này.
- Đã khai báo định nghĩa chi tiết skill/slash command `/design` cho adapter Claude Code tại tệp quy tắc cấu hình dự án **[.clauderules](file:///e:/DesignEverything/.clauderules)** và tệp cấu hình workspace chung **[.agents/AGENTS.md](file:///e:/DesignEverything/.agents/AGENTS.md)**. Điều này đảm bảo host điều khiển diễn giải đúng lớp ngữ nghĩa của kịch bản phỏng vấn.
- Viết bộ unit test chuyên dụng tại **[render-inject.test.ts](file:///e:/DesignEverything/src/adapters/claude/skill/render-inject.test.ts)** để kiểm thử thành công render câu hỏi, xử lý khi kết thúc phỏng vấn và ném lỗi khi ID câu hỏi không có trong kịch bản.
- Toàn bộ vitest, typecheck, lint, build chạy thành công xanh sạch.
