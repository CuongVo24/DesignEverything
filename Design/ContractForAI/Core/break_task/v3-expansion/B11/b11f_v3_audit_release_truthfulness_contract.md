# Contract — B11f V3 audit and release truthfulness

> Tầng: QA/Process. Nguồn: V3 Post-implementation Review F11-06, D40. Phụ thuộc: B11a–B11e.

## 1. Micro-task target

Đồng bộ trạng thái/docs/claim V3 với evidence audit được, để không đánh dấu DONE hay quảng bá newbie completion khi raw findings và replay chưa tồn tại.

## 2. Scope

**In scope**

- Tạo raw evidence đã ẩn danh cho mỗi pilot: participant alias, harness/version, project fixture, start/end, task attempts, intervention, command/evidence artifact path và consent note; không lưu PII hay transcript đầy đủ không cần thiết.
- Chuyển `v3-evaluation-report.md` thành report dẫn link tới raw evidence/replay và ghi rõ `not run`/limitation thay vì tự diễn giải metric chưa có nguồn.
- Đồng bộ status B7–B10 README, B10a/B10b, V3 plan, MasterRoadMap, Versioning/ConformanceMatrix/README/quickstart theo evidence thật; contract chưa verified không được `DONE`.
- Thêm release gate kiểm toàn bộ public claim “hard enforcement”, “Codex support” và “newbie completes” có corresponding contract/evidence.
- Lưu regression report B11 về bypass/folder-trống để reviewer tái chạy.

**Out of scope**

- Không bịa thêm participant, metric hay lịch sử để làm report đẹp.
- Không mở external beta hay thu PII; pilot mới cần consent riêng.

## 3. Checklist

- [ ] Mỗi metric trong report có raw row/artifact hoặc ghi `not measured`; raw finding không chứa tên, email, token, command output secret.
- [ ] README v3 không còn mọi dòng `WAITING_FOR_APPROVAL` khi contract thực sự DONE, và không có `DONE` nào thiếu verification evidence.
- [ ] Public docs hạ claim hard/soft đúng adapter coverage; Codex chưa có B12b thì không claim Codex support.
- [ ] `release-truthfulness` test/check script fail khi claim không có evidence id hoặc status dependency chưa DONE.
- [ ] Reviewer mới có thể mở report, tái chạy B11 regression và kết luận cùng trạng thái mà không cần chat history.

## 4. Interfaces / Files expected to change

- [NEW] `Design/RoadMap/evidence/v3-pilot-raw.md`, ≤160 dòng: anonymized structured rows + artifact references.
- [MODIFY] `Design/RoadMap/v3-evaluation-report.md`, ≤180 dòng: method, raw links, limitations and metrics provenance.
- [MODIFY] `Design/ContractForAI/Core/v3-expansion/README.md` và B10 contracts, ≤100 dòng: truthful status only.
- [MODIFY] `Design/RoadMap/V3-ExecutionExpansionPlan.md`, `MasterRoadMap.md`, `DecisionLog.md`, `README.md`, Versioning/ConformanceMatrix/quickstart surfaces found by audit, ≤120 dòng/file.
- [NEW] `scripts/check-release-truthfulness.mjs` và test, ≤200 dòng each: claim/evidence/status audit.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Audit biến thành paperwork không giúp product | TB | Chỉ giữ evidence trả lời direct claim; replay command một bước. |
| Vô tình công bố dữ liệu pilot nhạy cảm | Cao | Alias, redaction checklist, artifact local/hash; review trước commit. |
| Docs cũ còn overclaim ở nơi không biết | TB | `rg` audit phrase list + conformance/quickstart checklist. |

## 6. Verification plan

- `node scripts/check-release-truthfulness.mjs`
- `npm test && npm run typecheck && npm run lint && npm run build`
- Manual review: trace 3 metric từ report → raw finding → runner artifact; run B11 regression commands from a clean fixture and compare recorded result.

## 7. Status

WAITING_FOR_APPROVAL
