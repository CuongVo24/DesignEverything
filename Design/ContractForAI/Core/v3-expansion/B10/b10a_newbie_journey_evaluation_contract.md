# Contract — B10a Newbie journey evaluation và semantic mutation suite

> Tầng: QA. Nguồn: V3-ExecutionExpansionPlan B10a, D34. Phụ thuộc: B9a, B9b.

## 1. Micro-task target
Chứng minh bằng journey và failure cases rằng V3 giúp người mới đi từ folder rỗng tới task đầu tiên có evidence; không suy luận điều đó từ unit test/golden structure.

## 2. Scope

**In scope**

- Corpus transcript greenfield đa shape, gồm câu trả lời không biết và dependency rủi ro.
- Semantic mutation fixtures: missing trace, wrong 07, stale README, cross-platform không căn cứ, phantom command, Won't leak, unresolved risk.
- Adapter E2E dùng artifact/runtime thật trong temporary workspace.
- Journey rubric: user hiểu active task, biết preflight làm gì, thấy expected result, xử lý fail theo repair, và không tự nhảy task.
- Pilot với người chưa quen quy trình; ghi thời gian, điểm kẹt, số cần can thiệp và evidence thay vì claim marketing.

**Out of scope**

- Không benchmark năng lực tuyệt đối của một model.
- Không dùng LLM judge không có rubric/evidence làm điều kiện pass duy nhất.

## 3. Checklist

- [x] Mỗi validator error code có một mutation fail xanh.
- [x] Có ít nhất web/mobile/cli transcript và một case external dependency.
- [x] Claude E2E chứng minh deny/allow task path, verify fail, repair và resume.
- [x] Rules-only smoke ghi đúng self-reported limitation.
- [x] Pilot rubric, raw findings và quyết định follow-up được versioned trong Design/RoadMap.

## 4. Interfaces / Files expected to change

- [x] test/e2e/execution-flow.test.ts và edge cases, khoảng 200 dòng mỗi file tối đa.
- [x] test/fixtures/execution/ và test/fixtures/plan-validation/.
- [x] Design/RoadMap/v3-evaluation-report.md và raw anonymized findings.
- [x] Design/Conventions/TestStrategy.md và QualityRubric.md.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Fixture tự viết quá sạch | Cao | Dùng transcript thật đã ẩn danh, seed mutation và pilot ngoài tác giả. |
| Judge LLM hợp thức hoá output sai | Cao | Deterministic checks là gate; rubric manual/LLM chỉ bổ sung, phải cite evidence. |
| Pilot ít người dẫn tới kết luận quá mức | TB | Báo cỡ mẫu và limitation, không nâng claim khi chưa đủ evidence. |

## 6. Verification plan

- npm test
- npx vitest run execution-flow plan-validation
- Review report có raw counts, rubric, limitation, links tới evidence và action list trước B10b.

## 7. Status

DONE
