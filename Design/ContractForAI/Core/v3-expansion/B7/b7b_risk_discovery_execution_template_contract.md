# Contract — B7b Risk discovery + 09-execution-plan content

> Tầng: Nội dung. Nguồn: V3-ExecutionExpansionPlan B7b, D32, D33, D35. Phụ thuộc: B7a semantic rules đã khoá.

## 1. Micro-task target
Thêm một discovery tối giản về bất định và template execution để spec không biến giả định kỹ thuật, platform hoặc compliance thành fact trước khi đã kiểm chứng.

## 2. Scope

**In scope**

- Thêm một câu anchored R1 sau khi chọn shape: external dependency, tài khoản/API, dữ liệu nhạy cảm, chi phí, quyền, điều khoản, platform và điều chưa biết; đích là 09-execution-plan.md.
- R1 phải cho phép trả lời không biết; agent phân loại confirmed/assumption/spike-required thay vì tự điền câu trả lời.
- Template 09 có: first supported environment, risk register, feasibility spikes, task cards, acceptance/evidence và resume rules.
- Sửa smart defaults có xu hướng phình MVP: ưu tiên một môi trường người tạo dùng và chỉ mở đa nền tảng khi có lý do/acceptance riêng.
- Deep giải thích tác động và cách kiểm chứng; fast vẫn phải hỏi/ghi R1 và chạy cùng gate.

**Out of scope**

- Không yêu cầu người dùng hiểu luật hay tự viết risk register.
- Không đưa tư vấn pháp lý, không kết luận một integration là hợp lệ/không hợp lệ.
- Không thêm ADR/test-plan enterprise.

## 3. Checklist

- [x] R1 có kind anchored, target 09-execution-plan.md và được map vào script/schema/taxonomy.
- [x] Mỗi risk có owner, impact, status confirmed/assumption/spike-required và exit criterion.
- [x] Mọi dependency ngoài có spike trước task implementation nếu status chưa confirmed.
- [x] C4 và default tương đương ở shape khác không mặc định cross-platform hoặc production distribution.
- [x] 09 giải thích cho newbie vì sao task nhỏ, evidence và first environment giúp giảm rủi ro.

## 4. Interfaces / Files expected to change

- [MODIFY] Design/Content/interview-script/script.yaml và S0-S6-core.md: R1, thứ tự và translate-back.
- [NEW] Design/Content/doc-templates/09-execution-plan.md, khoảng 90 dòng.
- [MODIFY] Design/Content/taxonomy.md, interview-script README, QualityRubric.md.
- [MODIFY] Design/Content/interview-script/C-cli.md, W-web.md, M-mobile.md: default first-environment và shape traps.
- [NEW] golden fixtures cho 09 trong mỗi shape, cập nhật sau B8b.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Thêm câu làm interview dài và nặng | TB | Một câu gom nhóm, agent tự chuẩn hoá, chỉ đào sâu khi có spike-required. |
| Agent trình bày assumption như fact | Cao | Trạng thái bắt buộc trong slot/template và validator B7a chặn risk unresolved. |
| Bẫy YouTube/API/Store bị diễn giải như tư vấn pháp lý | Cao | Chỉ yêu cầu xác minh điều khoản/khả thi; không đưa kết luận pháp lý. |

## 6. Verification plan

- npm test sau khi B8b regen golden.
- Review transcript cho web, mobile, cli: câu trả lời không biết vẫn tạo được R1 hợp lệ; cross-platform không tự xuất hiện không có lý do.
- Đối chiếu 09 với QualityRubric và B7a traceability rules.

## 7. Status
DONE
