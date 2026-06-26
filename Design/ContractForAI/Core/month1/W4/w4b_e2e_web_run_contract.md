# Contract — W4B Chạy thử web end-to-end

> **Tầng:** Adapter/integration. Nguồn: [Week-04](../../../../RoadMap/Month1/Week-04.md) + golden-web (W1C) + 3 hook (W3) + EMIT (W4A).

## 1. Micro-task target
Chạy trọn một phiên Claude Code theo nhánh web (S0→W5) trên một dự án giả, sinh đúng cây `docs/` web, gate chặn trước và mở sau — đóng mốc "Bản chạy được".

## 2. Scope
**In scope**
- Kịch bản tích hợp ráp `sessionStart` → `userPromptSubmit` (rate-limit+inject) → skill `commitStep` → `emit` → `preToolUse` (gate).
- Chạy trên dự án giả của golden-web; đối chiếu output `docs/` với golden-web.
- Chứng minh: trước khi đủ `00/01/02`, một thao tác `Write src/*`/`Bash build` bị `deny`; sau khi đủ doc → `allow`.
- Ghi lại màn chạy mẫu: input chính, gate chặn ở đâu, mở ở đâu, output cuối.

**Out of scope**
- Nhánh mobile (Month 2). Ca biên xấu (W4C). Đẹp cho người lạ (Month 4).

## 3. Checklist
- [ ] Phiên web chạy trọn từ phỏng vấn đến emit docs.
- [ ] Output `docs/` khớp golden-web (diff chấp nhận được).
- [ ] Gate chặn code trước khi đủ doc, mở sau.
- [ ] Có bản ghi màn chạy mẫu (input → gate → output).

## 4. Interfaces / Files expected to change
- `[NEW]` `test/e2e/web-flow.test.ts` (hoặc script tích hợp tương đương)
- `[NEW]` `docs/RUN-web-sample.md` ghi màn chạy mẫu (hoặc trong runbook W4C)

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Phụ thuộc đúng một transcript "ngoan" | Cao | W4C bổ sung ca xấu; W4B chỉ cần đường chuẩn chạy được. |
| Emit lệch golden | TB | So từng file với golden-web; sửa EMIT/template nếu lệch. |

## 6. Verification plan
- Phiên web hoàn tất; `docs/` so khớp golden-web.
- `PreToolUse` deny→allow đúng quanh mốc đủ doc.

## 7. Status
`WAITING_FOR_APPROVAL`
