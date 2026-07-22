# B5c — Newbie journey and weak-executor quality evaluation contract

## 1. Micro-task target

Chứng minh người mới đi hết interview → emit → /build validate mà không bị thông điệp sai, và output vẫn có chất lượng/truy vết khi executor yếu.

## 2. Scope

### In scope

- Journey web/mobile/CLI/hybrid, deep/fast.
- Sparse/generic answers, correction/acknowledgement và recovery.
- Deterministic rubric + blind human review cho phần subjective.

### Out of scope

- Benchmark model thương mại bắt buộc qua network ở mọi CI.
- Đánh giá code app sau ready-to-execute ngoài handoff task đầu.

## 3. Implementation checklist

- [ ] Fixture journey lấy ordered questions từ runtime catalog, không hardcode CAL/S/W/M/C/R list.
- [ ] Phủ ít nhất bốn shapes; hybrid phải đi web+mobile; deep/fast chỉ khác giải thích, không khác invariant.
- [ ] Sparse answers buộc correction hoặc needs_user_ack đúng chỗ; không emit docs hollow.
- [ ] Weak-executor replay cố bỏ source, generic persona, all-Must, invented rationale/glossary/mermaid và phải bị validator/ack gate bắt.
- [ ] Chấm QualityRubric deterministic tự động; phần subjective dùng hai reviewer độc lập, lưu rubric/evidence và threshold đã khóa trước.
- [ ] Transcript sau emit phải nói /build/validate/chưa code; hook không chặn nhầm command đúng.
- [ ] Validate fail dẫn về exact correction/re-emit/revalidate; không deadlock blocked.
- [ ] Đo steps-to-first-valid-task, số retry, false allow/deny và unresolved warning.
- [ ] Golden outputs lưu input/provenance/version, không sửa tay để làm test xanh.
- [ ] Release report nêu rõ harness/model/date và limitation.

## 4. Interfaces / Files expected to change

- [NEW] test/journey/newbie-shapes.test.ts.
- [NEW] test/journey/weak-executor-replay.test.ts.
- [NEW] test/fixtures/journeys/ theo catalog.
- [NEW] Design/RoadMap/v1-fix-bugs-evaluation-report.md.
- [MODIFY] Design/Content/QualityRubric.md phần release scoring.
- [MODIFY] golden fixtures hiện hành.

Expected commands:

- npx vitest run test/journey
- npx vitest run test/regression/run-dogfood.test.ts

## 5. Risks & mitigations

- Human score khó tái lập: rubric có anchors/example, blind review và lưu disagreement.
- Golden overfit: mutation/weak-executor fixtures chủ động phá semantics.
- Journey giả không phản ánh host: ít nhất một smoke run Claude Code thật cho release candidate, tách khỏi deterministic CI.

## 6. Verification plan

- 100% deterministic rejects/warnings đúng expected; không false pass cho hollow fixtures.
- Mọi output derived có source refs/digest và unknown đúng chính sách.
- Không transcript nào claim code-ready trước ready-to-execute.
- Reviewer threshold đạt cho từng file trọng yếu 00–06, build plan, execution plan và tier-2 sample.
- Report công khai cả fail/retry/limitation, không chỉ kết luận xanh.

## 7. Status

WAITING_FOR_APPROVAL
