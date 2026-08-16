# Contract — B24c-2 `multi_select`: bật cho S1, S2, S4, S5

> Tầng: Nội dung.
> Nguồn: [InterviewCadencePlan.md](../../../../RoadMap/InterviewCadencePlan.md) §5 (bảng batch
> B24c), [D61](../../../../DecisionLog.md). Phụ thuộc: B24c-1.

## 1. Micro-task target

Bật `multi_select: true` trong `script.yaml` cho đúng bốn câu mà slot đích vốn là danh sách cộng
dồn (`S1`, `S2`, `S4`, `S5`), đồng bộ 1 file song sinh bị ảnh hưởng và schema doc.

## 2. Scope

**In scope**

- `script.yaml` — thêm `multi_select: true` vào khối `S1`, `S2`, `S4`, `S5`; bump
  `version: 2.1.0 → 2.2.0` (MINOR, additive).
- `S0-S6-core.md` — thêm bullet `**multi_select**` sau khối `**option_hints**` của 4 câu trên
  (`W-web.md`/`M-mobile.md`/`C-cli.md` không đổi — không câu nào của chúng nằm trong danh sách).
- `Design/Core/Schemas/interview-script.md` — dòng `multi_select` vào bảng field §2 (nhân tiện bổ
  sung `slot_keys` đang thiếu — lệch phát hiện khi khảo sát, không phải phạm vi mới), luật 16 vào
  §6, changelog `2.2.0`.

**Out of scope — quyết định trong lúc triển khai (ghi lại, không sửa lén)**

- **`W4`/`C4` bị loại khỏi danh sách ban đầu** (kế hoạch gốc có 6 câu: S1,S2,S4,S5,W4,C4). Hai câu
  này có `options` loại trừ lẫn nhau — W4 là "không cần tài khoản / Google+email / chỉ email" (một
  phương thức đăng nhập, không cộng dồn được), C4 là "Windows / macOS / Linux / Đa nền tảng" (một
  hệ điều hành mục tiêu — chọn `cross-platform` đã bao hàm các lựa chọn kia). `multi_select` ở đây
  vẫn hợp lệ theo schema (`recommendation: contextual`) nhưng cho phép tổ hợp vô nghĩa (vd
  "Windows"+"macOS"+"Đa nền tảng" cùng lúc). Xác nhận với chủ repo giữa phiên triển khai — chốt bỏ
  W4/C4, chỉ giữ 4 câu nhánh core có slot thật sự là danh sách. D61/InterviewCadencePlan.md đã sửa
  theo quyết định này.
- Không đổi `M3` — đã loại từ trước khi code (free-text, không có `options`/`option_hints`, bật
  `multi_select` ở đó là no-op).
- Không đổi nội dung `ask`/`translate_back`/`default` của bốn câu — chỉ thêm field mới.

## 3. Checklist

- [x] `script.yaml` phiên bản `2.2.0`.
- [x] `S1`, `S2`, `S4`, `S5` có `multi_select: true`; mọi câu khác không đổi.
- [x] `loadScript` parse `script.yaml` thật thành công, 26 câu, không lỗi schema.
- [x] `S0-S6-core.md` có bullet `**multi_select**` cho đúng 4 câu, nội dung khớp tinh thần
      (giải thích ngắn vì sao đa chọn hợp lý cho câu đó).
- [x] `interview-script.md` bảng field có dòng `multi_select` và `slot_keys`; luật 6.16; changelog
      `2.2.0`.
- [x] `contentIntegrity.test.ts` (test tồn tại sẵn, ghim `19` câu assisted + `staticIds`/`hintIds`)
      không vỡ — tập câu có `options`/`option_hints` không đổi, chỉ thêm field mới lên 4 câu đã có
      sẵn `option_hints`.

## 4. Interfaces / Files expected to change

- [MODIFY] `Design/Content/interview-script/script.yaml` — version bump + 4 dòng `multi_select: true`.
- [MODIFY] `Design/Content/interview-script/S0-S6-core.md` — 4 bullet mới.
- [MODIFY] `Design/Core/Schemas/interview-script.md` — bảng §2 (2 dòng: `slot_keys`, `multi_select`),
  luật 6.16, changelog.
- [MODIFY] `src/core/loadScript.test.ts`, `src/core/contentIntegrity.test.ts` — cập nhật assertion
  version cứng `2.1.0 → 2.2.0`.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Multi-select trên options/hint loại trừ lẫn nhau sinh ra doc vô nghĩa | Cao nếu không kiểm | Chính là lý do loại W4/C4 khỏi danh sách — quyết định lấy trước khi ghi vào script.yaml, không phải sau khi phát sinh lỗi. |
| Twin file khác (`W-web.md`, `M-mobile.md`, `C-cli.md`) lỡ tay bị sửa | Thấp | Không chạm — không câu nào của ba file đó nằm trong danh sách D61. |
| Version bump làm vỡ test ghim cứng | Thấp (đã xử lý) | `loadScript.test.ts`/`contentIntegrity.test.ts` cập nhật cùng commit. |

## 6. Verification plan

```bash
npx vitest run src/core/loadScript.test.ts src/core/contentIntegrity.test.ts src/core/schemas/interviewScript.test.ts src/core/interactionChoices.test.ts
npm run typecheck
npm run build:bundle && npx vitest run
```

## 7. Status

DONE (2026-08-16, Đợt 2 Phase 4, nhánh `codex/lane-8-1-interactive-cards`).

`npx vitest run src/core/loadScript.test.ts src/core/contentIntegrity.test.ts
src/core/schemas/interviewScript.test.ts src/core/interactionChoices.test.ts` = 15+9+6+7 = 37/37
pass. `npm run typecheck` xanh. Sau `build:bundle`, `npx vitest run` toàn repo = 139/139 file,
1075 pass / 2 skip.
