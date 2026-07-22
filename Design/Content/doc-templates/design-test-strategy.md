# Chiến Lược Kiểm Thử (Test Strategy)

## Tại sao cần file này
Tài liệu này xác định phương pháp, phạm vi, các tầng kiểm thử (Unit, Integration, E2E), và tích hợp CI/CD để đảm bảo chất lượng phần mềm. Điều này giúp lập trình viên viết test đúng trọng tâm và duy trì độ bền vững của dự án.

---

## 1. Phạm Vi & Các Tầng Kiểm Thử (Scope & Tiers)
Định nghĩa các tầng kiểm thử được áp dụng (ví dụ: Unit test cho logic, Integration test cho API, E2E test cho luồng chính).
<!-- anchor: id=design-test-strategy/scope  src=src/features/test-strategy/strategy.ts::testScope  rev=  status=planned -->
> Nguồn: doc:docs/conventions/test-tiers.md#test-tiers/specification

## 2. Tự Động Hóa & Tích Hợp CI/CD (Automation & CI/CD)
Mô tả cách thức chạy test tự động khi có PR hoặc build code (công cụ chạy test, workflow Github Actions...).
<!-- anchor: id=design-test-strategy/automation  src=src/features/test-strategy/strategy.ts::testAutomation  rev=  status=planned -->
> Nguồn: answers:DS4

## 3. Các Ca E2E Trọng Tâm (Priority E2E Scenarios)
Danh sách các kịch bản kiểm thử luồng người dùng (E2E) quan trọng nhất cần phủ sóng test trước.
<!-- anchor: id=design-test-strategy/priority-cases  src=src/features/test-strategy/strategy.ts::priorityCases  rev=  status=planned -->
> Nguồn: doc:docs/04-flows.md#04-flows/main-flow-steps
