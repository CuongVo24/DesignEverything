# Test Strategy

## Tại sao cần file này
Cái "ăn" thời gian của dự án này là **test thật trên từng harness** và **logic GATE ở ca biên**. Chiến lược test rõ ràng giữ cho việc phủ N nền tảng không vỡ trận.

## 3 tầng test

### 1. Schema/Content (lõi)
- `interview-script` hợp lệ theo [../Core/Schemas/interview-script.md](../Core/Schemas/interview-script.md): mọi câu có `id`, `target_doc`; `id` không trùng.
- Mọi `target_doc` tồn tại trong [../Content/taxonomy.md](../Content/taxonomy.md).
- Mọi `gate` trỏ tới gate có thật trong [../Core/Schemas/gate-policy.md](../Core/Schemas/gate-policy.md).

### 2. GATE (ca biên — quan trọng nhất)
- Doc chưa xong → thử sinh code → **phải** bị chặn (A) / cảnh báo (B).
- Doc đã xong → sinh code → **không** bị chặn.
- AI hỏi xong nhường lượt → **không** bị `Stop` hook chặn nhầm.
- AI cố bịa nhiều câu trong 1 lượt → state chỉ tiến 1 bước.

### 3. End-to-end mỗi adapter
Theo [../Adapters/ConformanceMatrix.md](../Adapters/ConformanceMatrix.md): INJECT → chạy phỏng vấn → EMIT đúng cây taxonomy.

## Dogfooding (test case #1)
Khi tool chạy được: **dùng nó sinh lại chính cây `Design/` này**. Vừa là demo, vừa là regression test cho cả script + taxonomy + gate.

## Đo lường thành công
Thả lên dự án thật, đo: "1 tuần soạn doc" rút xuống còn bao lâu?
