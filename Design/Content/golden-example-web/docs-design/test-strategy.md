# Chiến Lược Kiểm Thử (Test Strategy)

## Tại sao cần file này
Tài liệu này xác định phương pháp, phạm vi, các tầng kiểm thử (Unit, Integration, E2E), và tích hợp CI/CD để đảm bảo chất lượng phần mềm. Điều này giúp lập trình viên viết test đúng trọng tâm và duy trì độ bền vững của dự án.

---

## 1. Phạm Vi & Các Tầng Kiểm Thử (Scope & Tiers)
Chưa chốt bộ công cụ và các tầng kiểm thử (unit / integration / e2e) cho dự án — cần hỏi người dùng và ghi vào `docs/conventions/test-tiers.md` trước khi viết test.
<!-- anchor: id=design-test-strategy/scope  src=src/features/test-strategy/strategy.ts::testScope  rev=  status=planned -->
> ⚠ unknown — cần hỏi người

## 2. Tự Động Hóa & Tích Hợp CI/CD (Automation & CI/CD)
Tích hợp chạy kiểm thử tự động trên GitHub Actions cho mỗi pull request được mở vào nhánh main.
<!-- anchor: id=design-test-strategy/automation  src=src/features/test-strategy/strategy.ts::testAutomation  rev=  status=planned -->
> Nguồn: answers:DS4

## 3. Các Ca E2E Trọng Tâm (Priority E2E Scenarios)
Tập trung kiểm thử luồng đăng nhập, tiếp theo là luồng tạo mới một công thức và tìm kiếm công thức đó trên màn hình chính.
<!-- anchor: id=design-test-strategy/priority-cases  src=src/features/test-strategy/strategy.ts::priorityCases  rev=  status=planned -->
> Nguồn: doc:docs/04-flows.md#04-flows/main-flow-steps
