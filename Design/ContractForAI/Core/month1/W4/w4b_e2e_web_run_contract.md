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
- [x] Phiên web chạy trọn từ phỏng vấn đến emit docs.
- [x] Output `docs/` khớp golden-web (diff chấp nhận được).
- [x] Gate chặn code trước khi đủ doc, mở sau.
- [x] Có bản ghi màn chạy mẫu (input → gate → output).

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
`DONE`

### Quyết định thực tế & Nghiệm thu
- Đã cài đặt kịch bản kiểm thử tích hợp E2E tại **[web-flow.test.ts](file:///e:/DesignEverything/test/e2e/web-flow.test.ts)**:
  - Giả lập trọn vẹn chu kỳ phỏng vấn Web 12 lượt tương tác S0->S6->W1->W5 sử dụng hàm lõi `commitStep` và các hook adapter `onSessionStart`, `onUserPromptSubmit`, `onPreToolUse`.
  - Kiểm thử cơ chế chặn cứng gating: chặn `Write src/index.ts` và `Bash npm install` trước khi đủ tài liệu, đồng thời kiểm tra trả đúng tin nhắn từ gate `scope-locked`.
  - Tự động sinh cây 9 file tài liệu bằng `emitTree` sau khi hoàn tất phỏng vấn ở W5 và lưu xuống đĩa.
  - Xác thực việc tự động mở cổng chặn sau khi tài liệu đã sẵn sàng, cho phép ghi code ngoài docs và tự động append `scope-locked` vào `gates_passed`.
  - Kiểm thử ca rate limit của `onUserPromptSubmit` khi cố tình commit bypass.
- Đã lập tài liệu nhật ký chạy mẫu chi tiết tại **[RUN-web-sample.md](file:///e:/DesignEverything/docs/RUN-web-sample.md)** ghi nhận các bước input/output phỏng vấn, mốc chặn/mở gate và sơ đồ cấu trúc file tài liệu đầu ra.
- Toàn bộ 44 unit và integration tests đều hoàn thành xanh sạch 100%.
