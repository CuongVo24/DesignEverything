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
- [ ] Inject ra đúng `ask`/`default`/`translate_back`/`target_doc` của `current_step` + 4 quy tắc vàng.
- [ ] Chỉ commit sau xác nhận, qua `commitStep`; ở `S6` truyền `branchChoice`.
- [ ] Không hỏi 2 câu/lượt; không bịa câu ngoài script.
- [ ] Smoke: chạy được một vài bước S0→S2 trên Claude Code.

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
`WAITING_FOR_APPROVAL`
