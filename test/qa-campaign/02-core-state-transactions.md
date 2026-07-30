# QA-02 — Core, state và transaction

## Mục tiêu

Đánh vào các invariant có thể gây mất dữ liệu hoặc mở gate sai: state transition, capability một lần, optimistic revision, lock, staged emit, activation và recovery.

## Check bắt buộc

```powershell
rtk npx vitest run src/core
rtk npx vitest run test/fault-injection
rtk npx vitest run test/e2e/execution-flow.test.ts test/e2e/deepen-flow.test.ts
```

## Invariant phải kiểm

- State không nhảy bước khi answer chưa được xác nhận.
- Một capability token chỉ dùng được đúng một lần, đúng phase và đúng operation.
- Hai writer cạnh tranh chỉ có một winner; loser không làm hỏng canonical state.
- ENOSPC/EACCES/process kill không để state “đã commit” khi dữ liệu chưa durable.
- Emit validation lỗi không ghi một phần docs và không đổi active generation.
- Recovery idempotent: chạy hai lần cho cùng một kết quả an toàn.
- Tier-1 và từng module tier-2 không rollback/ghi đè generation lành của nhau.
- Validated snapshot bị vô hiệu đúng lúc khi input/plan-affecting module đổi.
- `blocked` không tự mở chỉ vì chạy validate lại.

## Novel probes bắt buộc

Thiết kế ít nhất năm probe chưa được đặt tên y hệt trong suite:

1. Boundary ở revision `0`, revision rất lớn và revision stale sau recovery.
2. Hai recovery chạy gần đồng thời trên cùng journal.
3. File user trùng tên với managed artifact nhưng khác hoa/thường hoặc separator.
4. Journal/manifest JSON hợp lệ cú pháp nhưng thiếu field hoặc có field thừa độc hại.
5. Timestamp/digest thay đổi nhưng nội dung logic tương đương.
6. Symlink/junction trỏ managed path ra ngoài workspace nếu môi trường cho phép an toàn.

Probe phải chạy trong temp directory. Không tạo fault trực tiếp trong repo.

## Oracle

Fail-closed, không partial write, không mất byte user-authored, không mở gate sai, recovery lặp được và thông báo có next step an toàn.

## Báo cáo

Ghi vào `findings/QA-02-<ten-phien>.md` theo `report-template.md`.
