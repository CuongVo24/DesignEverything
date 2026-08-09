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
- [DONE] (Wave A1) src/core/emit.ts — `withSourceNote` + `collectDecisions` reuse gắn `> Nguồn:` thật cho từng artifact có `recipe_ids`.
- [DONE] (Wave A1) src/core/emitTransactionValidate.ts — nâng `derived-recipe-provenance-missing` lên `error`; thêm nhánh JSON structural check chạy `runDerivedRecipe` thật cho `execution-plan.json`.
- [DONE] (Wave A1) src/core/schemas/executionPlan.ts, src/core/synthesizeExecutionPlan.ts — `source_refs` additive trên risk/task, chỉ điền khi thật sự dẫn xuất từ câu trả lời.
- [DONE] (Wave A1) src/core/ackCapability.ts, ackCapabilityStore.ts, ackCapabilityVerify.ts, schemas/ackCapability.ts — capability token thật cho `needs_user_ack`.
- [DONE] (Wave A1) src/core/interviewApplicationServices.ts, src/adapters/shared/cliOps/commit.ts, commandSurface.ts — `--ack-warnings` boolean thay bằng `--ack-token` capability thật.
- [DONE] (Wave A1) src/core/emitTier1.ts — dọn dead code `appendWarningAcknowledgement`; thêm cleanup staging directory trên mọi nhánh deny/allow.

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

Spec: APPROVED | Implementation: IMPLEMENTED | Proof: UNIT_ONLY

Cập nhật 2026-07-30 (P2.5 vocabulary sync, không phải implementation): sửa từ vocabulary cũ đã bỏ
(`IMPLEMENTED_WAITING_FOR_REVIEW`) về đúng 3 trục — Implementation hạ từ ngụ ý "đã xong" xuống
`PARTIAL` để khớp README.md. Cập nhật 2026-08-01: production `emitTier1` đã tải
`derived-recipes.yaml` và truyền recipes vào `validateStagedEmit`; recipe asset thiếu/corrupt fail
closed trước activation.

Cập nhật 2026-08-03 (A1-P6): thêm phần "user-visible artifact" của U06/X23 —
`.design-everything/emit-warning-acknowledgements.json` (append-only, best-effort) giờ ghi lại mọi
batch cảnh báo `derived-recipe-provenance-missing` mỗi lần một generation có cảnh báo đó được
activate (`emitTier1.ts`, `appendWarningAcknowledgement`). U06/X23 vẫn `PARTIAL`: phần "acknowledgement
capability" (chặn activation cho tới khi có ack tường minh, giống `needs_user_ack`/`ackWarnings` của
commit) **cố ý chưa làm** trong đợt này — thử nghiệm một bản chặn cứng cho thấy nó phá ~11 test có sẵn
trong `test/integration/cli-protocol.test.ts` (thuộc B4c) vốn dùng chung fixture
`seedEmitReadyWorkspace` để test hành vi validate/build/next/start hoàn toàn không liên quan tới
provenance. `plan-v1-fix.md` P7 (B3d/B3e) đã tự khai "một application service tier-1 duy nhất... require
acknowledgement cho blocking warning" — đây là chỗ đúng để dựng gate cứng cùng lúc với sửa mọi
fixture gọi `emit`, không phải một patch hẹp ở đây. Xem `emitTier1.ts`'s comment tại
`appendWarningAcknowledgement` cho chi tiết đầy đủ.

**Cập nhật 2026-08-09 (Wave A1, đóng Implementation) —** cả hai phần còn treo ở trên đã đóng, theo
đúng lộ trình mà chính mục này tự vạch (gate cứng cùng lúc với sửa fixture, dùng application service
tier-1 duy nhất):

- **Provenance production fix** (`codex/a1-02-provenance-renderer`, merge `6833c27`): renderer
  `emit.ts` giờ gắn `> Nguồn: <qid>` thật cho từng mục nội dung có câu trả lời thật (tái dùng
  `collectDecisions()` của `renderDecisionLog.ts` làm nguồn sự thật duy nhất cho map slot→câu hỏi,
  chỉ gắn nguồn khi câu hỏi *thật sự* được trả lời — không gắn nhầm vào text fallback mặc định của
  S8 khi người dùng bỏ qua). `emitTransactionValidate.ts` nâng `derived-recipe-provenance-missing`
  từ `warning` lên `error`, và thêm nhánh kiểm cấu trúc JSON riêng cho `execution-plan.json` chạy
  thật `runDerivedRecipe` (trước đó hàm này có 0 caller production). 10 test mới (8 trong
  `emit.test.ts`, 2 trong `emitTransactionValidate.test.ts`) xác nhận từng artifact được catalog gắn
  `recipe_ids` đều có trích dẫn thật, và xóa một nguồn (S8) khiến mục đó rơi về fallback không trích
  dẫn — đúng yêu cầu ở §6 "Xóa một nguồn bắt recipe fail/unknown, không silently invent".
- **Acknowledgement capability** (`codex/a1-01-ack-capability` `21a1ffa`,
  `codex/a1-03-core-gate` `eb78e20`, `codex/a1-03b-commit-ack-wiring` `04428ce`): capability token
  thật (`src/core/ackCapability*.ts`, mirror `turnCapability.ts` — token_hash-only storage, verify
  nhiều tầng, single-use qua tạo file độc quyền) thay cho boolean `ackWarnings`/`--ack-warnings`.
  Áp dụng cho đúng lớp warning chủ quan/overridable (`needs_user_ack` ở `commit`), KHÔNG áp cho
  provenance — provenance là deterministic reject theo QualityRubric §G, không phải thứ cần ack (xem
  `b3b-g0-interface-note.md` §0, viết trước khi bắt đầu Wave A1 để khóa ranh giới này). `emitTier1.ts`
  dọn `appendWarningAcknowledgement` (đã trở thành dead code vì provenance giờ luôn `error`, không
  bao giờ còn là warning để ghi log) và thêm cleanup thư mục staging bị bỏ quên trên mọi nhánh
  deny/allow. `--ack-warnings` đổi thành `--ack-token` xuyên suốt CLI/SKILL.md; 10 test mới trong
  `interviewApplicationServices.test.ts` xác nhận issue/consume/single-use/replay/forged/content-đổi
  đều đúng qua đường production thật.
- Không sửa production template nào để né warning (điều kiện tự đặt ở `b3b-g0-interface-note.md`
  §6): mọi fixture test đã hoàn tất câu hỏi (S0–S8, C1–C5/W1–W5/M1–M5) tự nhiên sinh trích dẫn đúng,
  không cần cờ opt-out nào — xác nhận qua toàn bộ suite (`npm test`) không tăng số test fail ngoài
  20 ca `dist/bundle` staleness môi trường cục bộ, không liên quan.
- `npm test`: 939/989 pass (tăng từ baseline trước Wave A1). `npm run lint` / `npm run typecheck:all`:
  sạch trên mọi commit của wave.

Proof vẫn `UNIT_ONLY` — chưa có seam evidence installed-runtime/target-local (Gate A2, chưa chạy).
