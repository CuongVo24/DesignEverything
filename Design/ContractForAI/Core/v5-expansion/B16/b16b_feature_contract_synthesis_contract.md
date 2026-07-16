# Contract — B16b Feature contract synthesis

> Tầng: Lõi. Nguồn: V5-ContractSynthesisPlan B16b + Sizing heuristic, D41–D42, sketch V5-B16b §2. Phụ thuộc: B16a.

## 1. Micro-task target

Sau khi skeleton (T0–T3) verified, sinh feature-milestone `M4-{feature}` + hợp đồng-task bám feature từ Must × data-model × flows, với số lượng theo quy mô (deterministic), mở just-in-time.

## 2. Scope

**In scope**

- `parseDataModel(doc)` → `{entities[], relations[]}`; `parseFlows(doc)` → `{flow_id, steps[]}[]` từ template `03`/`04`.
- `synthesizeFeatureContracts({ answers, profile, docs, conventionsRef })`: với mỗi `must ∈ extractMustFeatures \ extractWontFeatures`, khớp entity/flow, tính `weight = f(1, |entities|, |flow.steps|)`, sinh 1–3 hợp đồng (`data`/`logic`/`surface`) theo weight.
- Auto-split `-a/-b` khi Σ`est_lines` > ~200 hoặc chạm > 1 tầng (D42); mọi hợp đồng `status = WAITING_FOR_APPROVAL`, `derived_from` đầy đủ.
- Ghi milestone `M4-*` nối tiếp M0–M3 vào `ExecutionPlanV3.milestones`; `trace_links` trỏ task **compile từ hợp đồng**, không trỏ T0–T3 (D41).
- Mở just-in-time: chỉ sinh cho feature-milestone kế tiếp, không dựng cả cây.

**Out of scope**

- Không sinh cho Should/Could/Won't; không mobile/cloud/DB provisioning ngoài recipe.
- Không thực thi hợp đồng, không phase review (B17a).
- Không đọ ngưỡng weight cứng — chỉ hàm; hiệu chỉnh số ở B18a.

## 3. Checklist

- [ ] Must ∈ Won't không sinh hợp đồng nào.
- [ ] Dự án CLI nhỏ sinh ít hợp đồng hơn app web data-model rộng trên cùng bộ answers (test tỷ lệ theo quy mô).
- [ ] Mọi `trace_link.task_ids` trỏ task feature (không T0–T3); `validatePlan` B11a-semantics vẫn pass.
- [ ] Hợp đồng vượt ~200 dòng/đa tầng bị tách `-a/-b`; mỗi mảnh vẫn đủ 7 mục và `validateContract` pass.
- [ ] Chỉ feature-milestone kế tiếp được sinh; các Must sau còn ở trạng thái chưa mở.

## 4. Interfaces / Files expected to change

- [NEW] `src/core/parseDataModel.ts`, `src/core/parseFlows.ts`, ≤160 dòng/file.
- [NEW] `src/core/synthesizeFeatureContracts.ts`, ≤200 dòng: Must → feature-milestones + hợp đồng-task theo sizing.
- [MODIFY] `src/core/synthesizeExecutionPlan.ts`, ≤120 dòng: nối M4-* sau M3, gọi feature synthesis khi skeleton verified.
- [MODIFY] `src/core/validatePlan.ts`, ≤120 dòng: reject trace-link Must→skeleton cho feature Must.
- [NEW] `src/core/synthesizeFeatureContracts.test.ts` + fixture quy mô nhỏ/vừa, ≤200 dòng/file.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Bùng nổ hợp đồng làm newbie ngợp | Cao | Chỉ Must; mở just-in-time; trần độ nhỏ ép tách thay vì đẻ vô hạn. |
| Parser data-model/flows giòn | TB | Bám cú pháp bảng chuẩn template 03/04; fallback bỏ qua entity không parse được thay vì bịa. |
| Sizing lệch (quá nhỏ/to) | TB | `weight` là hàm test được trên fixture nhiều quy mô; số cụ thể chốt ở B18a. |

## 6. Verification plan

- `npx vitest run synthesizeFeatureContracts parseDataModel parseFlows synthesizeExecutionPlan validatePlan`
- `npm run typecheck && npm run lint && npm run build`
- E2E clean-workspace: skeleton verified → sinh M4 cho Must đầu → mỗi hợp đồng `validateContract` pass, `compileContractToTaskCard` ra TaskCard chạy được trên gate.

## 7. Status

DONE

> Đã code: `parseDataModel.ts`, `parseFlows.ts`, `synthesizeFeatureContracts.ts` + wiring JIT trong `synthesizeExecutionPlan.ts`, reject Must→skeleton trong `validatePlan.ts`. Fix 2026-07-14: est_lines giờ scale theo độ phức tạp khớp (complexity × hệ số) nên auto-split ~200 dòng thật sự kích hoạt; có test bảo chứng. Parser khớp heading template 03/04 thật.
