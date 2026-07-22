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

- [ ] Thêm injectable filesystem/clock/lock boundary không xuất hiện trong production public API.
- [ ] Enumerate fault point cho interview: load, validate, lock, temp write, flush, rename, cleanup.
- [ ] Enumerate fault point cho emit: staging render, validation, backup, each promotion, manifest activation, execution-state, stale cleanup.
- [ ] Có hard process-kill tests tại các điểm quan trọng, không chỉ throw mock.
- [ ] Sau mỗi failure spawn process mới và chạy recovery hai lần để chứng minh idempotent.
- [ ] Assert capability consumption, revision, answers và slots cùng old/new transaction.
- [ ] Assert active generation/gate chỉ thấy old hoặc new complete set.
- [ ] Assert user-owned collision/file giữ nguyên bytes.
- [ ] Parallel writers/emitters cho một winner; loser nhận conflict không phá winner.
- [ ] Disk-full/permission/rename failure trả non-zero + recovery reason.

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
- Test report map X08, X16, X22 và installer partial case.

## 7. Status

WAITING_FOR_APPROVAL
