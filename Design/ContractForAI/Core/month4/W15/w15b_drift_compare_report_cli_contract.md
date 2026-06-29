# Contract — W15B Drift v0: so `rev` ↔ SHA hiện tại → báo cáo flag + CLI

> **Tầng:** Lõi/Adapter. Nguồn: [Week-15](../../../../RoadMap/Month4/Week-15.md) + [AnchorFormat](../../../../Core/AnchorFormat.md) + nguyên tắc "thà gắn cờ nghi ngờ, không âm thầm bảo chứng" ([README](../../../../../README.md)). Phụ thuộc: [W15A](w15a_drift_anchor_resolver_contract.md) `DONE`.

## 1. Micro-task target
Lớp **phán & báo** của Drift Flagging v0: so `rev` đã ghi trong anchor với `currentRev` (từ W15A) → gắn cờ "doc có thể cũ", và xuất báo cáo + CLI chạy thủ công. **Chỉ flag, KHÔNG fix** (Drift Fixing ngoài v0).

## 2. Scope
**In scope:**
- `compareDrift(resolved: ResolvedAnchor[]): DriftFinding[]` — phân loại mỗi anchor: `stale` (rev ≠ currentRev), `ok` (khớp), `unresolved` (currentRev null / status=planned chưa có code), `unanchored-source` (có code nhưng rev rỗng). Mặc định nghiêng về flag khi mơ hồ.
- `formatDriftReport(findings): string` — báo cáo markdown: nhóm theo loại, liệt kê file doc + symbol + rev cũ/mới, "xem lại file nào trước".
- CLI entry chạy thủ công (vd `src/cli/drift.ts`, `node dist/cli/drift.js <docsDir>`); in báo cáo, exit code 0 (flag không phải lỗi build ở v0).
- Ghi rõ giới hạn v0: false-positive nào chấp nhận (planned, file-level resolve), false-negative nào chưa xử lý.

**Out of scope**
- KHÔNG Drift Fixing (LLM sửa doc).
- KHÔNG gắn vào CI/hook tự động (v0 chạy thủ công; trigger CI là quyết định Month sau, xem open question RoadMap).
- KHÔNG đổi anchor đã gieo trong golden.

## 3. Checklist
- [ ] `compareDrift` phân 4 loại đúng, nghiêng flag khi mơ hồ (không âm thầm bảo chứng).
- [ ] Báo cáo nêu rõ file cần xem trước + rev cũ→mới.
- [ ] CLI chạy được trên cây docs thật trong repo (golden/dogfood), in báo cáo, exit 0.
- [ ] Có ví dụ mini báo cáo lưu lại để dùng trong README/pitch ([W14B](../W14/w14b_competitor_positioning_landing_contract.md)).
- [ ] Giới hạn v0 viết trung thực.

## 4. Interfaces / Files expected to change
- `[NEW]` `src/core/drift/compare.ts` (~100 dòng): `DriftFinding`, `compareDrift`, `formatDriftReport`.
- `[NEW]` `src/core/drift/compare.test.ts` (~70 dòng): ca stale/ok/unresolved/unanchored.
- `[NEW]` `src/cli/drift.ts` (~40 dòng): đọc argv docsDir, gọi collect→compare→format, in ra.
- `[NEW]` `Design/RoadMap/Month4/drift-v0-sample-report.md`: báo cáo mẫu + ghi chú giới hạn v0.
- `[MODIFY]` `package.json` scripts (vd `"drift": "node dist/cli/drift.js"`) nếu hợp convention.

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Nhảy sớm sang Drift Fixing | Cao | Scope cấm; chỉ flag; nghiệm thu kiểm "không lấn fixing". |
| Quá nhiều false positive làm báo cáo vô dụng | TB | Tách `unresolved` (planned) khỏi `stale` thật để người đọc lọc nhanh. |
| Tự tin quá mức kết quả flag | TB | Báo cáo dùng từ "có thể cũ", không phán "sai"; ghi giới hạn. |

## 6. Verification plan
- `npx vitest run drift` — compare + format + 4 ca phân loại xanh.
- `npm run build && node dist/cli/drift.js Design/Content/golden-example-mobile/docs` — in báo cáo thật (golden có anchor `status=planned` → phần lớn `unresolved`, đúng kỳ vọng).
- `npm test` toàn bộ xanh; báo cáo mẫu đã lưu.

## 7. Status
`WAITING_FOR_APPROVAL`
