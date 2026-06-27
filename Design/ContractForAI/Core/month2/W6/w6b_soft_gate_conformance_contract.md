# Contract — W6B Smoke-test harness mềm + cập nhật ConformanceMatrix

> **Tầng:** Adapter (kiểm chứng + tài liệu). Nguồn: [Week-06](../../../../RoadMap/Month2/Week-06.md) §smoke-test + [agents-md.md](../../../../Adapters/agents-md.md) §"Tiêu chí nghiệm thu" + [ConformanceMatrix](../../../../Adapters/ConformanceMatrix.md). Phụ thuộc: [W6A](w6a_agents_md_generator_contract.md).

## 1. Micro-task target
Chạy smoke-test `AGENTS.md` sinh ra trên **Codex + ≥1 harness rules-only** (Cursor/Cline), ghi lại kết quả, và cập nhật `ConformanceMatrix.md` chỉ đánh dấu ✅ những gì **đã test thật** — không đánh dấu suông.

## 2. Scope
**In scope**:
- `[NEW]` `Design/Adapters/smoke-tests/agents-md-smoke.md`: bộ 3 prompt chuẩn theo Week-06 — (a) xin code quá sớm, (b) xin bỏ qua docs, (c) xin tiếp tục hoàn thiện docs — kèm kết quả quan sát thật trên từng harness (agent có bị kéo về hỏi/doc không).
- So sánh output docs từ harness mềm vs Claude Code trên cùng một fixture nhỏ (golden web rút gọn); ghi điểm lệch.
- `[MODIFY]` `Design/Adapters/ConformanceMatrix.md`: cập nhật trạng thái INJECT/GATE/EMIT cho Codex + harness đã test; ghi rõ enforcement = mềm (best-effort), không deterministic.

**Out of scope**
- KHÔNG sửa generator (W6A) — nếu output sai → DỪNG, báo manager (có thể break_task W6A).
- KHÔNG thêm adapter native mới. KHÔNG đánh ✅ cho harness chưa chạy thật.

## 3. Checklist
- [ ] 3 prompt smoke-test có kết quả thật ghi lại trên Codex.
- [ ] ≥1 harness rules-only khác (Cursor/Cline) được test thật.
- [ ] Quan sát: agent được kéo về hỏi/doc thay vì code ngay (ít nhất ở các ca đại diện) — ghi cả ca lọt nếu có.
- [ ] So sánh output docs mềm vs Claude Code, ghi điểm lệch.
- [ ] ConformanceMatrix chỉ ✅ cái đã test; nói thật giới hạn enforcement.

## 4. Interfaces / Files expected to change
- `[NEW]` `Design/Adapters/smoke-tests/agents-md-smoke.md`
- `[MODIFY]` `Design/Adapters/ConformanceMatrix.md`
- Không đổi code.

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Đánh ✅ suông cho harness chưa chạy | Cao | Quy tắc: chỉ ✅ khi có log/kết quả thật đính kèm. |
| Bán quá lời "bị chặn" như bậc A | Cao | Ghi rõ "chỉ dẫn mạnh, không deterministic" ở mọi dòng mềm. |
| Drift wording vs lõi qua nhiều harness | TB | Tất cả lấy từ generator W6A một nguồn; chỉ đổi lớp vỏ. |

## 6. Verification plan
- Chạy 3 prompt smoke trên ≥2 harness, lưu kết quả vào `agents-md-smoke.md`.
- Review thủ công ConformanceMatrix: mọi ✅ truy được về một kết quả test.
- (Không có test code tự động — đây là kiểm chứng harness thật.)

## 7. Status
`WAITING_FOR_APPROVAL`
