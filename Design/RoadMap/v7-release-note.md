# Release Notes — Version 7.0.0 (v1-fix-bugs Milestone)

**Status**: **UNRELEASED — BLOCKED**  
**Target Version**: 7.0.0 (not yet cut; `package.json` still 6.0.0)  
**Last reviewed**: 2026-07-30

---

## 0. Trạng thái thật

Bản GA trước đây (2026-07-25) claim "hoàn tất toàn bộ B1–B5" dựa trên `npm test` xanh. Đối chiếu lại cho thấy suite xanh không chứng minh 24 contract đạt: phần lớn primitive B1–B3 có unit test nhưng **không phải authority trên production path** (state, gate, emit, wrapper, installer vẫn dùng logic cũ song song). Chi tiết ở [plan-v1-fix.md](../ContractForAI/Core/v1-fix-bugs/plan-v1-fix.md) §1–§3.

Release này **KHÔNG được phát hành** cho tới khi Definition of Done cuối cùng trong plan-v1-fix.md §10 đạt đủ 11 điều kiện. Không dùng tài liệu này làm bằng chứng release; xem `finding-coverage-matrix.md` cho trạng thái thật theo từng finding.

---

## 1. Release Overview (mục tiêu, chưa đạt)

Phiên bản **7.0.0 (v1-fix-bugs)** hướng tới hoàn thành toàn bộ các hợp đồng nâng cấp độ tin cậy từ B1 đến B5 cho **DesignEverything**: tính an toàn giao dịch (transaction fault tolerance), tính nhất quán giữa các môi trường runtime (Claude Code và Codex shared runtime parity), và kiểm tra chất lượng tự động cho hành trình người dùng mới. Các mục dưới đây mô tả phần code đã viết — không phải phần đã được xác minh qua seam thật; xem cột Proof trong README/matrix trước khi dựa vào bất kỳ claim nào.

---

## 2. Key Enhancements & Features

### A. Core Engine Stability & Reliability
- **Answer Slot Validation (B3a)**: Chuẩn hóa kiểm duyệt câu trả lời phỏng vấn theo hợp đồng schema `answer_contract`.
- **Exact Wrapper Invocation (B4b)**: Đảm bảo hook wrapper và CLI runner gọi chính xác 100% tham số và môi trường thực thi.
- **CLI Exit Code & Output Health (B4c)**: Quy chuẩn hóa exit code (`0` cho thành công, `1` cho lỗi runtime/validation) và định dạng JSON envelope tiêu chuẩn.
- **Skill Handoff Truth (B4f)**: Chuyển giao mượt mà giữa skill phỏng vấn `/design-everything` và skill thực thi `/build`.

### B. Shared Runtime & Adapter Parity
- **Codex Parity Shared Runtime (B4e)**: Hợp nhất logic CLI giữa Claude Code adapter và Codex plugin thông qua `cliOperations.ts` duy nhất. Đảm bảo 100% tương thích về reason code, JSON envelope và state transitions (`adapter-parity.test.ts` & `crossRuntimeReplay.test.ts`).

### C. Adversarial Runtime & Fault Injection Resilience
- **Adversarial Installed Runtime (B5a)**: Chống lại các hành vi bypass hook, can thiệp lén vào file trạng thái hoặc giả mạo capability token.
- **Transaction Fault Injection (B5b)**: Đảm bảo tính nguyên tử (atomicity) cho giao dịch `commitStep` và `emitTree`. Bảo vệ hệ thống khỏi crash cứng (`process.exit(137)`), lỗi đĩa đầy (`ENOSPC`), lỗi quyền truy cập (`EACCES`), và tự động dọn dẹp orphan lock bị bỏ lại bởi các tiến trình đã chết.

### D. Newbie Journey & Quality Evaluation
- **Newbie Journey Evaluation (B5c)**: Đánh giá hành trình thông suốt trên cả 4 hình-hài dự án (`web`, `mobile`, `cli`, `hybrid`) và 2 chế độ giải thích (`deep`, `fast`). Đảm bảo 0 false pass cho câu trả lời rỗng hoặc placeholder.
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
- **Full Workspace Test**: `npm run test` — số lượng thay đổi theo commit; đọc trực tiếp output CI, không copy con số tĩnh vào tài liệu này (đây chính là lỗi bị phát hiện ở R15/B5d).
- **Lint & Build**: `npm run lint` && `npm run build`

Test xanh là điều kiện cần, không phải bằng chứng đủ cho một finding CLOSED. Xem `finding-coverage-matrix.md` cho evidence path/test ID thật của từng finding.

---

## 5. Known Limitations & Operational Directives

- **Installed-runtime seam evidence (cập nhật 2026-07-30):** B5a's `hook-adversarial.test.ts` và `codex-pre-tool-use.test.ts` nay cài thật qua `install.mjs` trong `beforeAll` rồi spawn hook/CLI target-local, không còn gọi thẳng TS source hay chạy hook từ `REPO_ROOT` — xem X18 (CLOSED) trong `finding-coverage-matrix.md`. B5b (fault-injection) và B5c (journey) vẫn phần lớn gọi thẳng Core, chưa qua CLI thật — đó là scope hiện tại, không phải lỗi chưa biết.
- **Chưa có reviewer/golden artifact cho B5c.** Report B5c hiện không có bằng chứng review độc lập, chỉ có validator output.
- **Version chưa thống nhất.** `package.json` = 6.0.0 trong khi một số tài liệu đã ghi 7.0.0/GA trước khi sửa — đây là chính finding bị flag (R15). Không tin bất kỳ con số version nào trong docs cho tới khi P12 hoàn tất.
- **Host Environment Smoke Run**: Khi phát hành tới người dùng cuối (sau khi hết BLOCKED), khuyến nghị thực hiện ít nhất 1 phiên phỏng vấn thực tế trên môi trường Claude Code CLI thật.
- **User Acknowledgement**: Các câu trả lời mang tính chủ quan (persona rộng, chọn tất cả là Must) sẽ đưa về mức `needs_user_ack` để người dùng xác nhận thay vì hệ thống tự ý bấm đồng ý.
