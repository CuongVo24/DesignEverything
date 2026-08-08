# v1-fix-bugs — Runtime Integrity & Newbie Journey Repair

> Bộ contract này biến toàn bộ phát hiện từ audit installer → hook → CLI → gate thành các micro-task có thể code và nghiệm thu độc lập. Nguồn TaskBrief: V1-FixBugsPlan.md. Ma trận không-bỏ-sót: finding-coverage-matrix.md.

## Mục tiêu

- Vá triệt để mọi đường bypass, fail-open và state transition mâu thuẫn.
- Biến bàn giao /design-everything → /build thành một state machine đúng sự thật.
- Đảm bảo answer, slot dẫn xuất, gate và output có chất lượng/truy vết đủ để người mới không nhận bộ docs rỗng ruột.
- Đóng gói Claude/Codex có manifest, tự kiểm integrity và không phụ thuộc âm thầm vào repo engine đã di chuyển hoặc dist cũ.
- Khóa public docs bằng chính artifact catalog và integration evidence, không bằng số đếm viết tay.

## Thứ tự thực thi bắt buộc

1. B1 — khóa state và transaction.
2. B2 — khóa policy/gate deterministic.
3. B3 — khóa quality, artifact catalog và emit.
4. B4 — nối adapter, CLI, installer và skill vào Core đã duyệt.
5. B5 — chạy adversarial/fault-injection/newbie journey rồi mới sync release docs.

Không code B4 trước khi các contract Core mà nó phụ thuộc được duyệt và merge.

## Mô hình trạng thái (3 trục — bắt buộc từ 2026-07-25)

Một cột `Trạng thái` duy nhất không đủ diễn đạt approval, implementation và proof độc lập. Từ
plan-v1-fix.md §3, mỗi contract có ba trục:

- **Spec**: `DRAFT` → `WAITING_FOR_APPROVAL` → `APPROVED`. Ý định đã được người duyệt hay chưa.
- **Implementation**: `NOT_STARTED` → `PARTIAL` → `IMPLEMENTED`. Code tồn tại và đạt checklist nội bộ.
- **Proof**: `MISSING` → `SNAPSHOT_ONLY` → `UNIT_ONLY` → `SEAM_PARTIAL` → `VERIFIED`. `SNAPSHOT_ONLY`
  là bằng chứng yếu hơn cả `UNIT_ONLY` — chỉ so khớp văn bản/snapshot, không chạy hành vi thật.
  `INVALID_FOR_CLAIM` và `INVALID_FOR_PRODUCTION_SEAM` là hai nhánh rẽ khỏi trục, không phải một nấc
  trên đó: cả hai đánh dấu bằng chứng hiện có **không được tính** cho DONE — `INVALID_FOR_CLAIM` khi
  evidence sai seam/không map đúng finding, `INVALID_FOR_PRODUCTION_SEAM` khi evidence chạy đúng
  hành vi nhưng gọi thẳng Core thay vì qua CLI/wrapper production thật.

**Quy tắc khóa:** một contract chỉ được ghi `DONE` khi cả ba trục đạt `APPROVED + IMPLEMENTED +
VERIFIED`. Không dùng `DONE` để che việc chưa approve hoặc chưa có seam evidence. `DONE` không được
gán nếu bất kỳ dependency nào trong cột Depends on chưa `DONE`.

## Danh sách contract

| Batch | Contract | Layer | Depends on | Spec | Implementation | Proof |
|---|---|---|---|---|---|---|
| B1 | B1a — Interview turn capability | Core | — | APPROVED | IMPLEMENTED | SEAM_PARTIAL |
| B1 | B1b — Atomic interview persistence | Core | B1a | APPROVED | IMPLEMENTED | UNIT_ONLY |
| B1 | B1c — Design/build handoff state | Core | B1b | APPROVED | IMPLEMENTED | UNIT_ONLY |
| B1 | B1d — Block reason transition | Core | B1c | APPROVED | IMPLEMENTED | UNIT_ONLY |
| B2 | B2a — Protected artifact policy | Core | B1b | APPROVED | IMPLEMENTED | UNIT_ONLY |
| B2 | B2b — Shell command classifier | Core | — | APPROVED | IMPLEMENTED | UNIT_ONLY |
| B2 | B2c — Canonical path matcher | Core | — | APPROVED | IMPLEMENTED | UNIT_ONLY |
| B2 | B2d — Gate evidence recomputation | Core | B2c | APPROVED | IMPLEMENTED | UNIT_ONLY |
| B2 | B2e — Runtime health and recovery | Core | B1d, B2a, B2d | APPROVED | IMPLEMENTED | UNIT_ONLY |
| B3 | B3a — Answer and slot validation | Core | B1a, B2c | APPROVED | IMPLEMENTED | UNIT_ONLY |
| B3 | B3b — Derived content provenance | Content | B3a | APPROVED | PARTIAL | UNIT_ONLY |
| B3 | B3c — Authoritative artifact catalog | Core | B2c | APPROVED | IMPLEMENTED | UNIT_ONLY |
| B3 | B3d — Transactional emit | Core | B2d, B3b, B3c | APPROVED | IMPLEMENTED | UNIT_ONLY |
| B3 | B3e — Deepen lifecycle | Core | B1a, B3a, B3d | APPROVED | PARTIAL | UNIT_ONLY |
| B4 | B4a — Claude hook policy integration | Adapter | B1–B3 | APPROVED | IMPLEMENTED | SEAM_PARTIAL |
| B4 | B4b — Exact wrapper invocation | Adapter | B2b, B4a | APPROVED | IMPLEMENTED | SEAM_PARTIAL |
| B4 | B4c — CLI exit/output/health protocol | Adapter | B2e, B3d, B3e | APPROVED | IMPLEMENTED | SEAM_PARTIAL |
| B4 | B4d — Self-contained installer integrity | Adapter | B3c, B4b, B4c | APPROVED | IMPLEMENTED | SEAM_PARTIAL |
| B4 | B4e — Codex parity and shared runtime | Adapter | B4c, B4d | APPROVED | IMPLEMENTED | SEAM_PARTIAL |
| B4 | B4f — Skill handoff and wording truth | Adapter | B1c, B3e, B4c | APPROVED | IMPLEMENTED | SNAPSHOT_ONLY |
| B5 | B5a — Adversarial installed-runtime integration | QA | B4a–B4f | APPROVED | PARTIAL | INVALID_FOR_CLAIM |
| B5 | B5b — Transaction fault injection | QA | B1b, B3d, B4c | APPROVED | PARTIAL | INVALID_FOR_PRODUCTION_SEAM |
| B5 | B5c — Newbie journey and quality evaluation | QA | B3a–B4f | APPROVED | PARTIAL | INVALID_FOR_CLAIM |
| B5 | B5d — Docs, version and release truth sync | QA | B5a–B5c | APPROVED | PARTIAL | INVALID_FOR_CLAIM |

Chi tiết lý do từng dòng: xem `plan-v1-fix.md` §1.3 và §3.1. Kế hoạch sửa theo phase: `plan-v1-fix.md` §5–§6.

## Release gate chung

- Mỗi finding trong finding-coverage-matrix.md phải có ít nhất một contract primary và test oracle.
- Không còn allow dựa trên basename, substring command, file-exists-only hoặc cached gates_passed.
- Mọi mutation nhiều file có failure-injection test chứng minh all-or-nothing và recovery.
- Installer test chạy trên temporary target thật, không chỉ import hàm Core.
- Cả Claude Code và Codex plugin phải dùng cùng contract/runtime version và cùng fixtures.
- Quickstart tách rõ trải nghiệm thật với test mô phỏng; mọi count/path/version được sinh hoặc kiểm từ artifact catalog.
- Mọi file code hand-authored được tạo mới hoặc tách trong chương trình phải tuân giới hạn 200 dòng; bundle/generated artifact phải được đánh dấu và không review như source.

## Trạng thái

Phase 4 spec approval đã đóng theo thứ tự B1→B5 ngày 2026-08-01: **24/24 contract có Spec
`APPROVED`** sau khi đối chiếu finding-coverage-matrix. Approval chỉ chốt ý định và oracle; không hồi
tố implementation/proof thành đạt. Không contract nào trong 24 contract được coi là `DONE` cho tới
khi đạt đủ `APPROVED + IMPLEMENTED + VERIFIED`. Xem `plan-v1-fix.md` cho các gap còn lại.
