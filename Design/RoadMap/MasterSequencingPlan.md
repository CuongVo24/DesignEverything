# Master Sequencing Plan — 7.0.0 → 8.0.0 → 8.1.0

> Nguồn sự thật xuyên phiên cho chuỗi gate mở lane `Interactive Question Cards`
> ([InteractiveQuestionCardsPlan.md](InteractiveQuestionCardsPlan.md)). Không thay thế
> `plan-v1-fix.md`, `ReleaseReadinessPlan.md`, `v6-expansion/README.md` hay `v7-expansion/README.md`
> — chỉ tổng hợp trạng thái và trỏ ngược. Mỗi mốc đóng phải kèm bằng chứng máy kiểm được (đường dẫn
> file, commit hash, hoặc lệnh test), không đóng bằng lời.
>
> Chuỗi: `7.0.0 (v1-fix-bugs, BLOCKED)` → `8.0.0 (v6-expansion, lane chưa mở)` → `8.1.0 (lane này)`.

## Bảng mốc

| Mốc | Việc | Trạng thái | Bằng chứng |
|---|---|---|---|
| **Phase 0** | Đóng working tree (48 file uncommitted, gồm code A1-P3 thật) | ✅ DONE 2026-08-03 | build/lint/typecheck/test xanh: 125 file, 888 test (thêm 1 regression-pin test cho fix bên dưới). Trong lúc đóng phát hiện và sửa 1 regression production thật (xem A1-P3) + 4 fixture drift (replay-script seed, semanticValidation seed, hook-adversarial thiếu catalog, tampered-runtime thiếu canonical store) — không phải "847 test xanh" như bản ghi cũ, số đó đã lỗi thời |
| **Gate A1** | Nâng 22 contract `v1-fix-bugs` PARTIAL → IMPLEMENTED (P2→P10 của `plan-v1-fix.md` §6) | ⏳ TODO | Cột Implementation `v1-fix-bugs/README.md` — hiện 6/24 (B1a, B1b, B1c, B1d, B2a, B3c) |
| ↳ A1-P2 | B1a/B1b — capability lifecycle + canonical store | ✅ Implementation đóng 2026-08-02 (Proof vẫn UNIT_ONLY, chờ A2) | R19 FIXED, R18 FIXED; B1a/B1b `README.md` = IMPLEMENTED |
| ↳ A1-P3 | B1c/B1d — handoff authority + typed blocked remediation | ✅ Implementation đóng 2026-08-03 (Proof vẫn UNIT_ONLY, chờ A2) | R05/X06 giữ FIXED; `npm exec vitest run …` = 887 tests, `npm run typecheck:all` xanh. Đóng kèm sửa 1 lỗ hổng fail-open thật: `evaluatePreAction.ts`'s `EXECUTION_STATE_REQUIRED` check giữ `ready-for-validation` trong exclusion list sau khi phase này kế thừa ngữ nghĩa của `ready-to-build` đã bị gỡ — workspace docs đã emit nhưng thiếu `execution-state.json` (hỏng/xoá nhầm) rơi qua fallback gate-policy và bị **allow** ghi code, thay vì deny |
| ↳ A1-P4 | B2a/B2b/B2c — path/ownership/command policy | ✅ Implementation đóng 2026-08-03 (Proof vẫn UNIT_ONLY, chờ A2) | R06 FIXED, R08 FIXED (thuộc B2b), X02 FIXED (pre-create vs. overwrite qua `getActiveManagedPaths`); R07 FIXED 2026-08-03 (operation binding, scratch write-gate size cap, TTL sweep, `slot_keys` allowlist) — "issuer production" bỏ khỏi điều kiện đóng, xác nhận defense-in-depth không có call site thật; xem `b2a_protected_artifact_policy_contract.md` §7 |
| ↳ A1-P5 | B2d/B2e — gate snapshot + runtime health | TODO | X15, R03 đóng |
| ↳ A1-P6 | B3a/B3b/B3c — answer/slots/provenance/catalog | TODO | U05, X12, U06, X23 đóng |
| ↳ A1-P7 | B3d/B3e — transactional tier-1/tier-2 activation | TODO | — |
| ↳ A1-P8 | B4a/B4b/B4c — hook/CLI production wiring | TODO | X09 đóng |
| ↳ A1-P9 | B4d/B4e — installer + Codex parity | TODO | R17 đóng |
| ↳ A1-P10 | B4f — skill truth | TODO | U03 đóng |
| **Gate A2** | Dựng lại evidence B5 (P11): 24 contract → VERIFIED | ⏳ TODO (phụ thuộc A1) | Cột Proof `v1-fix-bugs/README.md` — hiện 0/24 |
| **Gate A3** | Dogfood thật §3 trên clone ReportSupporter | ⏳ CHỜ QUOTA Claude Code | `docs/dogfood-checklist.md` §7 ghi `DOGFOOD_BLOCKED_BY_PROVIDER_QUOTA` |
| **Gate A4** | Cắt 7.0.0 | ⏳ TODO (phụ thuộc A1+A2+A3) | `node scripts/check-version-sync.mjs`; DoD `plan-v1-fix.md` §10 |
| **Gate B0-1** | Đối chiếu RB-06b (bundle self-contained) — trạng thái plan có thể đã lỗi thời | ⏳ TODO | `npm pack --dry-run` |
| **Gate B0-2** | RB-08 diệt drift docs onboarding (chạy sau A4) | ⏳ TODO | `grep -r "file:///" docs/ README.md` = 0 |
| **Gate B0-3** | Nợ lẻ RB-02 (2 ca e2e `--confirm`) + RB-04 (smoke run ghi `RUNBOOK-web.md`) | ⏳ TODO | `test/e2e/execution-flow.test.ts`; `RUNBOOK-web.md` |
| **Gate B1** | Pilot B18a — self-pilot 1 người/1 quy mô/1 harness, theo quyết định chủ repo 2026-08-02 | ⏳ TODO | `v5-feature-pilot-protocol.md` bảng chỉ số |
| **Gate B2** | Duyệt D49–D52 vào DecisionLog | ⏳ TODO | `DecisionLog.md` — hiện là ghi chú giữ chỗ |
| **Gate B3** | Thực thi lane V6: B19a→B19b→B20a→B20b→B21a→B21b | ⏳ TODO (phụ thuộc B2) | 6 contract `v6-expansion/README.md` — hiện WAITING_FOR_APPROVAL |
| **Gate B4** | Cắt 8.0.0 | ⏳ TODO (phụ thuộc B0–B3) | version sync |
| **Gate C1** | Duyệt 6 mục `v7-expansion/README.md` | ⏳ TODO (phụ thuộc B4) | README — hiện WAITING_FOR_APPROVAL |
| **Gate C2** | Gỡ cảnh báo "Lane CHƯA mở" | ⏳ TODO | `v7-expansion/README.md`, `InteractiveQuestionCardsPlan.md` |
| **Gate C3** | Thực thi: R-spike ∥ B22a → B22b → B22c → B22d → B22e | ⏳ TODO | — |

## Quyết định đã khoá (không làm lại)

- D53–D55 (`options` ở Core, một lượt = một commit, luôn còn đường tự nhập) — duyệt 2026-08-01, `DecisionLog.md`.
- Pilot B18a: hạ quy mô, không nâng claim "hỗ trợ build tới sản phẩm" (quyết định chủ repo 2026-08-02).
- Dogfood A3: chạy trên clone ReportSupporter, không dùng E:\YT hay chính repo nguồn (quyết định chủ repo 2026-08-02).
- **B5c/R14 (2026-08-03):** hạ thành limitation thay vì chạy human review hai reviewer — không chờ người ngoài mới cắt 7.0.0; công bố giới hạn, không tuyên bố đạt.
- **R21 (`amend` chết, 2026-08-03):** hoãn sau 7.0.0, ghi known-open vào `v7-release-note.md`; không kéo B14b/v4-expansion vào Gate A.
- **Linux gate DoD (2026-08-03):** dùng GitHub Actions matrix (`windows-latest` + `ubuntu-latest`) trong `.github/workflows/ci.yml`, không WSL/không hạ DoD xuống Windows-only.
- **Pilot B18a quy mô cụ thể (2026-08-03):** self-pilot — 1 người (tác giả), 1 quy mô nhỏ, 1 harness (Claude Code). Xem Known limitations trong `v5-feature-pilot-protocol.md`.

## Nguồn chi tiết theo gate

- Gate A: [plan-v1-fix.md](../ContractForAI/Core/v1-fix-bugs/plan-v1-fix.md), [v1-fix-bugs/README.md](../ContractForAI/Core/v1-fix-bugs/README.md), [finding-coverage-matrix.md](../ContractForAI/Core/v1-fix-bugs/finding-coverage-matrix.md), [v7-release-note.md](v7-release-note.md), [dogfood-checklist.md](../../docs/dogfood-checklist.md).
- Gate B: [ReleaseReadinessPlan.md](ReleaseReadinessPlan.md), [v6-expansion/README.md](../ContractForAI/Core/v6-expansion/README.md), [V6-DetailedDesignPlan.md](../ContractForAI/Core/v6-expansion/V6-DetailedDesignPlan.md), [v5-feature-pilot-protocol.md](evidence/v5-feature-pilot-protocol.md).
- Gate C: [v7-expansion/README.md](../ContractForAI/Core/v7-expansion/README.md), [InteractiveQuestionCardsPlan.md](InteractiveQuestionCardsPlan.md).
