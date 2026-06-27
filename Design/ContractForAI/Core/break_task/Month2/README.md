# break_task — Month 2 (review tuần 5–8)

> Vòng break_task theo [CONTRACT_STRUCTURE_RULE §7](../../../CONTRACT_STRUCTURE_RULE.md). Nguồn: manager review output Month 2 sau khi 4 tuần (W5–W8) báo `DONE` và mốc **v1.0.0** được đóng (xem [v1-release-note](../../../../RoadMap/Month2/v1-release-note.md)).

## Bối cảnh
Month 2 đã đóng mốc "v1 dùng được": 57 test xanh, mobile chạy end-to-end (emit đúng `07-release.md`, anchor route `apps/mobile/src/`), generator `AGENTS.md` thuần đọc gate-policy runtime, 2 golden regression web + mobile. Hướng đi và kỷ luật phạm vi **đúng**. Nhưng review phát hiện **3 điểm chưa sạch** chạm trực tiếp vào lời hứa cốt lõi của chính sản phẩm ("regression không để vỡ thầm lặng" + "chỉ đánh dấu đã phủ harness khi test thật"), phải vá trước khi Month 3 dogfood trên dự án thật — nếu không sẽ đo trên một nền không trung thực.

## 3 finding → 2 fix + 1 polish
| # | Finding | Tầng | Contract |
|---|---|---|---|
| 1 | Hai cảnh báo cốt lõi M2 (offline/sync) + M5 (store) **không có test bảo vệ**. Text `[CẢNH BÁO]` chỉ nằm trong `translate_back` của [script.yaml:113,137](../../../../Content/interview-script/script.yaml); [mobile-flow.test.ts:137](../../../../../test/e2e/mobile-flow.test.ts) chỉ assert `ID câu hỏi`, không assert cảnh báo surface. `grep "CẢNH BÁO" test/` → 0. Xóa nhầm cảnh báo → không test nào đỏ. Mâu thuẫn DoD W5 + W8. | Test (e2e) | [m2_fix_mobile_warnings_regression](m2_fix_mobile_warnings_regression_contract.md) |
| 2 | [ConformanceMatrix.md:12-13](../../../../Adapters/ConformanceMatrix.md) vẫn ghi Claude Code + AGENTS.md là `📐 spec locked, chưa code` và footer "chưa harness nào ✅", trong khi hook + generator đã code + test. Checklist W6 yêu cầu cập nhật ✅ — chưa làm. Đây đúng loại doc-lệch-code mà sản phẩm sinh ra để chống. | Adapter (doc) | [m2_fix_conformance_matrix_drift](m2_fix_conformance_matrix_drift_contract.md) |
| 3 | DoD W6 yêu cầu "test thật trên Codex và/hoặc Cursor" + smoke-test prompt → **không có**, chỉ unit test generator. Nguyên tắc trung thực cắt cả hai chiều: không tô ✅ khi chưa chạy thật. | Adapter (doc) | (gộp vào #2 — chung artifact + chung gốc "matrix phải phản ánh đúng thực tế") |
| obs | File [.agents/AGENTS.md](../../../../../.agents/AGENTS.md) **không phải** output của `generateAgentsMd` (nó là rules `/design` viết tay). Output thật của generator (file `# AGENTS` 5 phần) **chưa bao giờ được vật chất hoá** ra đĩa → không có artifact để soi/khoá drift. | Adapter | [m2_polish_agents_md_artifact_drift_guard](m2_polish_agents_md_artifact_drift_guard_contract.md) |

> **Vì sao #2+#3 gộp:** cả hai cùng được vá bằng một lần cập nhật trung thực [ConformanceMatrix.md](../../../../Adapters/ConformanceMatrix.md) — đánh dấu đúng phần đã code+test, **và** ghi rõ phần harness smoke run còn thiếu (defer Month 3). Tách hai contract sẽ khiến hai contract cùng sửa một file, vi phạm "một contract = một đơn vị triển khai".

## Thứ tự thực thi đề xuất
1. `m2_fix_mobile_warnings_regression` (Test — khóa lời hứa cốt lõi của nhánh mobile trước khi dogfood).
2. `m2_fix_conformance_matrix_drift` (Doc — phục hồi trung thực matrix, độc lập).
3. `m2_polish_agents_md_artifact_drift_guard` (Adapter — tùy chọn, có thể defer; làm cho đường AGENTS.md "thật" và chống drift).
