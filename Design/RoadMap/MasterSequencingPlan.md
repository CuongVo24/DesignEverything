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
| **Phase 0** | Đóng working tree (53 file uncommitted, gồm code RB-05 thật) | ✅ DONE 2026-08-02 | `8ef786f` (RB-05 seam + e2e), `5830215` (audit matrix), `dfb1b98` (roadmap docs); build/lint/typecheck/test xanh: 125 file, 847 test |
| **Gate A1** | Nâng 22 contract `v1-fix-bugs` PARTIAL → IMPLEMENTED (P2→P10 của `plan-v1-fix.md` §6) | ⏳ TODO | Cột Implementation `v1-fix-bugs/README.md` — hiện 2/24 |
| ↳ A1-P2 | B1a/B1b — capability lifecycle + canonical store | TODO | R19, R18 đóng |
| ↳ A1-P3 | B1c/B1d — handoff authority + typed blocked remediation | TODO | R05 đóng |
| ↳ A1-P4 | B2a/B2b/B2c — path/ownership/command policy | TODO | R07, X02, R06 đóng |
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
| **Gate B1** | Pilot B18a, quy mô đã hạ theo quyết định chủ repo 2026-08-02 | ⏳ TODO | `v5-feature-pilot-protocol.md` bảng chỉ số |
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

## Nguồn chi tiết theo gate

- Gate A: [plan-v1-fix.md](../ContractForAI/Core/v1-fix-bugs/plan-v1-fix.md), [v1-fix-bugs/README.md](../ContractForAI/Core/v1-fix-bugs/README.md), [finding-coverage-matrix.md](../ContractForAI/Core/v1-fix-bugs/finding-coverage-matrix.md), [v7-release-note.md](v7-release-note.md), [dogfood-checklist.md](../../docs/dogfood-checklist.md).
- Gate B: [ReleaseReadinessPlan.md](ReleaseReadinessPlan.md), [v6-expansion/README.md](../ContractForAI/Core/v6-expansion/README.md), [V6-DetailedDesignPlan.md](../ContractForAI/Core/v6-expansion/V6-DetailedDesignPlan.md), [v5-feature-pilot-protocol.md](evidence/v5-feature-pilot-protocol.md).
- Gate C: [v7-expansion/README.md](../ContractForAI/Core/v7-expansion/README.md), [InteractiveQuestionCardsPlan.md](InteractiveQuestionCardsPlan.md).
