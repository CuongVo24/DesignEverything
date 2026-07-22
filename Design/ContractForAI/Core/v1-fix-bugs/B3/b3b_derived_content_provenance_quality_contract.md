# B3b — Content quality and derived provenance contract

## 1. Micro-task target

Khóa tiêu chí answer và nội dung dẫn xuất để docs không rỗng ruột, mọi build-plan/rationale/glossary/diagram truy được nguồn và cảnh báo chủ quan được người dùng thấy.

## 2. Scope

### In scope

- answer_contract cụ thể trong script content.
- Derived recipes, source coverage và unknown policy.
- QualityRubric runtime mapping và acknowledgement prompts.

### Out of scope

- Validator implementation; thuộc B3a.
- Emit filesystem transaction; thuộc B3d.
- Chấm điểm bằng model thứ hai hoặc dịch vụ ngoài.

## 3. Implementation checklist

- [ ] CAL0 chỉ chấp nhận deep/fast; S0 phải có statement meaningful sau trim, không phải placeholder.
- [ ] S2 yêu cầu ít nhất một persona cụ thể + job-to-be-done; “ai cũng dùng/người dùng phổ thông” phải needs_user_ack.
- [ ] S3 yêu cầu Must có ít nhất một mục, không overlap Should/Could/Won't, mỗi tier/item có rationale; mọi-Must phải cảnh báo.
- [ ] S4 entity phải map ít nhất một Must; S5 có start→finish và map Must #1; S6 có team/deadline/budget hoặc explicit unknown.
- [ ] S8/R1 phải phân loại sensitivity/scale/dependency/risk thành confirmed, assumption hoặc spike-required.
- [ ] W/M/C rules bắt shape-specific contradictions và critic acknowledgement, gồm offline/sync, store, platform/distribution.
- [ ] Tạo derived recipes cho build-plan, architecture rationale, README glossary, mermaid và execution plan; mỗi output slot khai source question/doc ids và coverage rule.
- [ ] Mọi assertion không có source được ghi unknown/assumption, không viết như fact.
- [ ] Mermaid phải parse được, node/flow map nguồn; glossary term map entity/persona/domain source.
- [ ] QualityRubric phân rõ deterministic reject và human acknowledgement; executor/LLM không tự xác nhận thay user.

## 4. Interfaces / Files expected to change

- [MODIFY] Design/Content/interview-script/script.yaml — khai answer_contract.
- [MODIFY] Design/Content/interview-script/deepen-script.yaml nếu tier-2 dùng cùng quality rule.
- [NEW] Design/Content/interview-script/derived-recipes.yaml.
- [MODIFY] Design/Content/QualityRubric.md.
- [MODIFY] Design/Content/interview-script/S0-S6-core.md và các W/M/C content files.
- [MODIFY] doc-templates liên quan provenance/source refs.
- [NEW] test/fixtures/content-quality/ hợp lệ và phản ví dụ.

## 5. Risks & mitigations

- Rule tiếng Việt/Anh lệch: ưu tiên structure/source mapping; generic phrase list chỉ warning, không là semantic judge duy nhất.
- Recipe biến thành prompt mơ hồ: mỗi recipe có input schema, output schema, coverage và fallback unknown.
- Interview dài: chỉ hỏi lại khi invalid; warning gom thành một acknowledgement rõ ở đúng điểm critic.

## 6. Verification plan

- Fixture reject/ack cho persona “ai cũng dùng”, Must rỗng/mọi-Must, entity không phục vụ scope, flow không kết thúc.
- Mỗi derived slot có source refs hợp lệ và digest khớp answer revisions.
- Xóa một nguồn bắt recipe fail/unknown, không silently invent.
- Golden web/mobile/CLI/hybrid được chấm tự động phần deterministic và review theo rubric phần subjective.
- Executor yếu fixture vẫn không thể emit assertion thiếu provenance như confirmed fact.

## 7. Status

WAITING_FOR_APPROVAL
