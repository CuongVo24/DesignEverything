# Contract — B6b QA sweep + ConformanceMatrix + chốt Versioning 2.0.0

> **Tầng:** QA/Process. Nguồn: [V2-ExpansionPlan B6](../../../../RoadMap/V2-ExpansionPlan.md) + [Versioning §3](../../../../Core/Versioning.md) + [ConformanceMatrix](../../../../Adapters/ConformanceMatrix.md) + [Glossary](../../../../Glossary.md) + [Guideline](../../../../Guideline.md). Phụ thuộc: [B6a](b6a_skill_critic_calibrate_wiring_contract.md) + [B5c](../B5/b5c_golden_cli_regression_contract.md) `DONE`.

## 1. Micro-task target
Đóng mốc **v2.0.0** nhất quán: rà toàn `Design/` cho khớp v2, cập nhật `ConformanceMatrix` (đa-shape + critic), chốt `Versioning` 2.0.0 (từ trạng thái "spec khoá" → "phát hành"), đồng bộ `MasterRoadMap`. Đây là bước "một báo cáo đã nhất quán", không mở việc mới.

## 2. Scope
**In scope:**
- QA sweep: wording critic/shape đồng nhất giữa `Contract.md`/`claude-code.md`/`agents-md.md`/`ProductPRD.md`/`VibeCode.md`; `interview-script`/`state-schema` khớp `script.yaml`/`shapes.yaml`; từ vựng khớp `Glossary` (thêm "hình-hài dự án", "critic", "calibrate" nếu thiếu); reading order `Guideline`/`VibeCode` khớp file thực tế (kể cả `shapes.yaml`, `C-cli.md`, `07-distribution.md`, golden-cli).
- `ConformanceMatrix`: chuyển ghi chú v2 thành trạng thái thật (cli ✅ code; critic/calibrate ✅ ở Claude Code, mềm ở AGENTS.md); cập nhật hàng adapter.
- `Versioning`: dòng 2.0.0 chuyển sang **đã phát hành** + ghi adapter bị ảnh hưởng; changelog các schema (`interview-script`, `state`, `taxonomy`) ghi 2.0.0.
- `MasterRoadMap`: đánh dấu Phase 2 (v2) + trạng thái; ghi Month 4 (ship) hoãn post-v2 (D26).
- `AGENTS.sample.md` regen nếu generator đổi do shape/critic (drift guard test xanh).

**Out of scope**
- KHÔNG thêm shape/tính năng mới.
- KHÔNG đổi behavior code (chỉ doc/sync + regen artifact do đổi đã có).

## 3. Checklist
- [ ] Wording enforcement/critic/shape đồng nhất mọi file spec.
- [ ] Glossary có thuật ngữ mới; reading order khớp file thật.
- [ ] ConformanceMatrix phản ánh cli + critic + calibrate đúng bậc A/B.
- [ ] Versioning 2.0.0 phát hành + changelog schema; ConformanceMatrix cập nhật **cùng commit** (§3).
- [ ] MasterRoadMap phản ánh Phase 2 + Month 4 hoãn.
- [ ] `AGENTS.sample.md` khớp generator (drift guard xanh).
- [ ] Không link treo; mỗi file còn "## Tại sao cần file này".

## 4. Interfaces / Files expected to change
- `[MODIFY]` `Design/Adapters/ConformanceMatrix.md`, `Design/Core/Versioning.md`, `Design/Core/Schemas/*` (changelog), `Design/Glossary.md`, `Design/Guideline.md`, `Design/VibeCode.md`, `Design/RoadMap/MasterRoadMap.md`
- `[MODIFY]` `Design/Adapters/generated/AGENTS.sample.md` (nếu generator đổi)

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Bump 2.0.0 mà quên ConformanceMatrix (vi phạm §3) | Cao | Checklist ép cùng commit; review chéo. |
| Sync sót một file → drift v2 | TB | Sweep theo danh sách; `git grep` "web \| mobile" tìm chỗ còn ép enum. |
| AGENTS.sample drift đỏ | TB | Regen từ generator, không sửa tay (test artifact drift guard). |

## 6. Verification plan
- `npm test` — **toàn bộ xanh** gồm drift guard + golden cli/web/mobile.
- `npm run typecheck && npm run lint && npm run build` — sạch.
- Review thủ công: đọc Design/ không còn chỗ ép `web|mobile` cứng; ConformanceMatrix + Versioning 2.0.0 nhất quán; MasterRoadMap đúng trạng thái.

## 7. Status
`WAITING_FOR_APPROVAL`
