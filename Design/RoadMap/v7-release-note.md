# Release Notes — Version 7.0.0 (v1-fix-bugs Milestone)

**Status**: **GA** (cắt 2026-08-10)  
**Target Version**: 7.0.0 — `package.json` still 7.0.0  
**Last reviewed**: 2026-08-10

---

## 0. Trạng thái thật

Bản GA trước đây (2026-07-25) claim "hoàn tất toàn bộ B1–B5" dựa trên `npm test` xanh. Đối chiếu lại cho thấy suite xanh không chứng minh 24 contract đạt: phần lớn primitive B1–B3 có unit test nhưng **không phải authority trên production path** (state, gate, emit, wrapper, installer vẫn dùng logic cũ song song). Chi tiết ở [plan-v1-fix.md](../ContractForAI/Core/v1-fix-bugs/plan-v1-fix.md) §1–§3.

**Cập nhật 2026-07-30:** Phase 0–3 của kế hoạch đóng debt (repo sạch, 4 nhóm code debt, evidence
rebuild cho B5a/B5b/B5c/B5d, harden `check-matrix.mjs`/`check-version-sync.mjs`, typecheck toàn bộ
test, giết version literal, sửa docs claim 7.0.0 đã release, packaging test chứng minh file thật)
đã xong — xem `Design/ContractForAI/Core/v1-fix-bugs/plan-v1-fix.md` cho chi tiết từng commit.

**Cập nhật 2026-08-01:** audit toàn bộ matrix đã hoàn tất theo bốn lô A–D. Mọi dòng đều có lại
status/test/evidence theo code hiện tại; X11/X18/X24 đã hạ từ `CLOSED` về `FIXED` vì contract primary
vẫn `PARTIAL`, đúng điều kiện đóng matrix. Phase 4 spec approval đã đóng B1→B5 ngày 2026-08-01
(24/24 contract `APPROVED`). Approval chỉ đóng trục Spec; **không** đóng implementation, proof hay
Definition of Done.

**Cắt GA 2026-08-10 — trạng thái thật cuối cùng, theo D56 (`DecisionLog.md`, hạ điều 6/10 của DoD
§10 trong `plan-v1-fix.md`):** 24/24 contract đạt `APPROVED + IMPLEMENTED` với Proof on-axis
(`UNIT_ONLY` hoặc `SEAM_PARTIAL`, không còn contract nào `MISSING`/`SNAPSHOT_ONLY`/off-axis). Không
contract nào đạt `VERIFIED` tuyệt đối — gap thật của từng contract ghi rõ trong §7 của chính nó, không
giấu. Hai mục không tự đóng được bằng thêm test đã hạ thành limitation công bố: R14 (hai reviewer độc
lập cho B5c) và A3 (dogfood thật ngoài repo, chặn bởi quota provider bên thứ ba) — xem §5. Bằng chứng
khách quan tại thời điểm cắt: `npm test` → 131 file, 992 test pass, 2 skip (symlink, môi trường
Windows, đã biết); `npm run lint`/`typecheck:all`/`build` sạch; `node scripts/check-matrix.mjs` và
`node scripts/check-version-sync.mjs` đều exit 0.

Release này mang theo danh sách gap thật công khai ở §5 — không tuyên bố hoàn hảo, chỉ tuyên bố đúng
những gì đã chứng minh được. Xem `finding-coverage-matrix.md` cho trạng thái thật theo từng finding.

---

## 1. Release Overview

Phiên bản **7.0.0 (v1-fix-bugs)** hoàn thành toàn bộ 24 hợp đồng nâng cấp độ tin cậy B1–B5 cho
**DesignEverything**: tính an toàn giao dịch (transaction fault tolerance), tính nhất quán giữa các
môi trường runtime (Claude Code và Codex shared runtime parity), và kiểm tra chất lượng tự động cho
hành trình người dùng mới. Các mục dưới đây mô tả phần code đã viết **và** mức bằng chứng seam thật
đã đạt — xem cột Proof trong README/matrix và §5 Known Limitations trước khi dựa vào bất kỳ claim nào;
không contract nào ở mức `VERIFIED` tuyệt đối, phần lớn ở `UNIT_ONLY`/`SEAM_PARTIAL` với gap ghi rõ.

---

## 2. Key Enhancements & Features

### A. Core Engine Stability & Reliability
- **Answer Slot Validation (B3a)**: Chuẩn hóa kiểm duyệt câu trả lời phỏng vấn theo hợp đồng schema `answer_contract`.
- **Exact Wrapper Invocation (B4b)**: Đảm bảo hook wrapper và CLI runner gọi chính xác 100% tham số và môi trường thực thi.
- **CLI Exit Code & Output Health (B4c)**: Quy chuẩn hóa exit code (`0` thành công; nhóm usage `1`, validation/policy `2`, health/corruption `3`, conflict `4`, internal `5`) và định dạng JSON envelope tiêu chuẩn.
- **Skill Handoff Truth (B4f)**: Chuyển giao mượt mà giữa skill phỏng vấn `/design-everything` và skill thực thi `/build`.

### B. Shared Runtime & Adapter Parity
- **Codex Parity Shared Runtime (B4e)**: Hợp nhất logic CLI giữa Claude Code adapter và Codex plugin thông qua `cliOperations.ts` duy nhất; parity suite kiểm reason code, JSON envelope, state transition và policy seams đã liệt kê, không suy rộng thành claim 100% cho hành vi chưa có fixture.

### C. Adversarial Runtime & Fault Injection Resilience
- **Adversarial Installed Runtime (B5a)**: Chống lại các hành vi bypass hook, can thiệp lén vào file trạng thái hoặc giả mạo capability token.
- **Transaction Fault Injection (B5b)**: Đảm bảo tính nguyên tử (atomicity) cho giao dịch `commitStep` và `emitTree`. Bảo vệ hệ thống khỏi crash cứng (`process.exit(137)`), lỗi đĩa đầy (`ENOSPC`), lỗi quyền truy cập (`EACCES`), và tự động dọn dẹp orphan lock bị bỏ lại bởi các tiến trình đã chết.

### D. Newbie Journey & Quality Evaluation
- **Newbie Journey Evaluation (B5c)**: Automated suite đi qua 4 hình-hài dự án (`web`, `mobile`, `cli`, `hybrid`) và 2 chế độ giải thích (`deep`, `fast`); claim "hai reviewer độc lập" đã hạ thành limitation (R14, WAIVED 2026-08-10) thay vì tuyên bố đã đạt — xem §5.
- **Release Truth Sync (B5d)**: Loại bỏ hoàn toàn đường dẫn tuyệt đối local (`file:///e:/...`), đồng bộ hóa schema và kiểm tra sự thật runtime qua bài test tự động `runtime-truth.test.ts`.

---

## 3. Migration & Breaking Changes

1. **Launcher Simplification**:
   Các file `adapter/claude-code/cli.mjs` và `adapter/codex-plugin/cli.mjs` hiện tại là các thin launcher (< 100 dòng). Mọi ứng dụng tích hợp tùy biến nên gọi trực tiếp qua shared runner `src/adapters/shared/cliOperations.js`.
2. **Orphaned Lock Auto-Recovery**:
   Nếu một tiến trình trước đó bị crash mà chưa kịp xóa tệp khóa `.design-everything/interview.lock`, hệ thống sẽ tự động phát hiện PID của tiến trình đã chết và dọn dẹp khóa an toàn mà không cần can thiệp thủ công.
3. **Absolute Link Prohibition**:
   Tất cả tài liệu hướng dẫn và báo cáo release bắt buộc dùng relative markdown links thay cho URI `file:///`.

---

## 4. Test Commands & Verification Proof

- **Docs Runtime Truth**: `npx vitest run test/docs/runtime-truth.test.ts`
- **Journey Suite**: `npx vitest run test/journey`
- **Fault Injection Suite**: `npx vitest run test/fault-injection`
- **Installed Runtime Suite**: `npx vitest run test/integration/installed-runtime`
- **Full Workspace Test**: `npm run test` — 131 file / 992 test pass / 2 skip tại thời điểm cắt 2026-08-10 (số lượng thay đổi theo commit; đọc trực tiếp output CI cho commit hiện tại, đừng coi con số này là bất biến — đây chính là lỗi bị phát hiện ở R15/B5d).
- **Lint & Build**: `npm run lint` && `npm run build`

Test xanh là điều kiện cần, không phải bằng chứng đủ cho một finding CLOSED. Xem `finding-coverage-matrix.md` cho evidence path/test ID thật của từng finding.

---

## 5. Known Limitations & Operational Directives

- **Installed-runtime seam evidence (cập nhật 2026-08-10):** B5a — 15 file, 76 test pass trên target cài thật, gồm `phase-authorization-matrix.test.ts` mới đóng U04/R04; 2 gap thật còn lại (X09 exit-class, X23 ack cross-process). B5b — xác nhận `crash-worker.mjs` crash đúng hàm production gọi (`prepareEmit`/`transactInterviewStore`), gap còn lại là lớp CLI ngoài cùng chưa bị crash cùng lúc. Chi tiết đầy đủ: §7 của từng contract `Design/ContractForAI/Core/v1-fix-bugs/B5/`.
- **R14 — hai reviewer độc lập cho B5c, WAIVED (2026-08-10, thi hành quyết định đã khoá 2026-08-03).** Không chờ pilot/beta ngoài mới cắt 7.0.0. Contract B5c §3 đã sửa bỏ claim "hai reviewer độc lập", hạ xuống một lượt review theo rubric B19a (công bố, không tuyên bố đạt chuẩn gốc). **Đây không phải regression của 7.0.0** — là một bar đánh giá tốn kém (người review ngoài) không có sẵn ở quy mô một tác giả, cùng loại quyết định với pilot B18a. Điều kiện mở lại: có pilot/beta thật với reviewer ngoài tác giả. Loại khỏi mẫu số coverage của B5a §6 theo đúng cách R21 đã làm — không dùng để che các finding khác của B5c. Journey suite (`test/journey/`) vẫn qua Core loop thuần, chưa qua CLI thật — đây là gap kỹ thuật riêng, không liên quan R14.
- **Known-open: chưa có dogfood thật ngoài repo (WAIVED 2026-08-10, Gate A3).** `E:\YT` (2026-08-01) chỉ đạt `INSTALL_ONLY`; `ReportSupporter` (2026-08-01) dừng ở `401 Insufficient balance` từ provider trước câu hỏi đầu tiên (`docs/dogfood-checklist.md` §6–§7). Đây là quota bên thứ ba, không phải lỗi sản phẩm — cùng dạng "chi phí thu thập bằng chứng đã được hạ" như pilot B18a, không phải "phạm vi enforcement" (thứ repo chưa từng hạ, xem quyết định Linux gate 2026-08-03). Điều kiện mở lại: chạy lại trọn §3 `dogfood-checklist.md` trên dự án thật khi có quota.
- **Host Environment Smoke Run**: Khi phát hành tới người dùng cuối (sau khi hết BLOCKED), khuyến nghị thực hiện ít nhất 1 phiên phỏng vấn thực tế trên môi trường Claude Code CLI thật.
- **User Acknowledgement**: Các câu trả lời mang tính chủ quan (persona rộng, chọn tất cả là Must) sẽ đưa về mức `needs_user_ack` để người dùng xác nhận thay vì hệ thống tự ý bấm đồng ý.
- **Known-open: đường `amend` chưa có surface (R21).** Tu chỉnh kế hoạch có kiểm soát (B14b/D39) chưa được duyệt và chưa nối vào dispatcher — `cliOperations.ts` không có case `amend`. Đây **không phải regression của 7.0.0**: là một tính năng chưa nối, hoãn có chủ đích sau milestone này. Quan trọng hơn, `planAmendment.ts:159-160` (`approvePlanAmendment`) hiện xóa `state.evidence`/`state.completed_tasks` khi approve — trái ngay checklist "preserve prior evidence" của B14b, nên nối nguyên trạng sẽ đưa một đường phá evidence vào production. Điều kiện đóng: B14b được duyệt → sửa evidence-preservation → nối `amend propose|show|approve` qua CLI thật. Xem `finding-coverage-matrix.md` §R21 cho chi tiết phạm vi đã đóng/còn mở.
