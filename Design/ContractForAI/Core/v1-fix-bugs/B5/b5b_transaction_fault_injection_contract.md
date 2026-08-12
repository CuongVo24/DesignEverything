# B5b — State and emit transaction fault-injection contract

## 1. Micro-task target

Chứng minh commit và emit là all-or-nothing qua process crash, disk/rename error, lock contention và recovery lặp lại.

## 2. Scope

### In scope

- Fault points của B1b và B3d.
- Crash/restart recovery, concurrency và disk collision.
- Assertions state/docs/manifests.

### Out of scope

- Business content quality.
- Installer settings merge trừ transaction install đã có test riêng B5a.

## 3. Implementation checklist

- [x] Thêm injectable filesystem/clock/lock boundary không xuất hiện trong production public API.
- [x] Enumerate fault point cho interview: load, validate, lock, temp write, flush, rename, cleanup.
- [x] Enumerate fault point cho emit: staging render, validation, backup, each promotion, manifest activation, execution-state, stale cleanup.
- [x] Có hard process-kill tests tại các điểm quan trọng, không chỉ throw mock.
- [x] Sau mỗi failure spawn process mới và chạy recovery hai lần để chứng minh idempotent.
- [x] Assert capability consumption, revision, answers và slots cùng old/new transaction.
- [x] Assert active generation/gate chỉ thấy old hoặc new complete set.
- [x] Assert user-owned collision/file giữ nguyên bytes.
- [x] Parallel writers/emitters cho một winner; loser nhận conflict không phá winner.
- [x] Disk-full/permission/rename failure trả non-zero + recovery reason.

## 4. Interfaces / Files expected to change

- [NEW] test/fault-injection/interview-transaction.test.ts.
- [NEW] test/fault-injection/emit-transaction.test.ts.
- [NEW] test/helpers/faulty-filesystem.ts.
- [NEW] test/helpers/crash-worker.mjs.
- [MODIFY] package test scripts/CI matrix.

Expected commands:

- npx vitest run test/fault-injection
- npm test

## 5. Risks & mitigations

- Mock không phản ánh Windows: có subprocess + real temp filesystem lane.
- Suite chậm: exhaustive throw tests nhanh, process-kill matrix chỉ critical boundaries.
- Cleanup destructive: verify resolved temp root before recursive removal.

## 6. Verification plan

- Mỗi fault point có oracle old-or-new, không chỉ “không crash”.
- Restart/recovery lần hai no-op và health green hoặc explicit unrecoverable với backup còn nguyên.
- No mixed progress/answers/slots; no mixed docs/plan/execution-state.
- Manifest/journal/temp orphan được cleanup an toàn sau success.
- Test report map tối thiểu X08, X16, X22, R11, R18 và R19; mỗi dòng phân biệt Core proof, application-service proof và production CLI/install seam proof.

## 7. Status

Spec: APPROVED | Implementation: IMPLEMENTED | Proof: SEAM_PARTIAL

**Nâng 2026-08-10, chưa VERIFIED.** §7 bản 2026-07-25 phía trên đã sai ở tiền đề chính: đọc trực tiếp
`src/adapters/shared/cliOps/emit.ts` xác nhận production `handleEmit` **gọi thẳng**
`prepareEmit`/`activateEmit` (dòng import + gọi thật, không phải suy diễn), và `transactInterviewStore`
cũng được gọi trong cùng file cho phần cập nhật interview store sau emit. X16 không còn "OPEN ở seam
CLI thật" theo nghĩa văn bản cũ mô tả — hàm production và hàm bị crash-test là MỘT, không phải hai
đường tách biệt.

**Bằng chứng thật (chạy lại 2026-08-10):** `npx vitest run test/fault-injection` → 3 file, 15 test
pass. `crash-worker.mjs` (`test/helpers/crash-worker.mjs`) được spawn như **tiến trình con thật** qua
`execSync` (không phải throw mock trong cùng process), tự patch `fs.writeFileSync`/`renameSync` rồi
`process.exit(137)` đúng bước journal/lock/rename được yêu cầu, và import các hàm Core biên dịch
(`dist/`) — đúng những hàm production gọi. Sau crash, test load lại state bằng process test (không
phải cùng process với crash) và assert old-or-new, chạy recovery hai lần cho idempotent.

**Gap thật còn lại, hẹp hơn nhiều so với văn bản cũ:** `crash-worker.mjs` import thẳng
`prepareEmit`/`transactInterviewStore` từ `dist/`, **không** đi qua toàn bộ tầng CLI (arg parsing,
dispatch, exit-code mapping của `cliOps/emit.ts`/`commit.ts`) trước khi gọi các hàm đó — nghĩa là lớp
mỏng ngoài cùng (CLI wrapper) chưa bị crash cùng lúc với transaction. Vì Core/application-service đã
được crash thật và các hàm đó xác nhận trùng với production, đây là gap ở lớp ngoài, không phải ở lớp
transaction — đủ để nâng lên `SEAM_PARTIAL` (không còn off-axis `INVALID_FOR_PRODUCTION_SEAM`), chưa
đủ để nói `VERIFIED`. Đóng nốt: đổi `crash-worker.mjs` gọi qua `execFileSync('node', [cliPath, 'emit', ...])`
đã cài thay vì import `dist/` trực tiếp — việc còn lại, không phải việc mới.

**Xác nhận flakiness đã biết, không phải regression mới:** một lần chạy thử trong phiên này ghi nhận
exit code 134 thay vì 137 cho ca `commit --crash-at=temp-write`; chạy lại ngay sau đó xanh trọn 15/15.
Khớp đúng `QA-02-F01` đã ghi trong `test/qa-campaign/findings/QA-02-core-agent.md` — lỗi transient dưới
concurrency cao, không tái hiện khi chạy đơn lẻ.
