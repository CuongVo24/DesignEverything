# V6 Detailed Design — Từ bộ nền 12 file tới bộ thiết kế chi tiết (target 7.0.0)

> **Ngày lập:** 2026-07-19. **Nguồn thượng nguồn:** [FirstIdea.md](../../../../FirstIdea.md) §3/§12, [taxonomy-decision.md](../../../RoadMap/Month3/taxonomy-decision.md) (căn cứ D17), D41–D47 trong [DecisionLog](../../../DecisionLog.md), [ReleaseReadinessPlan](../../../RoadMap/ReleaseReadinessPlan.md).
> **Vai trò file này:** TaskBrief nguồn cho lane `Core/v6-expansion` theo ngoại lệ expansion của [CONTRACT_STRUCTURE_RULE](../../CONTRACT_STRUCTURE_RULE.md) §0. Contract trong lane chỉ được thực thi sau khi các quyết định D48–D51 dưới đây được chủ repo duyệt và ghi vào DecisionLog.

## Tại sao cần file này

Tầng 1 (12 file `docs/`) giải bài toán "nói rõ dự án là gì trước khi code". Nhưng bằng chứng mạnh nhất của phương pháp lại là **bộ thiết kế chi tiết** kiểu cây `Design/` của chính DesignEverything — PRD, glossary, ADR, feature spec, test strategy, contract lane — thứ đã thực sự lái toàn bộ quá trình build repo này bằng executor yếu. V6 sản phẩm hoá tầng đó cho dự án greenfield của người dùng (**phần a**), và chuẩn bị nền tri thức cho dự án đã có code như ReportSupport, Univillage (**phần b — chỉ chuẩn bị**, xem [prep-brownfield/](prep-brownfield/00-problem-statement.md), KHÔNG có contract thực thi trong lane này).

## Mục tiêu sản phẩm (đo được)

1. Sau khi tầng 1 emit + confirm, người dùng **opt-in** được từng module thiết kế chi tiết (`deepen`); mỗi module hỏi thêm 2–4 câu và sinh file dưới `docs/design/`.
2. Mỗi file tầng 2 giữ đúng DNA sản phẩm: có mục "Tại sao cần file này", có anchor truy vết, không mâu thuẫn với tầng 1 (consistency pass bắt được).
3. Chất lượng đo bằng **golden corpus**: bản sinh cho chính DesignEverything phủ ≥ ngưỡng cấu trúc (B21b định nghĩa) so với cây `Design/` viết tay.
4. Người không opt-in **không thấy gì thay đổi** — taxonomy mặc định giữ nguyên từng byte.

## Nguyên tắc cầm lái

1. **Mở rộng D17, không đảo.** D17 hoãn taxonomy nâng cao vì gánh nhận thức cho người mới — vẫn đúng. Tầng 2 là opt-in, và từng nhóm tài liệu gắn với đúng điều kiện kích hoạt đã ghi ở taxonomy-decision §3 (ADR ↔ 2+ dev; test strategy ↔ CI/CD; contract lane ↔ multi-agent) hoặc opt-in tường minh.
2. **Không hỏi lại cái đã trả lời.** Renderer tầng 2 tái dùng nguồn đã parse (`parseDataModel`, `parseFlows`, `extractMustFeatures`, conventions lock); câu deepen chỉ hỏi cái CHƯA có trong answers tầng 1.
3. **Fail-closed theo module.** Module đã mở phải trả lời đủ mới emit module đó; module chưa mở không chặn gì cả. Thiếu tín hiệu không bao giờ thành tín hiệu tốt.
4. **Lõi béo, adapter gầy giữ nguyên.** Toàn bộ logic deepen nằm ở `src/core` + `Design/Content`; adapter chỉ thêm INJECT (câu hỏi), GATE (module dở dang), EMIT (đúng cây).
5. **Chất lượng không dựa vào generator** (kế thừa D47): ba lưới — grounding tầng 1 đã khoá + template/rubric tầng 2 + eval golden corpus.

## Cơ chế đã khoá sau review mở lane (2026-07-19)

Review chỉ ra bản contract đầu không chạy được trên runtime hiện hành. Các quyết định cơ chế sau được khoá và đã sửa vào từng contract:

1. **Kênh deepen tách hẳn tầng 1.** Câu DS* nằm ở file MỚI `deepen-script.yaml` (B19b); commit đi qua `commitDeepenAnswer` riêng (B20a) — vì `commitStep` chọn câu chỉ theo branch/depends_on và CLI từ chối commit khi tầng 1 đã xong. `script.yaml` không đổi một byte.
2. **Không dùng gate PreToolUse cho deepen.** Gate schema hiện hành hard-block Write/Edit/Bash cho mọi gate được khai — trái bất biến "module dở chỉ chặn emit của chính nó". Enforcement = fail-closed trong core (`canEmitModule`/`emitTier2`) + exit ≠ 0 ở CLI + card mềm. `gate-policy.yaml` không đổi.
3. **Question-instance model.** Đơn vị answered là `{module, question_id, subject_id}` — DS2 hỏi riêng từng Must, DS3 riêng từng quyết định; completeness và emit tính theo instance (B20a/B20b).
4. **Emit là transaction.** Render thuần → consistency check → chỉ khi sạch lỗi mới ghi file + cập nhật state (all-or-nothing theo module, manifest artifact trong state) (B20b).
5. **Slug một nguồn.** `src/core/slugify.ts` trích từ `synthesizeExecutionPlan` (byte-identical), khoá luật collision/slug rỗng; renderer tầng 2 import chung (B20a/B20b).
6. **Grammar SourceRef đóng** (B19a) + **eval 5 số liệu, ngưỡng và `ref-sha` freeze trước khi đo** — khôi phục hallucinated-rationale = 0, thêm unknown-rate ≤30% và substance floor chống output rỗng (B21b).

## Quyết định cần khoá (đề xuất D48–D51 — CHƯA ghi DecisionLog, chờ duyệt)

| ID đề xuất | Quyết định | Lý do |
|---|---|---|
| D48 | Tầng 2 "Detailed Design" là **opt-in progressive deepening** dưới `docs/design/`; taxonomy mặc định không đổi. Mỗi nhóm tài liệu bind vào điều kiện kích hoạt taxonomy-decision §3 hoặc opt-in tường minh. **MAJOR bump 7.0.0** theo Impact Assessment §4 của chính taxonomy-decision. | Giữ lời hứa đơn giản cho người mới (D17) mà vẫn mở đường cho người cần sâu; đổi cây đầu ra là breaking với adapter/validator cũ. |
| D49 | Deepen chia **module độc lập, idempotent**: `glossary`, `feature-spec`, `adr`, `test-strategy` (danh sách đóng cho 7.0.0). Emit một module chỉ khi module đó answered đủ; không module nào chặn tầng 1 hay build skeleton. | Người dùng đào sâu đúng chỗ đau, không bị ép nuốt cả cây; fail-closed cục bộ thay vì chặn toàn cục. |
| D50 | Câu hỏi deepen **không trùng lặp answers tầng 1**: renderer bắt buộc đọc từ docs tầng 1 đã emit + answers cũ, câu mới chỉ bù phần thiếu (edge case, phương án đã loại, tiêu chí chấp nhận, nỗi sợ hỏng). | "Phỏng vấn, không sinh template trống" — nhưng cũng không tra tấn người dùng bằng câu đã hỏi. |
| D51 | Bộ `Design/` viết tay của DesignEverything (và ReportSupport, Univillage khi tiếp cận được) là **golden corpus**: thước đo chất lượng tầng 2 và điều kiện tiên quyết mở lane brownfield (phần b). | Có ground truth thật do chính phương pháp tạo ra — lợi thế đánh giá mà tool sinh doc generic không có. |

## Phạm vi

**In scope (phần a):** taxonomy tầng 2 + template + rubric; kịch bản phỏng vấn deepen; state/gate theo module; renderer + emit `docs/design/`; adapter workflow `deepen` (Claude + Codex); eval golden corpus.

**Out of scope:** brownfield ingestion (chỉ prep docs, mở lane riêng sau); drift/maintain engine (FirstIdea §12 — chưa tới); thay đổi taxonomy mặc định tầng 1; nới lỏng bất kỳ gate V3 nào; UI/dashboard.

## Batch và phụ thuộc

| Batch | Contract | Tầng | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| B19a | [tier2_taxonomy_lock](B19/b19a_tier2_taxonomy_lock_contract.md) | Nội dung | Gate mở lane (dưới) | WAITING_FOR_APPROVAL |
| B19b | [deepening_interview_script](B19/b19b_deepening_interview_script_contract.md) | Nội dung | B19a | WAITING_FOR_APPROVAL |
| B20a | [deepen_state_and_gate](B20/b20a_deepen_state_and_gate_contract.md) | Lõi | B19b | WAITING_FOR_APPROVAL |
| B20b | [emit_tier2_render](B20/b20b_emit_tier2_render_contract.md) | Lõi | B20a | WAITING_FOR_APPROVAL |
| B21a | [adapter_deepen_workflow](B21/b21a_adapter_deepen_workflow_contract.md) | Adapter | B20b | WAITING_FOR_APPROVAL |
| B21b | [golden_corpus_eval](B21/b21b_golden_corpus_eval_contract.md) | QA | B21a | WAITING_FOR_APPROVAL |

Thứ tự bắt buộc `B19a → B19b → B20a → B20b → B21a → B21b`: nội dung khoá trước lõi, lõi trước adapter — đúng luật "no locked Core, no adapter code".

**Gate mở lane (điều kiện tiên quyết, không thương lượng):**
1. ReleaseReadinessPlan đóng phần còn nợ: e2e skeleton→feature (RB-05), RB-06b installer, RB-08 docs.
2. Pilot người thật B18a chạy xong và feedback được tổng hợp — taxonomy tầng 2 phải được định hình bởi nhu cầu thật, không chỉ bởi cây Design/ của chính mình.

## Sizing

Mỗi contract một tầng, hand-authored ≤ ~200 dòng thay đổi/file theo CONTRACT_STRUCTURE_RULE §4. B20b nhiều renderer — được phép tách `-a/-b` theo D42 khi thực thi, mỗi mảnh vẫn đủ 7 mục.

## Definition of Done cho mốc 7.0.0

- [ ] E2e greenfield: phỏng vấn tầng 1 → emit → opt-in 2 module deepen → `docs/design/` sinh đúng, consistency pass xanh, gate module dở dang hoạt động.
- [ ] Người không opt-in: bộ golden test tầng 1 hiện có không đổi một byte output nào.
- [ ] Eval B21b đạt ngưỡng cấu trúc trên golden corpus DesignEverything; báo cáo lưu `Design/RoadMap/evidence/`.
- [ ] `npm run build && npm run lint && npm test` xanh; version-sync xanh; ConformanceMatrix + README + quickstart cập nhật; ghi chú migration cho MAJOR bump.
- [ ] D48–D51 ghi vào DecisionLog với trạng thái Active.

## Rủi ro lane

| Rủi ro | Mức | Giảm thiểu |
|---|---:|---|
| Tầng 2 phá lời hứa "đơn giản cho người mới" | Cao | Opt-in cứng; card next-step không bao giờ tự đề xuất deepen khi user chưa hỏi; đo bằng pilot. |
| Renderer sinh văn mẫu rỗng (template-filling trá hình) | Cao | D50 ép grounding từ answers/docs thật; rubric B19a có mục "câu nào không truy được nguồn → gắn cờ"; eval B21b đếm. |
| Phình bảo trì template × shape | TB | Danh sách module đóng (D49); shape variant chỉ khi golden corpus chứng minh cần. |
| Trùng lặp/mâu thuẫn với tầng 1 | TB | Consistency pass mở rộng bắt mâu thuẫn scope/data-model; anchor nối tầng 2 về tầng 1. |
| Lane mở quá sớm, đè lên release readiness | Cao | Gate mở lane ghi rõ ở trên; mọi contract giữ WAITING_FOR_APPROVAL tới khi gate qua. |

## Cập nhật tài liệu đi kèm (khi lane chạy)

- DecisionLog: ghi D48–D51 khi duyệt.
- `Design/Content/taxonomy.md`: thêm pointer sang `taxonomy-tier2.md` (không sửa cây mặc định).
- `Design/Adapters/ConformanceMatrix.md`: thêm cột năng lực `deepen` cho từng harness.
- `README.md` + `docs/quickstart.md`: mục "Đào sâu thiết kế (tuỳ chọn)".
- `Design/RoadMap/MasterRoadMap.md`: mốc 7.0.0.
