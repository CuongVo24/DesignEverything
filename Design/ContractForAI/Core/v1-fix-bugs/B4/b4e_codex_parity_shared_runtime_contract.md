# B4e — Claude/Codex shared runtime parity contract

## 1. Micro-task target

Loại hai bản CLI copy tay và bảo đảm Claude adapter với Codex plugin dùng cùng Core bundle, asset catalog, protocol và version evidence.

## 2. Scope

### In scope

- Shared CLI/runtime artifact và thin launchers.
- Asset/manifest parity.
- Cross-adapter replay/parity tests.

### Out of scope

- Biến Codex rules-only thành hard hook nếu harness không hỗ trợ.
- Host-specific UI text.

## 3. Implementation checklist

- [x] Chọn một shared CLI source/bundle; adapter/claude-code/cli.mjs và adapter/codex-plugin/cli.mjs chỉ resolve host context rồi delegate.
- [x] Không copy business logic giữa hai launcher.
- [x] Cả hai package dùng cùng runtime_version, schema/catalog digest, deepen asset và CliResult schema.
- [x] Host capability khác nhau được khai trong adapter capability, không fork Core semantics.
- [x] Build/release fail nếu launcher nhúng digest/version khác shared manifest.
- [x] Replay cùng fixture operation cho hai adapter phải có cùng state transition/reason_code; chỉ presentation/level enforcement được phép khác theo matrix.
- [x] Codex package cũng self-contained và không trỏ absolute vào repo dev.
- [x] ConformanceMatrix ghi đúng hard/soft guarantee đã test, không gọi parity khi chỉ copy file.

## 4. Interfaces / Files expected to change

- [NEW] adapter/shared/runtime/ hoặc package entrypoint tương đương.
- [MODIFY] adapter/claude-code/cli.mjs.
- [MODIFY] adapter/codex-plugin/cli.mjs.
- [MODIFY] adapter/codex-plugin/install/plugin packaging files.
- [MODIFY] scripts/run-cross-runtime-replay.mjs.
- [MODIFY] Design/Adapters/ConformanceMatrix.md.
- [NEW] test/integration/adapter-parity.test.ts.

Interface đích:

- createHostContext(host, root, manifest) → shared runtime context
- runSharedCli(context, argv) → CliResult

## 5. Risks & mitigations

- Host paths/layout khác: thin resolver riêng, shared operation không biết host path.
- Soft adapter không enforce như Claude: parity so Core decision và self-reported capability, không claim hard gate.
- Bundle duplicate vật lý vẫn cần: generated từ cùng hash/source và test byte/protocol parity.

## 6. Verification plan

- Static check hai launcher không chứa operation switch/business rules.
- Cross-runtime replay cho status, commit rejection, emit, validate fail, deepen precondition và corruption.
- Assert same reason_code/state digest cho same Core input.
- Package inspection cho asset/version/deepen parity và không absolute repo path.
- ConformanceMatrix claims được map tới test id.

## 7. Status

Spec: APPROVED | Implementation: IMPLEMENTED | Proof: SEAM_PARTIAL

**Cập nhật 2026-08-06 (A1-P9):** đóng Implementation. Ghi chú 2026-07-25 dưới đây (giữ nguyên,
không xoá lịch sử) coi R17 là lý do PARTIAL — nhưng khảo sát lại code cho A1-P9 xác nhận R17 đã
FIXED từ trước: `adapter/codex-plugin/hooks/post-tool-use.mjs` gọi `filterUnexpectedFiles` từ Core
bundle (`src/adapters/codex/filterUnexpectedFiles.ts:1,21`), hàm này dùng `matchesPathPattern`
của Core, không còn `matchGlob` tự chế — `finding-coverage-matrix.md:79` đã ghi FIXED, chỉ contract
này chưa được cập nhật theo. Cả 8/8 mục checklist §3 đã tick và có evidence: mục #5 ("build/release
fail nếu launcher nhúng digest/version khác shared manifest") trước đây chỉ là suy luận kiến trúc
(không có literal version nào để drift) — nay có test tĩnh khoá bất biến đó tại
`test/integration/adapter-parity.test.ts` ("B4e #5 — launchers carry no hardcoded runtime version
literal"). ConformanceMatrix.md đã cập nhật ghi nhận R17 đóng. Proof giữ `SEAM_PARTIAL` — nâng lên
`VERIFIED` thuộc Gate A2/P11, không phải phần việc của A1-P9.

**Ghi chú gốc (2026-07-25, xem `plan-v1-fix.md` §1.2/§3.1), giữ để lưu vết:** "Không phải DONE.
`cliOperations.ts` duy nhất đã hợp nhất logic — giữ lại — nhưng Codex hook vẫn có
`matchGlob`/allowed-paths tự suy riêng (R17), nên policy semantics vẫn fork khỏi Core. Đóng ở P9
sau khi Codex hook dùng chung Core policy."
