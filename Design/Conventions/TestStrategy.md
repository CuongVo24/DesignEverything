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

### Tầng kiểm thử bổ sung

1. Semantic mutation: validator phải fail với README/shape sai, Must không có flow/task/acceptance, Won't leak, phantom command và risk unresolved.
2. Execution E2E: temporary workspace chạy validate, active task, path deny/allow, verify fail, repair, evidence và resume qua adapter thật.
3. Journey/pilot: transcript bất định và người dùng mới; đo điểm kẹt, can thiệp cần thiết, evidence thực tế và limitation. LLM reviewer chỉ bổ sung rubric có dẫn chứng, không phải điều kiện pass duy nhất.

Chi tiết fixture, rubric và release gate nằm ở B10a/B10b trong [V3-ExecutionExpansionPlan.md](../RoadMap/V3-ExecutionExpansionPlan.md).

## Dogfooding (test case #1)
Khi tool chạy được: **dùng nó sinh lại chính cây `Design/` này**. Vừa là demo, vừa là regression test cho cả script + taxonomy + gate.

## Đo lường thành công
Thả lên dự án thật, đo: "1 tuần soạn doc" rút xuống còn bao lâu?
