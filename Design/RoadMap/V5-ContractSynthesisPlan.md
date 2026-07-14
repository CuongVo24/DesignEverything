# V5 Contract Synthesis — Từ walking skeleton tới feature có hợp đồng

> Target phát hành: **6.0.0**. Lane tên V5 nối tiếp V4/5.0.0; MAJOR vì thêm public contract schema, taxonomy runtime mới (`contracts/`, phase `reviewing`) và đổi bộ sinh task. Tên lane không đồng nghĩa version phát hành (tiền lệ D35/D40).

## Tại sao cần file này
V3/V4 đưa người mới an toàn qua **M0 → M3**: discovery → scaffold → walking skeleton → verify. Nhưng [`synthesizeExecutionPlan.ts`](../../src/core/synthesizeExecutionPlan.ts) hiện sinh **đúng 4 task cố định theo stack** (`recipe.tasks.T0..T3`), và mọi Must-have đều map về cùng bốn task đó qua `trace_links`. Nghĩa là skeleton **không build feature nào** — nó chỉ dựng shell chạy được rồi `npm test` xanh.

Hai dự án thật ([ReportSupporter](../../../ReportSupporter/Design/ContractForAI/) đi ~24 tuần `ContractForAI`, UniVillage đi sprint 3-6) cho thấy chặng "sau skeleton" mới là nơi sản phẩm thành hình, và nó sống được nhờ **một hợp đồng per-micro-task bám feature** — thứ tool chưa tự sinh. V5 sản phẩm hóa đúng chặng đó.

## Mục tiêu sản phẩm
Sau V5, một người mới đi từ folder trống phải hoàn thành được **ít nhất một feature Must có thật** (không chỉ skeleton), với vòng lặp:

`skeleton verified → sinh hợp đồng bám feature theo quy mô → làm một hợp đồng → evidence → review/break-task → đóng feature → feature kế`.

Đây vẫn là hệ điều hành thực thi tối giản cho một người, **không** phải multi-agent, dashboard hay issue tracker (giữ nguyên Non-goal D30/D31).

## Nguyên tắc cầm lái
- **Số hợp đồng theo quy mô dự án, không cố định.** Granularity suy ra từ `02-scope.md` (số Must) × độ phức tạp `03-data-model.md` (số entity/quan hệ) và `04-flows.md` (số bước). Dự án nhỏ ít hợp đồng, dự án lớn nhiều — deterministic, không phải số ma thuật.
- **Chia nhỏ là bạn.** Mỗi hợp đồng = một đơn vị triển khai được, hand-authored ≤ ~200 dòng/file ([VibeCode.md](../VibeCode.md) Step 3). Vượt ngưỡng → tự tách nhóm (`{feat}a`, `{feat}b`...), đúng tiền lệ W1a/W1b của ReportSupporter.
- **Chất lượng hợp đồng KHÔNG dựa vào bộ sinh.** Bản auto không thể hay bằng contract do người manager giỏi viết tay. Vì vậy chất lượng được ép bằng **ba lưới chồng nhau**, không bằng cách tin generator: (1) grounding vào docs đã khoá, (2) bind vào lớp Conventions cố định, (3) vòng review/break-task làm lưới an toàn cuối. Đây là câu trả lời cho "làm sao cải thiện chất lượng doc contract sinh ra": không cố làm generator hoàn hảo, mà bọc nó bằng ràng buộc và review.

## Quyết định cần khoá (nối tiếp D40)

| Quyết định | Ý nghĩa |
|---|---|
| **D41** | Sau M3-skeleton, mỗi Must-have trong `02-scope.md` sinh một **feature-milestone** (`M4-{feature}`…) với ≥1 hợp đồng-task **build feature đó thật**. Trace-link phải trỏ task build feature, validator từ chối link Must→skeleton. Đảo phần "mọi Must trỏ 4 skeleton" của bản V3. |
| **D42** | Số lượng và độ nhỏ của hợp đồng là **hàm deterministic của quy mô** (Must × entity × flow-step), không cố định; mỗi hợp đồng giữ một đơn vị triển khai ≤~200 dòng, vượt ngưỡng thì tự tách nhóm. |
| **D43** | Hợp đồng là **schema máy đọc** — 7 mục của [CONTRACT_STRUCTURE_RULE](../ContractForAI/CONTRACT_STRUCTURE_RULE.md) thành field (`micro_task`, `scope{in,out}`, `checklist[]`, `interfaces[]{path,change,signature,est_lines}`, `risks[]{risk,mitigation}`, `verification[]{command,expected}`, `status`). Tái dùng gate/evidence V3, không phải markdown tự do. |
| **D44** | Mỗi hợp đồng sinh ra **bind vào một lớp Conventions của dự án đích** (tech-stack pin, coding standard, test tiers, allowed-path discipline) do tool emit từ `05-architecture`/`06-constraints`. Hợp đồng **không được tự chế stack/dependency** ngoài Conventions — sản phẩm hóa luật "cấm import lậu" của [TechStack.md](../Conventions/TechStack.md). |
| **D45** | Thêm phase runtime **`reviewing`** giữa `verified` và feature kế: hợp đồng của một feature verify xong → manager-check sinh **break-task** (`fix_*`/`polish_*`) nếu output bẩn; feature **chưa "done"** tới khi review đóng. Fail-closed. Chống "done giả" — đúng bệnh `week{N}_break` của ReportSupporter. |
| **D46** | Vai **manager/executor** map vào `deep/fast` (bất biến D33): deep viết+review hợp đồng, fast thực thi. Không đổi kỷ luật validation/task/evidence. |
| **D47** | Claim "hỗ trợ build tới sản phẩm" chỉ mở sau **pilot đi hết ≥1 feature Must thật** trên nhiều quy mô, không chỉ M0 (mở rộng D34/D40). |

## Phạm vi

**In scope**
- Bộ sinh hợp đồng bám feature: đọc Must + data-model + flows → feature-milestones + hợp đồng-task với sizing theo quy mô và auto-split.
- Contract schema máy đọc (7 mục) + validator bám scope/flow/traceability.
- Emitter lớp Conventions cho dự án đích + validator bind (hợp đồng không tham chiếu stack/dep ngoài Conventions).
- Phase `reviewing` + cơ chế sinh break-task fail-closed + evidence cho vòng review.
- Adapter workflow (Claude/Codex) lái vòng feature-contract, công bố coverage trung thực.
- Evaluation journey newbie đi hết ≥1 feature trên ≥2 quy mô (nhỏ/vừa).

**Out of scope**
- Không multi-agent generation, swarm, dashboard, ticket enterprise (giữ D30).
- Không tự deploy/commit/publish/mua dịch vụ thay người dùng.
- Không hứa enforcement cứng ở harness chỉ đọc rules; Codex vẫn soft-gate, công bố rõ.
- Không dựng sẵn toàn bộ hợp đồng mọi feature từ đầu — mở just-in-time theo feature-milestone (như month2+ của ReportSupporter).

## Batch và phụ thuộc

| Batch | Tầng | Contract | Kết quả |
|---|---|---|---|
| B16a | Lõi | contract_schema_and_conventions_bind | Contract 7-field schema + Conventions emitter + bind validator. |
| B16b | Lõi | feature_contract_synthesis | Must+data-model+flows → feature-milestones + hợp đồng-task theo sizing, auto-split. |
| B17a | Lõi | review_break_task_state | Phase `reviewing`, break-task fail-closed, evidence vòng review. |
| B17b | Adapter | claude_codex_feature_workflow | Slash/skill lái vòng feature-contract, coverage trung thực 2 harness. |
| B18a | QA | feature_journey_evaluation | Pilot đi hết ≥1 Must feature end-to-end, trải ≥2 quy mô. |
| B18b | QA/Process | v6_sync_release | Golden, docs, taxonomy, schema, Contract, ConformanceMatrix, Versioning, README + bump 6.0.0. |

Thứ tự bắt buộc:

    B16a ─┬─ B16b ─ B17a ─ B17b ─ B18a ─ B18b
          └─ contract schema + Conventions bind phải khoá trước synthesis

## Sizing heuristic (chi tiết cho B16b)
Không cố định số hợp đồng. Bộ sinh chấm quy mô từ docs đã khoá:

- **Đếm Must** trong `02-scope.md` → mỗi Must ít nhất một feature-milestone.
- **Độ phức tạp dữ liệu**: số entity + quan hệ trong `03-data-model.md` mà Must chạm → Must chạm nhiều entity/quan hệ N-N thì tách thêm hợp đồng (model → logic → UI/route).
- **Độ dài flow**: số bước trong `04-flows.md` của Must → flow dài chia theo bước.
- **Trần độ nhỏ**: nếu một hợp đồng ước lượng > ~200 dòng hand-authored hoặc chạm > một tầng → tự tách nhóm.

Kết quả: dự án CLI nhỏ có thể chỉ 3-5 hợp đồng sau skeleton; app web có data-model rộng sinh hàng chục — **tỷ lệ thuận với quy mô, giải thích được, không phải số áng chừng.**

## Definition of Done cho mốc 6.0.0
- Không workspace nào coi một Must là "done" chỉ vì skeleton chạy; mỗi Must có ≥1 hợp đồng build thật, evidence pass và review đóng.
- Trace-link Must→task trỏ task build feature; validator từ chối link trỏ skeleton.
- Số/độ nhỏ hợp đồng thay đổi theo quy mô docs, kiểm được bằng test trên ≥2 quy mô fixture.
- Mọi hợp đồng bind Conventions; hợp đồng chế stack/dep ngoài Conventions bị validator chặn.
- Break-task tự sinh khi output feature bẩn; feature không "done" khi review chưa đóng (fail-closed).
- Harness A chặn deterministic ngoài task đang mở; B nêu rõ soft enforcement và theo cùng protocol.
- Evaluation chứng minh ≥1 người mới hoàn thành trọn một feature Must trong journey quan sát được, trên nhiều quy mô.
- README, quickstart, taxonomy, schema, Contract, ConformanceMatrix, Versioning chỉ claim phần đã code/test.

## Rủi ro lane
| Rủi ro | Giảm thiểu |
|---|---|
| Bùng nổ hợp đồng làm newbie ngợp | Chỉ sinh cho Must (Should/Could để lại); mở feature-milestone just-in-time, không dựng sẵn tất cả. |
| Chất lượng hợp đồng auto kém contract tay | Ba lưới D47: grounding docs + bind Conventions + review/break; không tin generator một mình. |
| Codex soft-gate trôi trên vòng feature dài | Giữ claim mạnh ở Claude; Codex công bố coverage như hiện tại, không hứa hard-enforce. |
| Sizing sai (quá nhỏ/quá to) | Trần ~200 dòng + một-tầng ép tách; test sizing trên fixture nhiều quy mô (B18a). |

## Cập nhật tài liệu đi kèm
Roadmap này là nguồn cho D41-D47, các contract v5-expansion, ProductPRD, Core Contract, taxonomy (thêm `contracts/`, phase `reviewing`), state/gate schemas, TestStrategy, Glossary, MasterRoadMap, ConformanceMatrix, Versioning, README và quickstart. B18b là gate bắt buộc kiểm các file đó trước release, và chỉ mở claim mới sau khi B18a có artifact + pilot audit được (D40).
