# Contract — B10b V3 documentation sync + release truthfulness

> Tầng: QA/Process. Nguồn: V3-ExecutionExpansionPlan B10b, D29-D35. Phụ thuộc: B10a DONE.

## 1. Micro-task target
Đóng mốc 4.0.0 chỉ khi source, contracts, schemas, docs, golden fixtures và public claims cùng nói một sự thật: DesignEverything hỗ trợ plan-validated và task/evidence ở mức nào, trên harness nào.

## 2. Scope

**In scope**

- Đồng bộ ProductPRD, Core Contract, taxonomy, schemas, QualityRubric, TestStrategy, Glossary, README, quickstart, MasterRoadMap, DecisionLog, ConformanceMatrix và Versioning.
- Regenerate templates/golden/AGENTS sample từ source thay vì sửa artifact tay.
- Dò link, reading order, shape-specific 07/09, command chính xác và claim hard/soft enforcement.
- Bump 4.0.0 cùng changelog schema và ConformanceMatrix.

**Out of scope**

- Không thêm shape, dashboard, deployment service hoặc marketing claim chưa qua B10a.
- Không sửa behavior code ngoài repair bắt buộc để verification xanh.

## 3. Checklist

- [ ] Không còn ready-to-build được định nghĩa là docs tồn tại.
- [ ] Các docs chỉ claim V3 feature khi B8/B9/B10 verification đã pass.
- [ ] README/quickstart giải thích ranh giới docs-emitted, plan-validated, executing và soft/hard.
- [ ] Taxonomy/README templates/golden có 09 và không command ảo.
- [ ] Versioning 4.0.0 và ConformanceMatrix cập nhật cùng commit.

## 4. Interfaces / Files expected to change

- [MODIFY] toàn bộ file liệt kê ở V3-ExecutionExpansionPlan phần Cập nhật tài liệu đi kèm.
- [MODIFY] Design/Content/doc-templates, golden-example-*/docs, generated AGENTS sample.
- [MODIFY] package/version metadata nếu repo version được phát hành cùng mốc.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Docs hứa tính năng chưa code | Cao | B10a evidence + status matrix là source cho wording. |
| Golden/template drift | TB | Regen + artifact test, không sửa output rời rạc. |
| Bump major thiếu adapter note | Cao | Checklist Versioning + ConformanceMatrix cùng commit. |

## 6. Verification plan

- npm test && npm run typecheck && npm run lint && npm run build
- Link check/read-through: docs tree cho web/mobile/cli có 07 đúng shape, 08 và 09 đúng thứ tự.
- Compare public README/quickstart/ConformanceMatrix với B10a evidence; không có claim vượt evidence.

## 7. Status

WAITING_FOR_APPROVAL
