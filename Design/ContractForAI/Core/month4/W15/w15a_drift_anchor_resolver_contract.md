# Contract — W15A Drift v0: parser anchor + resolve `src=file::symbol` + git blame SHA

> **Tầng:** Lõi. Nguồn: [Week-15](../../../../RoadMap/Month4/Week-15.md) + [AnchorFormat](../../../../Core/AnchorFormat.md) + [Schemas](../../../../Core/Schemas/) + [TechStack](../../../../Conventions/TechStack.md). Phụ thuộc: không (độc lập W13/W14, có thể chạy song song).

## 1. Micro-task target
Lớp **đọc** của Drift Flagging v0: parse mọi anchor `<!-- anchor: id=… src=path::symbol rev=<sha> status=… -->` trong một cây docs, và với mỗi anchor resolve được **SHA git blame hiện tại** của symbol đó. Chỉ đọc + chuẩn hoá dữ liệu; **chưa** so sánh, **chưa** báo cáo (đó là [W15B](w15b_drift_compare_report_cli_contract.md)).

## 2. Scope
**In scope** — một module lõi mới + test:
- `parseAnchors(markdown: string): Anchor[]` — regex theo [AnchorFormat](../../../../Core/AnchorFormat.md), trả `{ id, srcFile, symbol, rev, status }`; bỏ qua dòng không phải anchor.
- `resolveCurrentRev(srcFile: string, symbol: string, repoRoot: string): string | null` — chạy `git blame` (hoặc `git log -1` theo dòng symbol) lấy SHA chạm symbol gần nhất; trả `null` nếu file/symbol không tồn tại (KHÔNG throw — đầu vào planned có thể chưa có code).
- Gom: `collectAnchors(docsDir, repoRoot): ResolvedAnchor[]` = anchor + `currentRev: string | null`.

**Out of scope**
- KHÔNG so `rev` cũ vs mới, KHÔNG sinh báo cáo, KHÔNG CLI (W15B).
- KHÔNG đụng `emit.ts`/taxonomy.
- KHÔNG xử lý `status=live` đặc biệt — v0 chỉ resolve, phân loại để W15B.

## 3. Checklist
- [ ] `parseAnchors` lấy đúng 5 field, chịu được anchor `rev=` rỗng (scaffolding planned).
- [ ] `resolveCurrentRev` trả `null` an toàn khi file/symbol chưa tồn tại (không crash).
- [ ] `collectAnchors` đọc đệ quy cây docs, gắn `currentRev`.
- [ ] Test: cây docs giả lập (≥2 anchor) + repo fixture có git → đúng SHA; ca file thiếu → `null`.

## 4. Interfaces / Files expected to change
- `[NEW]` `src/core/drift/anchors.ts` (~120 dòng): `Anchor`, `ResolvedAnchor`, `parseAnchors`, `resolveCurrentRev`, `collectAnchors`.
- `[NEW]` `src/core/drift/anchors.test.ts` (~80 dòng): fixture trong scratch/tmp với git init, assert SHA + null path.
- `[MODIFY]` `src/core/index.ts`: export module drift nếu index re-export theo convention hiện có.

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| `git blame` không deterministic trên CI | TB | Test tạo repo fixture cô lập (git init + commit), không dựa repo thật. |
| Symbol resolve sai dòng | TB | v0 chấp nhận độ chính xác file-level nếu symbol không định vị được; ghi giới hạn này (chuyển W15B báo cáo). |
| Throw khi planned chưa có code | Cao | Hợp đồng: trả `null`, không throw; test khẳng định. |

## 6. Verification plan
- `npx vitest run drift` — parse + resolve + collect xanh, gồm ca `null`.
- `npm run typecheck && npm run lint` — sạch.
- `npm test` — toàn bộ xanh, không phá test cũ.

## 7. Status
`WAITING_FOR_APPROVAL`
