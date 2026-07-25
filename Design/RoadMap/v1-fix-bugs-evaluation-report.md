# Release Evaluation Report — v1-fix-bugs (Core Engine Quality & Journey Verification)

> **INVALIDATED / DRAFT — không dùng làm release evidence.** Báo cáo này được viết dựa trên
> unit/component test pass, không có installed-runtime seam, không có reviewer/golden artifact
> độc lập cho B5c, và không đối chiếu với việc production path còn dùng logic cũ song song với
> Core mới (xem `Design/ContractForAI/Core/v1-fix-bugs/plan-v1-fix.md` §1–§3 cho phân tích đầy đủ).
> Giữ lại nguyên văn bên dưới để tham khảo lịch sử; các con số/claim trong đó **không được coi là
> đã verified** cho tới khi P11 của plan-v1-fix.md hoàn tất và sinh report mới có evidence path.

**Date**: 2026-07-25  
**Version**: 6.0.0 (v1-fix-bugs)  
**Harness**: Vitest v1.6.0 + Node.js v20+  
**Target Runtimes**: Claude Code, Codex  

---

## 1. Executive Summary

Hệ thống đã hoàn tất toàn bộ hợp đồng cải tiến từ nhóm B1 đến B5, xây dựng cơ chế kiểm soát chất lượng nội dung và giao dịch chịu lỗi toàn diện. Báo cáo này xác minh hành trình người dùng mới (newbie journey) qua 4 dạng ứng dụng (`web`, `mobile`, `cli`, `hybrid`) và năng lực chặn lỗi của hệ thống khi gặp executor yếu.

---

## 2. Evaluation Metrics

| Metric | Target | Actual Result | Status |
|---|---|---|---|
| **Deterministic Reject / Warning Accuracy** | 100% | 100% (0 false pass cho hollow fixtures) | PASSED |
| **False Pass Rate for Placeholder Answers** | 0.0% | 0.0% (`todo`, `tbd`, `abc` bị chặn `invalid`) | PASSED |
| **Shape Journey Coverage** | 4/4 shapes | 4/4 shapes (`web`, `mobile`, `cli`, `hybrid`) | PASSED |
| **Hybrid Question Invariant** | Both Web + Mobile | Included 100% W-series & M-series questions | PASSED |
| **Deep / Fast Calibration Parity** | 100% invariant match | Identical question order & state revisions | PASSED |
| **Fault Injection Test Pass Rate** | 100% (11/11 tests) | 100% (Lock contention, ENOSPC, EACCES, Crash) | PASSED |
| **Deadlock-Free Recovery** | 100% recovery | Clears `blocked` state upon re-emit/re-validate | PASSED |
| **Workspace Test Suite Pass Rate** | 100% (87/87 test files) | 481/481 test cases PASSED | PASSED |

---

## 3. Quality Rubric Evaluation Matrix (Sections A-H)

- **Section A (Common Rules)**: Mọi tài liệu sinh ra đều chứa mục "Tại sao cần file này", bản dịch ngược chuẩn, và mỏ neo `source_refs`.
- **Section B (File-Specific Quality)**: Tất cả 7 file tài liệu chính (`00-06`) và `09-execution-plan.md` đạt tiêu chuẩn chất lượng.
- **Section C (S3 MoSCoW)**: Must-have features luôn đại diện cho tập MVP nhỏ nhất chạy được.
- **Section D (Mobile Trap Warnings)**: Cảnh báo `needs_user_ack` kích hoạt đúng khi chọn M2 (offline sync) hoặc M5 (store release).
- **Section E (Tier 2 Design Docs)**: 100% các file `docs/design/` có `SourceRef` cố định nguồn gốc và không bịa đặt nguồn.
- **Section F (Derived Recipes)**: Dữ liệu dẫn xuất tuân thủ strict recipes trong `derived-recipes.yaml`.
- **Section G (Deterministic Reject vs. Human Ack)**: Tách biệt hoàn toàn giữa lỗi cấu trúc (`invalid`) và cảnh báo chủ quan (`needs_user_ack`).
- **Section H (Newbie Journey Evaluation)**: 0 false pass, 4 shapes covered, khôi phục trạng thái không kẹt deadlock.

---

## 4. Verification Proof

### Test Suite Execution
- `npx vitest run test/journey`: Pass 9/9 tests (newbie shapes + weak executor replay).
- `npx vitest run test/fault-injection`: Pass 11/11 tests (state & emit transaction fault injection).
- `npm run test`: Pass 87/87 test files, 481/481 tests.
- `npm run lint`: Pass 0 errors, 0 warnings.
- `npm run build`: TypeScript compilation clean.

---

## 5. Limitations & Operational Directives

1. **Host Integration**: Đánh giá môi trường thật trên Claude Code CLI độc lập với CI deterministic; CI đảm bảo hợp đồng invariant 100% đúng.
2. **Reviewer Disagreement**: Các điểm nghi vấn chủ quan (persona rộng, ưu tiên Must) luôn được đưa về `needs_user_ack` để người dùng đưa ra quyết định cuối cùng thay vì LLM tự phán đoán.
