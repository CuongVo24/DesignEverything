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

## Danh sách contract

| Batch | Contract | Layer | Depends on | Trạng thái |
|---|---|---|---|---|
| B1 | B1a — Interview turn capability | Core | — | WAITING_FOR_APPROVAL |
| B1 | B1b — Atomic interview persistence | Core | B1a | WAITING_FOR_APPROVAL |
| B1 | B1c — Design/build handoff state | Core | B1b | WAITING_FOR_APPROVAL |
| B1 | B1d — Block reason transition | Core | B1c | WAITING_FOR_APPROVAL |
| B2 | B2a — Protected artifact policy | Core | B1b | WAITING_FOR_APPROVAL |
| B2 | B2b — Shell command classifier | Core | — | WAITING_FOR_APPROVAL |
| B2 | B2c — Canonical path matcher | Core | — | WAITING_FOR_APPROVAL |
| B2 | B2d — Gate evidence recomputation | Core | B2c | WAITING_FOR_APPROVAL |
| B2 | B2e — Runtime health and recovery | Core | B1d, B2a, B2d | WAITING_FOR_APPROVAL |
| B3 | B3a — Answer and slot validation | Core | B1a, B2c | WAITING_FOR_APPROVAL |
| B3 | B3b — Derived content provenance | Content | B3a | WAITING_FOR_APPROVAL |
| B3 | B3c — Authoritative artifact catalog | Core | B2c | WAITING_FOR_APPROVAL |
| B3 | B3d — Transactional emit | Core | B2d, B3b, B3c | WAITING_FOR_APPROVAL |
| B3 | B3e — Deepen lifecycle | Core | B1a, B3a, B3d | WAITING_FOR_APPROVAL |
| B4 | B4a — Claude hook policy integration | Adapter | B1–B3 | WAITING_FOR_APPROVAL |
| B4 | B4b — Exact wrapper invocation | Adapter | B2b, B4a | WAITING_FOR_APPROVAL |
| B4 | B4c — CLI exit/output/health protocol | Adapter | B2e, B3d, B3e | WAITING_FOR_APPROVAL |
| B4 | B4d — Self-contained installer integrity | Adapter | B3c, B4b, B4c | WAITING_FOR_APPROVAL |
| B4 | B4e — Codex parity and shared runtime | Adapter | B4c, B4d | WAITING_FOR_APPROVAL |
| B4 | B4f — Skill handoff and wording truth | Adapter | B1c, B3e, B4c | WAITING_FOR_APPROVAL |
| B5 | B5a — Adversarial installed-runtime integration | QA | B4a–B4f | WAITING_FOR_APPROVAL |
| B5 | B5b — Transaction fault injection | QA | B1b, B3d, B4c | WAITING_FOR_APPROVAL |
| B5 | B5c — Newbie journey and quality evaluation | QA | B3a–B4f | WAITING_FOR_APPROVAL |
| B5 | B5d — Docs, version and release truth sync | QA | B5a–B5c | WAITING_FOR_APPROVAL |

## Release gate chung

- Mỗi finding trong finding-coverage-matrix.md phải có ít nhất một contract primary và test oracle.
- Không còn allow dựa trên basename, substring command, file-exists-only hoặc cached gates_passed.
- Mọi mutation nhiều file có failure-injection test chứng minh all-or-nothing và recovery.
- Installer test chạy trên temporary target thật, không chỉ import hàm Core.
- Cả Claude Code và Codex plugin phải dùng cùng contract/runtime version và cùng fixtures.
- Quickstart tách rõ trải nghiệm thật với test mô phỏng; mọi count/path/version được sinh hoặc kiểm từ artifact catalog.
- Mọi file code hand-authored được tạo mới hoặc tách trong chương trình phải tuân giới hạn 200 dòng; bundle/generated artifact phải được đánh dấu và không review như source.

## Trạng thái

WAITING_FOR_APPROVAL — đây là bộ đặc tả sửa lỗi, chưa cho phép code.
