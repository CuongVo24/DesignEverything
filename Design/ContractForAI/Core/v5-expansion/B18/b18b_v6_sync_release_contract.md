# Contract — B18b V6 sync & release truthfulness

> Tầng: QA/Process. Nguồn: V5-ContractSynthesisPlan B18b, D47 (gate claim), Versioning. Phụ thuộc: B18a.

## 1. Micro-task target

Đồng bộ toàn bộ tài liệu công khai với hành vi đã code/test của lane V5, bump 6.0.0, và chỉ mở claim "hỗ trợ build tới sản phẩm" khi B18a có artifact + pilot audit được.

## 2. Scope

**In scope**

- Cập nhật taxonomy (`contracts/`, `docs/conventions/`, phase `reviewing`), schemas, `Core/Contract.md`, `ConformanceMatrix.md`, `Versioning.md`, README, quickstart để khớp code V5.
- Golden example: thêm ≥1 feature-contract mẫu + review pass cho một shape, chấm theo QualityRubric.
- Version bump 6.0.0 + changelog; ghi rõ V5 nối sau V4/5.0.0, không dùng tên lane lách SemVer (D35 precedent).
- Rà claim: chỉ nêu phần đã code/test; câu "build tới sản phẩm" gắn điều kiện pilot B18a.
- Cập nhật trạng thái D41–D47 trong DecisionLog nếu có điều chỉnh khi implement.

**Out of scope**

- Không thêm tính năng mới; batch này chỉ đồng bộ + release.
- Không mở claim vượt dữ liệu pilot.

## 3. Checklist

- [ ] Mọi file public khớp hành vi code (không claim phần chưa có).
- [ ] Golden example mới chấm đạt QualityRubric; regression test xanh.
- [ ] Version 6.0.0 + changelog + ConformanceMatrix/Versioning đồng bộ.
- [ ] README/quickstart mô tả vòng feature-contract + review đúng năng lực từng harness.
- [ ] Claim "build tới sản phẩm" chỉ mở khi B18a artifact có mặt và audit được.

## 4. Interfaces / Files expected to change

- [MODIFY] `README.md`, `docs/quickstart.md`, ≤160 dòng/file.
- [MODIFY] `Design/Content/taxonomy.md`, `Design/Core/Contract.md`, `Design/Core/Versioning.md`, `Design/Adapters/ConformanceMatrix.md`, ≤120 dòng/file.
- [NEW] golden feature-contract mẫu dưới `Design/Content/golden-example-*/`, ≤200 dòng/file.
- [MODIFY] `package.json` (version 6.0.0), `Design/DecisionLog.md` (điều chỉnh nếu có), ≤60 dòng/file.
- [NEW/MODIFY] regression test cho golden feature-contract, ≤200 dòng/file.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Docs claim vượt code | Cao | B18b là gate bắt buộc rà từng claim so với test; giống B10b/B15b. |
| Bump version sai SemVer | TB | Theo Versioning: public schema/taxonomy đổi = MAJOR 6.0.0. |
| Golden feature-contract kém chất lượng | TB | Chấm QualityRubric trước khi làm fixture. |

## 6. Verification plan

- `npm test` (toàn bộ, gồm golden + replay V5)
- `npm run typecheck && npm run lint && npm run build`
- Rà thủ công: README/quickstart/taxonomy/Contract/ConformanceMatrix/Versioning ↔ hành vi code; xác nhận claim gắn đúng điều kiện pilot.

## 7. Status

IN_PROGRESS

> Đã có: taxonomy thêm `contracts/`, `contracts/break/`, `docs/conventions/`, phase `reviewing`; SKILL docs cập nhật; package.json ở 6.0.0. **Chưa đóng**: release gate 6.0.0 bị chặn bởi B18a (pilot người chưa chạy) — không claim "6.0.0 phát hành" hay "hỗ trợ build tới sản phẩm" cho tới khi pilot có artifact. Golden feature-contract mẫu + changelog cuối cùng làm cùng lúc mở release.
