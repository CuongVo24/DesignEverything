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

- [x] S0 phải có statement meaningful sau trim, không phải placeholder (`min_trimmed_chars` + `S0_GENERIC_PITCH` warning trong script.yaml).
- [x] S2 yêu cầu ít nhất một persona cụ thể + job-to-be-done; "ai cũng dùng/người dùng phổ thông" phải needs_user_ack (`S2_GENERIC_PERSONA`).
- [x] S3 yêu cầu Must có ít nhất một mục (pattern `must`); mọi-Must (`S3_EVERYTHING_IS_MUST`) và thiếu Won't (`S3_MISSING_WONT`) phải cảnh báo needs_user_ack.
- [x] S4/S5/S6 có `answer_contract` tối thiểu (min_trimmed_chars); mapping ngữ nghĩa Must/entity/flow đầy đủ để lại cho rubric B (đã có) do không thể chấm generic bằng regex.
- [x] S8/R1 có `answer_contract`; R1 `required:false` vì câu hỏi tự cho phép "không biết". Phân loại confirmed/assumption/spike-required do recipe `execution-plan-risk-classification` sở hữu, không phải validator generic.
- [x] W5 (realtime), M2 (offline/sync), M5 (store), C5 (đa nền tảng/distribution) có `warning_rules` bắt shape-specific contradiction, cộng hưởng với `critics` đã có sẵn ở S3/W5/M5/C5.
- [x] Tạo `derived-recipes.yaml` cho build-plan, architecture rationale, README glossary, mermaid và execution-plan risk classification; mỗi recipe khai `inputs` (question/doc ids) và `coverage.rule`.
- [x] Mọi recipe có `unknown_policy: flag` + `fallback.on_missing_source` ghi `⚠ unknown — cần hỏi người`, không viết như fact.
- [x] Recipe mermaid có `validation.must_parse_as_mermaid` và `node_source_map`; recipe glossary map entity/persona/domain source qua `inputs`.
- [x] QualityRubric mục F/G phân rõ deterministic reject (mục A/B/C/D hiện có) và human acknowledgement (`warning_rules`); ghi rõ executor/LLM không tự xác nhận thay user.

Ghi chú phạm vi: `answer_contract.pattern` được khai báo declarative trong script.yaml nhưng validator hiện tại (B3a) mới enforce `required/min_trimmed_chars/warning_rules`; enforce đầy đủ `pattern/min_items/required_fields/enum_values` là phần còn lại của B3a, không phải B3b.

## 4. Interfaces / Files expected to change

- [DONE] Design/Content/interview-script/script.yaml — khai `answer_contract` cho S0–S6, S8, R1, W5, M2, M5, C5.
- [DONE] src/core/schemas/interviewScript.ts — thêm field `answer_contract` optional vào `questionSchema`.
- [DONE] Design/Core/Schemas/interview-script.md — tài liệu hoá field mới.
- [DONE] Design/Content/interview-script/derived-recipes.yaml — 5 recipe (build-plan, architecture-rationale, readme-glossary, mermaid-flow-diagram, execution-plan-risk-classification).
- [DONE] Design/Content/QualityRubric.md — thêm mục F (derived content provenance) và G (deterministic reject vs human ack).
- [DONE] src/core/contentQualityContract.test.ts — test script.yaml parse + derived-recipes shape + hành vi warning_rules cho S0/S2/S3/M2/M5/W5/C5.
- [DEFERRED] Design/Content/interview-script/deepen-script.yaml quality rule đồng bộ — để B3e vì gắn tier-2 lifecycle.
- [DEFERRED] test/fixtures/content-quality/ dạng file fixture riêng — coverage hiện nằm trong contentQualityContract.test.ts; tách fixture rời khi có nhiều golden example hơn.

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

IMPLEMENTED_WAITING_FOR_REVIEW
