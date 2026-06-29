# Contract — W13D README + onboarding + đóng gói phân phối

> **Tầng:** Onboarding. Nguồn: [Week-13](../../../../RoadMap/Month4/Week-13.md) + [ConformanceMatrix](../../../../Adapters/ConformanceMatrix.md) + [RUNBOOK-web](../../../../../RUNBOOK-web.md) + [RUNBOOK-mobile](../../../../../RUNBOOK-mobile.md). Phụ thuộc: [W13A](w13a_carryover_anchor_prefix_flex_contract.md)+[W13B](w13b_carryover_hybrid_release_deploy_contract.md)+[W13C](w13c_carryover_traceability_closure_contract.md) `DONE` (đóng gói phải đứng trên lõi đã sạch).

## 1. Micro-task target
Biến bản hiện tại thành thứ **người lạ cài và chạy được trong vài phút** mà không cần lục `Design/`: README cài/chạy/ví dụ + quickstart onboarding 5 phút + checklist setup tái dùng, đã kiểm thử cài lại từ đầu trên máy/thư mục sạch.

## 2. Scope
**In scope** — tầng tài liệu/đóng gói:
- README sản phẩm: cài đặt, chạy, ví dụ tối thiểu cho **một** tuyến chính (reference path Claude Code) + nhắc tuyến rules-only (`AGENTS.md`).
- Quickstart 5 phút: đọc gì → cài gì → chạy demo nào → mong đợi output nào.
- Checklist setup (tái dùng cho người test W14A) + phần troubleshooting tối thiểu các lỗi setup hay gặp.
- Kiểm thử "clone/cài lại sạch": `npm ci && npm run build && npm test` từ trạng thái trắng.

**Out of scope**
- KHÔNG thêm năng lực lõi mới.
- KHÔNG viết landing/định vị (đó là [W14B](../W14/w14b_competitor_positioning_landing_contract.md)).
- KHÔNG sửa code trừ lỗi setup chặn cài (nếu gặp → DỪNG, mở break_task).

## 3. Checklist
- [x] README có: cài, chạy, ví dụ chạy thật, link đọc thêm trỏ đúng file repo.
- [x] Quickstart đi từ zero tới một cây `docs/` demo, mong đợi rõ.
- [x] Có hướng dẫn cả reference path lẫn rules-only ở mức đủ dùng.
- [x] Cài lại trên máy sạch chạy được không cần tác giả kèm.
- [x] README không mâu thuẫn RoadMap/ConformanceMatrix/tài liệu lõi.

## 4. Interfaces / Files expected to change
- `[NEW]` hoặc `[MODIFY]` README phân phối (gốc repo hoặc `docs/`); ghi rõ chọn chỗ nào.
- `[NEW]` `docs/quickstart.md` (~120 dòng) + checklist setup.
- `[MODIFY]` link chéo trong README hiện có nếu lệch.

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Giả định người đọc biết quá nhiều nền | Cao | Viết cho "người thông minh chưa biết lịch sử repo"; checklist kiểm thử trên người chưa từng đọc Design. |
| Claim trong README vượt thứ repo làm được | TB | Mọi bước phải chạy thật được; kiểm trên máy sạch. |
| Drift link tới file đã đổi | TB | Rà toàn bộ link trỏ file thật (đặc biệt sau W13A/B đổi version). |

## 6. Verification plan
- Trên thư mục clone sạch: `npm ci && npm run build && npm test` — xanh.
- Đi theo đúng quickstart tới khi ra cây `docs/` demo — không kẹt bước nào.
- Rà mọi link trong README/quickstart trỏ file tồn tại.

## 7. Status
`DONE`
