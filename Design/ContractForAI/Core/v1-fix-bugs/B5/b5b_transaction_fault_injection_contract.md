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

Spec: APPROVED | Implementation: PARTIAL | Proof: INVALID_FOR_PRODUCTION_SEAM

**Không phải DONE** (sửa 2026-07-25, xem `plan-v1-fix.md` §1.2/§3.1). Fault-injection harness
(`faulty-filesystem.ts`, `crash-worker.mjs`, FE-01..06, FI-01..05) là hạ tầng thật và nên giữ, nhưng
nó gọi thẳng `prepareEmit`/`activateEmit`/`transactInterviewStore` — các hàm Core mà production CLI
(`handleEmit`, `handleCommit`) hiện không gọi (X16 vẫn OPEN ở seam CLI thật). Test đang chứng minh
engine đúng, không chứng minh production path an toàn. Đóng lại ở P11 sau khi P7/P2 nối engine vào
CLI và fault harness chuyển sang gọi qua public CLI/application service.
