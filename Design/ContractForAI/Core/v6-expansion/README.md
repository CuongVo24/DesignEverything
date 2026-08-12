# Contracts — V6 Detailed Design (target 8.0.0)

> Nguồn: [V6-DetailedDesignPlan](V6-DetailedDesignPlan.md) (TaskBrief của lane, theo ngoại lệ expansion [CONTRACT_STRUCTURE_RULE](../../CONTRACT_STRUCTURE_RULE.md) §0), đề xuất D49–D52, và bộ chuẩn bị brownfield [prep-brownfield/](prep-brownfield/00-problem-statement.md).
> **Lane CHƯA mở — nhưng nội dung code đã DONE từ 2026-07-21 (xem §Đối chiếu 2026-08-10 bên dưới).**
> Điều kiện mở nguyên bản: ReleaseReadinessPlan đóng nợ (RB-05 e2e, RB-06b, RB-08) + pilot B18a xong +
> D49–D52 được duyệt vào DecisionLog. Trạng thái các điều kiện tại 2026-08-10: RB-05 DONE; RB-06b DONE
> (xác minh lại 2026-08-10); RB-08 IN_PROGRESS (3/5 mục máy kiểm xanh, còn quickstart walkthrough +
> xác nhận dòng ConformanceMatrix — không chặn, xem RB-08 note ở `ReleaseReadinessPlan.md`); pilot B18a
> — **gỡ khỏi điều kiện mở lane này** theo D57 (`DecisionLog.md`) vì pilot kiểm chứng cơ chế
> feature-journey (V3/V5), không phải nội dung deepen tier-2 của lane này; D49–D52 — **đã duyệt**
> (xem `DecisionLog.md`).
> **8.0.0 là MAJOR bump riêng của lane này** (đổi cây output `docs/design/`, breaking với adapter/validator cũ) — không chung version với `v1-fix-bugs` (giữ 7.0.0, xem [v7-release-note.md](../../../RoadMap/v7-release-note.md)). Đánh số lại 2026-08-01 vì D48 và 7.0.0 đã bị `v1-fix-bugs` chiếm trước.

## Bản đồ thực thi

| Batch | Contract | Tầng | Phụ thuộc | Trạng thái (đối chiếu 2026-08-10) |
|---|---|---|---|---|
| B19a | [tier2_taxonomy_lock](B19/b19a_tier2_taxonomy_lock_contract.md) | Nội dung | Gate mở lane | DONE |
| B19b | [deepening_interview_script](B19/b19b_deepening_interview_script_contract.md) | Nội dung | B19a | DONE |
| B20a | [deepen_state_and_gate](B20/b20a_deepen_state_and_gate_contract.md) | Lõi | B19b | DONE |
| B20b | [emit_tier2_render](B20/b20b_emit_tier2_render_contract.md) | Lõi | B20a | DONE |
| B21a | [adapter_deepen_workflow](B21/b21a_adapter_deepen_workflow_contract.md) | Adapter | B20b | DONE |
| B21b | [golden_corpus_eval](B21/b21b_golden_corpus_eval_contract.md) | QA | B21a | DONE (nhận xét tay đóng 2026-08-10) |

Thứ tự bắt buộc: `B19a → B19b → B20a → B20b → B21a → B21b` — nội dung khoá trước lõi, lõi trước adapter.

## Đối chiếu 2026-08-10 — bảng trên đã lỗi thời, code thật đã DONE từ 2026-07-21

**Phát hiện:** cả 6 contract dưới đây đã tự ghi `## 7. Status: DONE (2026-07-21)` kèm đầy đủ kết quả
verify (số test pass, lint/build sạch, smoke tay) **ngay trong chính file contract** — nhưng bảng
"Trạng thái" phía trên chưa bao giờ được cập nhật theo, và header của file này vẫn ghi "Lane CHƯA mở".
Đây đúng là loại drift mà `MasterSequencingPlan.md` gọi là "note cũ lỗi thời" — chỉ khác là lần này nó
xảy ra ở lane này, không phải v1-fix-bugs.

**Đã xác minh lại trên HEAD hiện tại (không tin nguyên văn §7, chạy thật):**

```
npx vitest run deepenState loadDeepenScript slugify emitTier2 renderTier2 \
  deepenLifecycle test/e2e/deepen-flow test/eval/tier2-golden-corpus
→ 8 test file, 80 test, tất cả pass

npm run build:bundle && npx vitest run installed-runtime/deepen-fixture
→ 3 test, pass (seam thật: cài vào temp target, spawn cli.mjs đã cài, opt-in → next → commit → emit)
```

`deepen` cũng đã được wire vào dispatcher production
(`src/adapters/shared/cliOperations.ts:3,62` → `handleDeepen`) — ghi chú "CLI `deepen` chưa được wire"
trong B21a đề 2026-07-25 cũng đã lỗi thời.

**Trạng thái thật từng contract (đối chiếu §3 checklist ↔ code, không chỉ tin §7):**

| Contract | Trạng thái thật | Còn thiếu |
|---|---|---|
| B19a — tier2 taxonomy lock | ĐÃ XONG | Không |
| B19b — deepening interview script | ĐÃ XONG | Không |
| B20a — deepen state + gate | ĐÃ XONG | Không |
| B20b — emit tier2 render | ĐÃ XONG | Không |
| B21a — adapter deepen workflow | ĐÃ XONG | Không (wiring + skill + card mềm đều có, test e2e xanh) |
| B21b — golden corpus eval | ĐÃ XONG (2026-08-10) | Nhận xét tay ≥5 khối đã điền, 5/5 đạt rubric B19a. Người review là Claude (agent phiên này), không phải reviewer người độc lập thứ hai — ghi rõ để không lẫn với chuẩn B5c/R14 (đọc thêm ở §7 của contract). Đồng thời sửa 1 bug thật: test eval trước đây tự xoá nhận xét tay về placeholder mỗi lần `npm test` chạy lại — đã sửa để giữ nguyên. |

**Kết luận cho Gate B3 (`MasterSequencingPlan.md`):** không phải "thực thi B19a→B21b" — toàn bộ code đã
chạy xanh trên HEAD. Việc còn lại trước khi cắt 8.0.0 chỉ là: (1) điền nhận xét tay B21b — **đã xong**,
(2) cập nhật bảng "Trạng thái" phía trên từ `WAITING_FOR_APPROVAL` → `DONE` — **đã xong**, (3) đưa
`D49–D52` vào `DecisionLog.md` với ngày duyệt thật — **đã xong**. Lane sẵn sàng cắt 8.0.0.

## Kỷ luật lane

- **Opt-in tuyệt đối (D49):** người không gọi deepen không thấy gì thay đổi; golden test tầng 1 không đổi output.
- **Kênh riêng, không đụng tầng 1 (review 2026-07-19):** câu DS* ở `deepen-script.yaml` + commit qua `commitDeepenAnswer` riêng; KHÔNG sửa `script.yaml`/`gate-policy.yaml`, KHÔNG gate PreToolUse — enforcement là fail-closed trong core + CLI. Đơn vị answered là question-instance `{module, question_id, subject_id}` (mỗi Must / mỗi quyết định một bộ câu).
- **Module độc lập, fail-closed cục bộ (D50):** 4 module đóng cho 8.0.0 (`glossary`, `feature-spec`, `adr`, `test-strategy`); module mở dở dang chỉ chặn emit của chính nó.
- **Grounding bắt buộc (D51):** renderer đọc answers + docs tầng 1 đã emit; câu deepen chỉ bù phần thiếu; câu không truy được nguồn → gắn cờ, không bịa.
- **Golden corpus là thước (D52):** eval so bản sinh với cây `Design/` viết tay của DesignEverything; đây cũng là cổng vào brownfield.
- **Brownfield (phần b) KHÔNG có contract trong lane này** — chỉ có bộ chuẩn bị tại [prep-brownfield/](prep-brownfield/00-problem-statement.md); mở lane riêng khi đủ điều kiện ghi ở [03-risks-open-questions](prep-brownfield/03-risks-open-questions.md).
