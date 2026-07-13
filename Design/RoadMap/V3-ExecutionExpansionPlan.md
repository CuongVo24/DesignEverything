# V3 Execution Expansion — Từ spec đẹp tới build có bằng chứng

> Lane V3 này mở rộng phần 08-build-plan đã có trong worktree. Vì 3.0.0 đã thay đổi taxonomy, các thay đổi mới tiếp tục đổi state, gate và taxonomy sẽ phát hành ở mốc 4.0.0. Tên lane không đồng nghĩa version phát hành.

## Tại sao cần file này
Smoke run yt-cli cho thấy phỏng vấn và 08-build-plan tạo được spec tốt, nhưng chưa đưa người mới qua được đoạn nguy hiểm nhất: từ milestone đầu tiên tới code chạy, test, sửa lỗi và tiếp tục được. Nếu chỉ thêm chữ vào build plan, model vẫn phải tự đoán môi trường, file cần sửa, lệnh kiểm chứng và lúc nào nên dừng.

## Mục tiêu sản phẩm
Sau V3 Execution Expansion, DesignEverything phải phân biệt rõ ba cấp:

1. docs-emitted: bộ docs đã được sinh, chưa được coi là đủ tốt để code.
2. plan-validated: spec, rủi ro, truy vết và task đầu tiên đã qua kiểm tra.
3. executing: agent chỉ được làm một task nhỏ đang mở, lưu evidence sau mỗi task rồi mới mở task kế.

Đây là hệ điều hành thực thi tối giản cho một người mới, không phải một swarm agent hay công cụ quản lý dự án enterprise.

## Quyết định đã khoá

| Quyết định | Ý nghĩa |
|---|---|
| D29 | ready-to-build không còn đồng nghĩa file docs tồn tại; phải có semantic validation và risk acknowledgement. |
| D30 | Một execution plan máy đọc được + evidence log là nguồn sự thật khi build; không dùng nhiều agent để sinh code. |
| D31 | Gate mở theo task/milestone và bằng chứng, không mở toàn bộ codebase sau emit. |
| D32 | Rủi ro và feasibility spike phải đi trước kiến trúc/implementation khi có dependency ngoài, platform, compliance, chi phí hoặc giả định chưa kiểm chứng. |
| D33 | deep/fast đổi mức giải thích, không đổi kỷ luật validation, task và evidence. |
| D34 | Chỉ claim hỗ trợ newbie sau khi có evaluation journey thật, không chỉ unit/golden test. |
| D35 | Taxonomy thêm 09-execution-plan và thư mục runtime .design-everything là MAJOR, phát hành 4.0.0. |

## Phạm vi

**In scope**

- Semantic validator có rule xác định được: đúng shape, không lệnh ảo, Must-to-flow-to-task traceability, Won't không bị kéo vào MVP, risk chưa rõ phải lộ diện.
- Một câu/flow risk discovery tối giản và feasibility spike có thể chặn triển khai mù.
- 09-execution-plan.md cho người đọc và .design-everything/execution-plan.json + execution-state.json cho runtime.
- State machine, policy và adapter workflow cho task nhỏ, verify, repair, evidence, resume.
- Evaluation thực nghiệm của transcript, adapter và journey newbie.

**Out of scope**

- Không tự deploy, thanh toán, publish, hoặc ghi commit thay người dùng mà không được cho phép.
- Không tạo agent mới, multi-agent generation, dashboard, issue tracker hay ticket enterprise.
- Không mở ADR/test-plan enterprise; 09 là hướng dẫn thực thi MVP, không thay D17.
- Không hứa enforcement cứng ở harness chỉ đọc rules.

## Batch và phụ thuộc

| Batch | Tầng | Contract | Kết quả |
|---|---|---|---|
| B7a | Lõi | b7a_semantic_plan_validator | Validation result có mã lỗi, traceability và gate plan-validated. |
| B7b | Nội dung | b7b_risk_discovery_execution_template | Risk discovery, default first-environment, template 09. |
| B8a | Lõi | b8a_execution_state_evidence_gate | State/evidence schema và gate task-level. |
| B8b | Lõi | b8b_execution_plan_emitter | Emit 09 + JSON task graph, không lệnh/file ảo. |
| B9a | Adapter | b9a_claude_build_orchestrator | Slash workflow build, preflight, verify, repair, resume. |
| B9b | Adapter | b9b_rules_only_execution_protocol | Rules-only protocol trung thực về soft enforcement. |
| B10a | QA | b10a_newbie_journey_evaluation | Evaluation transcript, semantic mutation và journey thật. |
| B10b | QA/Process | b10b_v3_sync_release | Golden, docs, matrix, version 4.0.0 và release truthfulness. |

Thứ tự bắt buộc:

    B7a ─┬─ B7b ─┬─ B8a ─ B8b ─ B9a ─ B10a ─ B10b
          │       └────────────── B9b ────────┘
          └─ semantic contract phải khoá trước content và runtime

## Definition of Done cho mốc 4.0.0

- Không workspace nào chuyển sang executing chỉ vì có các file docs mang đúng tên.
- Mỗi task active có phạm vi file, precondition, lệnh verify, expected result, và evidence record.
- Task feasibility cho dependency rủi ro chạy trước task implementation liên quan.
- Harness A chặn deterministic các đường dẫn/hành động ngoài task đang mở; harness B nêu rõ giới hạn và theo cùng protocol.
- Evaluation chứng minh validator bắt được spec sai có chủ ý và ít nhất một người mới hoàn thành M0 trong journey quan sát được.
- README, quickstart, taxonomy, schema, Contract, ConformanceMatrix và versioning chỉ claim những phần đã được code/test.

## Cập nhật tài liệu đi kèm
Roadmap này là nguồn cho D29-D35, v3-expansion contracts, ProductPRD, Core Contract, taxonomy, state/gate schemas, TestStrategy, Glossary, MasterRoadMap, ConformanceMatrix, Versioning, README và quickstart. B10b là gate bắt buộc để kiểm tra các file đó trước release.
