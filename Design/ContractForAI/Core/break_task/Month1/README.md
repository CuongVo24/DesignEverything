# break_task — Month 1 (review tuần 1–4)

> Vòng break_task theo [CONTRACT_STRUCTURE_RULE §7](../../../CONTRACT_STRUCTURE_RULE.md). Nguồn: manager review output Month 1 sau khi 4 tuần báo `DONE` (xem [backlog-month1](../../../../RoadMap/Month1/backlog-month1.md)).

## Bối cảnh
Month 1 đã đóng mốc "Bản chạy được": 47 test xanh, typecheck + lint sạch, e2e web chứng minh vertical slice. Review phát hiện **3 điểm chưa sạch** không chặn mốc nhưng phải vá trước khi Month 2 chồng nhánh mobile + bậc B lên cùng engine, nếu không sẽ thành nợ ngầm.

## 3 finding → 2 contract
| # | Finding | Tầng | Contract |
|---|---|---|---|
| 1 | `phase` không bao giờ đạt `ready-to-build` theo luồng tự nhiên: [commitStep](../../../../../src/core/advanceState.ts) suy ra phase ngay lúc phỏng vấn xong (trước khi docs tồn tại) và không bao giờ tính lại. | Lõi | [m1_fix_state_reconcile_after_emit](m1_fix_state_reconcile_after_emit_contract.md) |
| 2 | `gates_passed` chỉ được cập nhật như **side-effect của PreToolUse** (khi có ai đó thử dùng tool), không có bước đánh giá gate tường minh sau EMIT. | Lõi | (gộp vào #1 — chung gốc rễ + chung cách vá) |
| 3 | Heuristic Bash trong [preToolUse](../../../../../src/adapters/claude/preToolUse.ts) có lỗ: chỉ lấy token đầu nên `cat x && npm install` lọt qua; redirect-check chỉ bắt `>`/`>>`; `git` được cho rộng (kể cả `git apply`/`checkout` ghi source). | Adapter | [m1_polish_bash_whitelist_hardening](m1_polish_bash_whitelist_hardening_contract.md) |

> **Vì sao #1+#2 gộp:** cả hai cùng được vá bằng một hàm thuần `reconcileState(progress, policy, existingDocs)` chạy sau EMIT — đánh giá lại gate (append `gates_passed`) **và** tính lại `phase`. Tách thành hai contract sẽ khiến hai contract cùng sửa một hàm mới, vi phạm "một contract = một đơn vị triển khai" của structure rule.

## Thứ tự thực thi đề xuất
1. `m1_fix_state_reconcile_after_emit` (Lõi — chặn đúng đắn state cho Month 2).
2. `m1_polish_bash_whitelist_hardening` (Adapter — siết an toàn gate, độc lập).
