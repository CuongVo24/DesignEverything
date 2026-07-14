# V3 Post-implementation Review — integrity trước khi mở rộng

> Ngày review: 2026-07-13. Nguồn: review B7–B10 sau khi implementation báo hoàn tất. File này là TaskBrief cho lane `break_task/v3-expansion`.

## Kết luận

B7–B10 đã tạo được khung execution gồm execution plan, state, evidence, `/build` và adapter Claude Code. Typecheck, lint, build và 98 test hiện xanh. Tuy nhiên, các test hiện chưa chứng minh hành trình bắt đầu từ folder trống có enforcement đáng tin: một plan có thể xanh nhưng không chạy được, và một evidence có thể được khai báo thay vì được thu từ runtime.

Không được quảng bá claim “newbie tự vibe-code chỉn chu” hoặc coi V3 là release-quality cho đến khi toàn bộ B11 hoàn tất.

## Findings đã khoá

| ID | Mức | Finding | Hậu quả cần chặn |
|---|---:|---|---|
| F11-01 | P0 | `ExecutionPlanV3` bị convert sang legacy plan trước khi validate; validator thiếu 09 và Must→flow→task native. | Pass giả trên runtime plan thật. |
| F11-02 | P0 | `record-evidence` nhận exit code/observed tự khai, không chạy lệnh hay kiểm artifact. | Agent có thể tự báo pass và mở task sau. |
| F11-03 | P0 | State lỗi/thiếu không fail-closed; Bash có thể đi vòng Write/Edit gate. | Agent code ngoài scope hoặc bỏ qua validation. |
| F11-04 | P0 | Emitter mặc định Node/npm/path nguồn nhưng folder trống chưa có manifest/script và không được scope tạo chúng. | Newbie kẹt ngay M0/M1. |
| F11-05 | P1 | `repairing` còn có thể start task khác; docs sau validation không invalidates state. | Resume/repair mất tính tuần tự. |
| F11-06 | P1 | B10 thiếu raw findings/audit trail; README lane và claim release bị drift. | Không thể audit pilot hoặc tin trạng thái release. |

## Thứ tự remediation

`B11a → (B11b, B11d) → B11c → B11e → B11f`.

- B11a khoá plan runtime và semantic validation trước mọi execution.
- B11b, B11d độc lập: evidence phải có nguồn runtime, plan emitted không được tự bịa môi trường.
- B11c khoá state fail-closed sau khi evidence/state schema đã rõ.
- B11e chỉ tích hợp adapter sau core; B11f là gate claim/release cuối.

## Ranh giới

- Đây là bug-fix/hardening của V3, không thêm dashboard, swarm, deploy hay provider mới.
- V4 chỉ bắt đầu sau B11f: cross-runtime gate, Codex adapter, stack-aware bootstrap và newbie cockpit thuộc lane kế tiếp.
