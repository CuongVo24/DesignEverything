# Test Strategy

## Tại sao cần file này
Cái "ăn" thời gian của dự án này là **test thật trên từng harness** và **logic GATE ở ca biên**. Chiến lược test rõ ràng giữ cho việc phủ N nền tảng không vỡ trận.

## 3 tầng test

### 1. Schema/Content (lõi)
- `interview-script` hợp lệ theo [../Core/Schemas/interview-script.md](../Core/Schemas/interview-script.md): mọi câu có `id`, `target_doc`; `id` không trùng.
- Mọi `target_doc` tồn tại trong [../Content/taxonomy.md](../Content/taxonomy.md).
- Mọi `gate` trỏ tới gate có thật trong [../Content/interview-script/gate-policy.yaml](../Content/interview-script/gate-policy.yaml).
- `gate-policy.yaml` hợp lệ theo [../Core/Schemas/gate-policy.md](../Core/Schemas/gate-policy.md) (đủ field, `requires_docs` đều có trong taxonomy) và **khớp** ví dụ trong file schema.
- `progress.json` hợp lệ theo [../Core/Schemas/state-schema.md](../Core/Schemas/state-schema.md), gồm `answered_len_at_last_turn` và bất biến một-bước-mỗi-lượt.

### 2. GATE (ca biên — quan trọng nhất)
- Doc chưa xong → thử sinh code → **phải** bị chặn (A) / cảnh báo (B).
- Doc đã xong → sinh code → **không** bị chặn.
- AI hỏi xong nhường lượt → **không** bị `Stop` hook chặn nhầm.
- AI cố bịa nhiều câu trong 1 lượt → state chỉ tiến 1 bước.

### 3. End-to-end mỗi adapter
Theo [../Adapters/ConformanceMatrix.md](../Adapters/ConformanceMatrix.md): INJECT → chạy phỏng vấn → EMIT đúng cây taxonomy.

## V3 Execution Expansion — target 4.0.0

### Tại sao cần bổ sung
Unit test state và golden headings không chứng minh người mới thực sự đi từ docs tới code chạy được. V3 thêm kiểm tra semantic, hành vi adapter và journey để public claim không vượt quá evidence.

### Các tệp kiểm thử và fixtures đã triển khai
1. **Semantic mutation fixtures** (`test/fixtures/plan-validation/`):
   - Chứa các đột biến ngữ nghĩa gây lỗi validation: `invalid-shape-docs.json`, `readme-mismatch.json`, `traceability-missing.json`, `phantom-command.json`, `scope-leak.json`, `risk-unresolved.json`, và tệp chuẩn `valid-cli.json`.
2. **Execution E2E flow test** (`test/e2e/execution-flow.test.ts`):
   - Chạy trên temporary workspace, mô phỏng đầy đủ chuỗi vòng đời thực tế: Validate -> Allowed/Denied path -> Record evidence fail -> Repair -> Record evidence pass -> Resume.
   - Chứa kiểm thử "rules-only smoke test" ghi nhận các limitation tự báo cáo.

Chi tiết fixture, rubric và release gate nằm ở B10a/B10b trong [V3-ExecutionExpansionPlan.md](../RoadMap/V3-ExecutionExpansionPlan.md) và báo cáo thực tế trong [v3-evaluation-report.md](../RoadMap/v3-evaluation-report.md).

## Dogfooding (test case #1)
Khi tool chạy được: **dùng nó sinh lại chính cây `Design/` này**. Vừa là demo, vừa là regression test cho cả script + taxonomy + gate.

## Đo lường thành công
Thả lên dự án thật, đo: "1 tuần soạn doc" rút xuống còn bao lâu?
