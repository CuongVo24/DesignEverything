# Contract — B18a Feature journey evaluation

> Tầng: QA. Nguồn: V5-ContractSynthesisPlan B18a, D47 (mở rộng D34/D40). Phụ thuộc: B17b.

## 1. Micro-task target

Chạy pilot có artifact chứng minh ≥1 người mới hoàn thành **trọn một feature Must thật** (không chỉ M0) trên ≥2 quy mô dự án, và hiệu chỉnh ngưỡng sizing bằng fixture.

## 2. Scope

**In scope**

- Journey rubric mở rộng: hiểu hợp đồng active, tuân review/break-task, không nhảy feature, xử lý khi verify fail.
- Pilot ≥2 quy mô (nhỏ: CLI ít entity; vừa: web data-model rộng) trên cả Claude và Codex; ghi time-to-first-feature, intervention taxonomy, số hợp đồng sinh ra, tỷ lệ đóng review.
- Semantic mutation: chèn hợp đồng sai (path ngoài Conventions, verify rỗng, trace Must→skeleton) → validator/review phải bắt.
- Hiệu chỉnh hàm `weight` bằng dữ liệu fixture; ghi số chốt vào B16b test.
- Raw findings ẩn danh + replay artifact tái kiểm được (như [evidence/](../../../RoadMap/evidence/)).

**Out of scope**

- Không claim marketing trước khi B18b đóng; không mở rộng cỡ mẫu enterprise.
- Không sửa core ngoài hiệu chỉnh ngưỡng đã có test.

## 3. Checklist

- [ ] ≥1 newbie hoàn thành trọn một Must feature với evidence + review đóng, quan sát được.
- [ ] Pilot phủ ≥2 quy mô và cả 2 harness; raw findings ẩn danh audit được.
- [ ] Semantic mutation chứng minh validator/review bắt hợp đồng sai.
- [ ] Số hợp đồng theo quy mô khớp kỳ vọng sizing; ngưỡng `weight` chốt bằng dữ liệu.
- [ ] Known limitations tự công bố (cỡ mẫu, sandbox, Codex soft-gate).

## 4. Interfaces / Files expected to change

- [NEW] `Design/RoadMap/evidence/v5-feature-pilot-protocol.md`, `v5-feature-pilot-raw.md`, `v5-feature-replay-report.md`, ≤200 dòng/file.
- [NEW] `Design/RoadMap/v5-feature-evaluation-report.md`, ≤200 dòng.
- [NEW] `test/replay/featureJourneyReplay.test.ts` + fixture quy mô, ≤200 dòng/file.
- [MODIFY] `src/core/synthesizeFeatureContracts.test.ts`, ≤80 dòng: chốt ngưỡng weight.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Pilot nhỏ, không đại diện | Cao | Công bố rõ known limitations; không nâng claim quá dữ liệu. |
| Kết quả tự khai không tái kiểm | Cao | Replay artifact + raw ẩn danh; evidence do runner thu (D36). |
| Overfit ngưỡng vào fixture | TB | Hiệu chỉnh trên ≥2 quy mô khác nhau, giữ hàm thay vì số cứng. |

## 6. Verification plan

- `npx vitest run featureJourneyReplay synthesizeFeatureContracts`
- `npm run typecheck && npm run lint && npm run build`
- Review artifact: một reviewer ngoài tác giả tái kiểm được ≥1 phiên newbie hoàn thành feature Must từ raw + replay.

## 7. Status

WAITING_FOR_APPROVAL
