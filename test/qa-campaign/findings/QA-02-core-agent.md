# Báo cáo lane `QA-02` — `core-agent`

## Tóm tắt

- Kết luận: `BLOCKED`
- Commit/branch: `main...origin/main [ahead 25]`; commit SHA không ghi nhận được trước policy interrupt.
- Thời gian: 2026-07-30, Asia/Saigon.
- OS / Node / npm: Windows; Node `v24.11.1`; npm không ghi nhận.
- Phạm vi đã chạy: toàn bộ `src/core`; toàn bộ `test/fault-injection`; hai luồng E2E execution/deepen; rerun tuần tự toàn file emit transaction; rerun riêng FE-01 hai lần.
- Phần không chạy và lý do: các novel probe bắt buộc chưa chạy. Coordinator yêu cầu dừng mọi probe/lệnh sau khi phát hiện workspace dùng chung bị snapshot drift và có policy interrupt. Kết quả hiện có chỉ mang tính exploratory, không dùng làm release gate.
- Snapshot drift: `YES`. Tracked/untracked source và test thay đổi trong lúc lane đang chạy; lane QA-02 không sở hữu và không tạo/xóa/sửa các file drift đó.
- Finding: `S0: 0, S1: 0, S2: 0, S3: 0, S4: 1`

## Lệnh và kết quả

| Lệnh/probe | Exit code | Kết quả | Thời lượng | Bằng chứng |
|---|---:|---|---:|---|
| `rtk npx vitest run src/core` | 0 | PASS | 642.05s | 69 test files pass; 549/549 tests pass |
| `rtk npx vitest run test/fault-injection` | 1 | FAIL (flaky signal) | 333.04s | 12/13 pass; FE-01 lỗi `UNKNOWN` khi mở temp `emit-journal.json` trong `writeJournal` |
| `rtk npx vitest run test/e2e/execution-flow.test.ts test/e2e/deepen-flow.test.ts` | 0 | PASS | 324.99s | 2 test files pass; 13/13 tests pass |
| `rtk npx vitest run test/fault-injection/emit-transaction.test.ts --pool=forks --maxWorkers=1 --minWorkers=1` | 0 | PASS | 49.92s | 6/6 tests pass khi chạy tuần tự |
| `rtk npx vitest run test/fault-injection/emit-transaction.test.ts -t "FE-01" --pool=forks --maxWorkers=1 --minWorkers=1` (rerun 1) | 0 | PASS | 12.36s | FE-01 pass; 1 test pass, 5 skipped |
| `rtk npx vitest run test/fault-injection/emit-transaction.test.ts -t "FE-01" --pool=forks --maxWorkers=1 --minWorkers=1` (rerun 2) | 0 | PASS | 21.08s | FE-01 pass; 1 test pass, 5 skipped |
| Novel probes: revision boundary/recovery race/path collision/malformed journal/digest equivalence/symlink-junction | — | NOT RUN | — | Dừng theo policy interrupt của coordinator; không có fault injection nào được thực hiện ngoài temp |

## Finding `QA-02-F01` — `FE-01 phát tín hiệu lỗi mở journal dưới tải đồng thời nhưng không tái hiện khi cô lập`

- Severity: `S4 — Observation`
- Confidence: `medium`
- Tỷ lệ tái hiện: 1 fail / 3 lần quan sát trực tiếp FE-01; lần fail xảy ra khi ba suite lớn chạy đồng thời, hai rerun riêng đều pass. Toàn file emit transaction chạy tuần tự cũng pass 6/6.
- Thành phần: `src/core/emitTransactionActivate.ts`, hàm `writeJournal`; test `test/fault-injection/emit-transaction.test.ts`.
- Phạm vi ảnh hưởng: chưa chứng minh thành lỗi sản phẩm. Nếu tái hiện trong điều kiện tải thực, activation có thể dừng trước khi ghi journal; bằng chứng hiện tại phù hợp cả với transient Windows filesystem/antivirus contention.
- Preconditions: Windows; ba invocation Vitest lớn được khởi chạy đồng thời; workspace dùng chung chịu contention và snapshot drift.

### Bước tái hiện

1. Khởi chạy đồng thời ba check bắt buộc của QA-02.
2. Quan sát suite fault injection tại setup của FE-01.
3. Chạy lại toàn file emit transaction tuần tự.
4. Chạy lại riêng FE-01 tuần tự hai lần với một worker.

### Expected

FE-01 tạo được `.design-everything/emit-journal.json`, mô phỏng crash tại bước backing-up và recovery trả về trạng thái an toàn, ổn định ở mọi lần chạy.

### Actual

Lần chạy đồng thời ban đầu lỗi trước fault scenario với mã `UNKNOWN` khi `writeFileSync` mở journal trong thư mục `%TEMP%`. Toàn file chạy tuần tự pass 6/6 và hai lần rerun riêng FE-01 đều pass.

### Bằng chứng

```text
Initial:
FAIL FE-01
Error: UNKNOWN: unknown error, open
C:\Users\admin\AppData\Local\Temp\de-emit-fault-1785349396966\
.design-everything\emit-journal.json
at writeJournal src/core/emitTransactionActivate.ts:55:6

Sequential whole-file rerun:
Test Files 1 passed (1)
Tests 6 passed (6)

Focused reruns:
FE-01 PASS 2/2
```

### Phân tích

- Nguyên nhân khả dĩ: transient Windows filesystem hold hoặc resource contention khi nhiều Vitest worker/suite cùng chạy; chưa đủ bằng chứng quy cho transaction implementation.
- Vì sao chọn severity này: lỗi không tái hiện ở hai lần rerun riêng và toàn file tuần tự; chưa quan sát partial write, mất byte, mở gate sai hoặc recovery sai.
- Workaround: chạy fault-injection suite tuần tự với một worker khi cần tín hiệu ổn định trên máy Windows đang chịu tải.
- Test regression nên bổ sung: stress test lặp FE-01 dưới tải có ghi nhận mã lỗi, số lần retry và kiểm tra canonical/journal sau mỗi lần; cân nhắc retry có giới hạn cho lỗi Windows transient nếu stress test chứng minh nguyên nhân.
- Có thể trùng với: hiện tượng runner/filesystem contention của baseline đa phiên; chưa đủ dữ liệu để gắn với finding sản phẩm.

## Observation không đủ bằng chứng thành bug

| ID | Quan sát | Rủi ro | Cách kiểm tiếp |
|---|---|---|---|
| QA-02-O01 | FE-01 fail một lần dưới tải đồng thời, pass toàn bộ khi cô lập | Flaky CI hoặc transient failure trên Windows | Lặp stress 50–100 lần, log error code và trạng thái journal/canonical |
| QA-02-O02 | Snapshot repo drift trong lúc suite đang chạy | Kết quả có thể phản ánh nhiều source snapshot khác nhau | Chạy lại toàn lane trên clean immutable commit/worktree |
| QA-02-O03 | Novel probes bắt buộc chưa chạy | Các boundary về revision, recovery race, malformed journal, case/path và junction chưa được đánh giá | Giao lại QA-02 trên snapshot sạch, mỗi probe tuần tự trong OS temp |

## Coverage và residual risk

- Đã kiểm: regression core 549 test; fault-injection 13 test với rerun emit/FE-01; E2E execution/deepen 13 test; tính lặp lại của FE-01 trong điều kiện tuần tự.
- Chưa kiểm: tối thiểu năm novel probe theo mission, gồm revision `0`/rất lớn/stale sau recovery, hai recovery đồng thời, case/separator collision, journal/manifest thiếu hoặc thừa field độc hại, timestamp/digest tương đương logic và symlink/junction thoát workspace.
- Rủi ro còn lại: cao đối với phạm vi novel-probe chưa chạy. Không thể kết luận PASS cho invariant lock, recovery concurrency, path containment và malformed transaction metadata chỉ từ suite hiện có.
- Tính toàn vẹn workspace: lane này không sửa source/test hiện có; báo cáo này là file duy nhất được tạo bởi lane.
