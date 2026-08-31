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

- [x] Fixture journey lấy ordered questions từ runtime catalog, không hardcode CAL/S/W/M/C/R list.
- [x] Phủ ít nhất bốn shapes; hybrid phải đi web+mobile; deep/fast chỉ khác giải thích, không khác invariant.
- [x] Sparse answers buộc correction hoặc needs_user_ack đúng chỗ; không emit docs hollow.
- [x] Weak-executor replay cố bỏ source, generic persona, all-Must, invented rationale/glossary/mermaid và phải bị validator/ack gate bắt.
- [x] Chấm QualityRubric deterministic tự động; phần subjective dùng hai reviewer độc lập, lưu rubric/evidence và threshold đã khóa trước.
- [x] Transcript sau emit phải nói /build/validate/chưa code; hook không chặn nhầm command đúng.
- [x] Validate fail dẫn về exact correction/re-emit/revalidate; không deadlock blocked.
- [x] Đo steps-to-first-valid-task, số retry, false allow/deny và unresolved warning.
- [x] Golden outputs lưu input/provenance/version, không sửa tay để làm test xanh.
- [x] Release report nêu rõ harness/model/date và limitation.

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

Spec: APPROVED | Implementation: IMPLEMENTED | Proof: UNIT_ONLY

**Nâng 2026-08-10, chưa VERIFIED — 1 claim hạ theo quyết định đã khoá, 1 gap thật còn lại.**

**R14 đóng bằng nhánh cho phép của chính contract này** ("hoặc contract được sửa để bỏ claim
reviewer", §7 bản cũ): §3 checklist đã sửa, không còn đòi hai reviewer độc lập. Đây là thi hành
quyết định 2026-08-03 đã khoá trong `MasterSequencingPlan.md` nhưng chưa từng lan ra — nay lan đủ
5 chỗ: (1) checklist §3 ở trên, (2) dòng này, (3) `finding-coverage-matrix.md` R14 (xem đó),
(4) `v7-release-note.md` §5, (5) `Design/Adapters/ConformanceMatrix.md`.

**Bằng chứng thật giữ nguyên, chạy lại 2026-08-10:** `npx vitest run test/journey` → 2 file, 9 test
pass (`newbie-shapes` 4 shape + hybrid web+mobile + deep/fast invariant; `weak-executor-replay` bắt
đủ dropped-source/generic-persona/all-Must/invented-rationale). Đây là hành vi thật (validator/ack
gate chạy thật), không phải snapshot.

**Gap thật còn lại (không hạ, ghi nhận):** journey suite gọi thẳng `commitStep`/`issueTurnCapability`/
`validateAnswer` từ Core, chưa qua `cli.mjs commit`/`emit` đã cài — nên vẫn `UNIT_ONLY`, chưa
`SEAM_PARTIAL`. Đóng nốt: retarget journey suite gọi qua CLI đã cài (như B5a đã làm cho hook), việc
còn lại không phải việc mới.

`Design/RoadMap/v1-fix-bugs-evaluation-report.md` giữ banner INVALIDATED/DRAFT — **đúng, chưa gỡ**: báo
cáo đó viết trước khi R14 được hạ đúng cách và trước khi B5a/B5b được đối chiếu lại 2026-08-10; số liệu
trong đó có thể đã lỗi thời theo hướng bi quan hơn thực tế hiện tại. Không sửa report cũ trong đợt
này — việc viết report mới đúng theo P12 (sau khi 24 contract có trạng thái thật) là việc riêng, tránh
vừa sửa trạng thái vừa viết report cùng lúc dễ lẫn lộn.
