# Contract — B22b Mở rộng schema `interview-script` cho `options`/`option_hints`

> Tầng: Lõi. Nguồn: [InteractiveQuestionCardsPlan.md](../../../../RoadMap/InteractiveQuestionCardsPlan.md)
> §5 (bảng batch B22b), [D53](../../../../DecisionLog.md). Phụ thuộc: B22a (cần nội dung thật để
> viết fixture test, tuy schema code có thể viết song song nếu dùng fixture tay).

## 1. Micro-task target

Thêm hai field optional `options` và `option_hints` vào `questionSchema`
([interviewScript.ts](../../../../../src/core/schemas/interviewScript.ts)), khoá hình dạng trong
[interview-script.md](../../../../Core/Schemas/interview-script.md), bump schema `2.0.0 → 2.1.0`,
và dạy `loadScript.ts` validate hai field mới — **tương thích ngược tuyệt đối**: câu thiếu cả hai
field vẫn là free-text như hiện nay, không một test cũ nào được phép đổi hành vi.

## 2. Scope

**In scope**

- `questionSchema` thêm:
  - `options?: Array<{ value: string; label: string; description: string; recommended: boolean }>`
    — mảng không rỗng khi có mặt, `value` không rỗng, `description` không rỗng (chặn "chỉ nêu tên"
    theo D55/plan §6), tối đa một entry `recommended: true`.
  - `option_hints?: { synthesize_from: string[]; hint_count: number; hint_style: string }` —
    `hint_count` trong khoảng 2–3 (khớp plan §5 "hint_count 2 hoặc 3"), `synthesize_from` không rỗng.
  - Cả hai field optional — **không** thêm `.refine()` bắt buộc phải có ít nhất một trong hai; câu
    không có field nào vẫn hợp lệ (bất biến tương thích của schema, mục 7 của
    `interview-script.md`).
- `.refine()` mới trên `questionSchema`: nếu có `options` và `default !== null`, phải tồn tại đúng
  một entry `options` với `recommended: true` **và** `value` của entry đó bằng `default` — đây là
  cách máy-check hoá D55 ("`default` phải xuất hiện như một lựa chọn mang nhãn khuyến nghị"). Nếu
  `default === null` (câu bắt buộc, không có mặc định), không entry nào bắt buộc `recommended`.
- `loadScript.ts` thêm một vòng kiểm tra `option_hints.synthesize_from` chỉ trỏ `id` đã khai báo
  trước đó trong `script.questions` (cùng pattern với vòng kiểm `depends_on` sẵn có ở dòng 55–62) —
  KHÔNG bắt buộc `synthesize_from` là tập con của `depends_on` (một hint có thể tham chiếu câu core
  không nằm trong `depends_on` trực tiếp của nó).
- `interview-script.md`: thêm hai dòng vào bảng field (mục 2), một ví dụ `options` + một ví dụ
  `option_hints` vào mục 5, một luật mới vào mục 6 "Luật validate", một dòng changelog `2.1.0` ở
  mục "Changelog" theo đúng format bảng hiện có, cập nhật `version: 2.x` → ghi rõ `2.1.0` là bản vá
  hiện hành (không đổi câu "từ v2 là dòng `2.x`" ở mục 6 luật 1, vẫn đúng).
- `script.yaml` dòng `version:` bump `2.0.0 → 2.1.0` (MINOR — thêm field optional, không phá gì).

**Out of scope**

- Không đổi field bắt buộc nào của `questionSchema` hiện có (`id`, `ask`, `default`, `kind`,
  `target_doc`, `branch`, `gate`, `translate_back`, `depends_on`, `answer_contract`).
- Không viết logic render (`options` → thẻ UI) — đó là B22c/B22d, chỉ đọc field này.
- Không viết logic tổng hợp `option_hints` tại runtime (agent tự làm theo hướng dẫn trong
  `hint_style`) — schema chỉ khoá hình dạng chỉ dẫn, không thực thi nó.

## 3. Checklist

- [x] `questionSchema` parse đúng câu có `options`, câu có `option_hints`, và câu không có field nào
      (script hiện có) — **deviation #4**: câu có cả hai bị schema **từ chối** (mutual exclusion),
      khác chữ "không được cấm" ở dòng gốc. Xem lý do dưới.
- [x] Luật `recommendation`↔`default` (thay `.refine() recommended↔default` gốc — xem deviation #2
      ở §7) bắt lỗi khi thiếu `recommendation`, khi `fixed.value` không khớp option nào, và khi
      `recommendation` xuất hiện mà không có `options` — test cả 3 chiều trong `loadScript.test.ts`.
- [x] `loadScript.ts` throw lỗi rõ ràng khi `option_hints.synthesize_from` trỏ `id` chưa khai báo
      hoặc ngoài closure `depends_on`, đúng style message của vòng kiểm `depends_on` hiện có — test
      cả hai nhánh lỗi.
- [x] Toàn bộ test hiện có của `loadScript.test.ts` xanh không sửa (15/15, 7 cũ + 8 mới) — bằng
      chứng tương thích ngược. Không có test riêng cho `questionSchema` ở `schemas/contract.test.ts`
      (file đó test `contractSchema` V6, khác schema) — xác nhận `loadScript.test.ts` là nơi đúng để
      test `questionSchema`, vì schema này chưa từng được dùng standalone ngoài qua loader.
- [x] `interview-script.md` mục 2/5/6/Changelog cập nhật đủ (3 field mới ở mục 2, 2 ví dụ ở mục 5,
      luật 13–15 ở mục 6, dòng `2.1.0` MINOR ở Changelog), không sửa nội dung field cũ.
- [x] `check-version-sync.mjs` không vỡ sau khi `script.yaml` đã bump `2.1.0` (thực hiện ở B22a) —
      xác nhận lại, xanh.

## 4. Interfaces / Files expected to change

- [MODIFY] `src/core/schemas/interviewScript.ts` — thêm 2 field optional + 1 `.refine()`, ~35 dòng.
- [MODIFY] `src/core/loadScript.ts` — thêm vòng kiểm `synthesize_from`, ~15 dòng, chèn sau vòng kiểm
  `depends_on` hiện có (dòng 55–62).
- [MODIFY] `src/core/loadScript.test.ts` — thêm ca test cho field mới, ~60 dòng.
- [MODIFY] `src/core/schemas/contract.test.ts` hoặc file test schema tương ứng nếu có test riêng cho
  `questionSchema` — xác nhận tại thời điểm implement, ~30 dòng.
- [MODIFY] `Design/Core/Schemas/interview-script.md` — bảng field + ví dụ + luật validate +
  changelog, ~40 dòng thêm.
- [MODIFY] `Design/Content/interview-script/script.yaml` — dòng `version:` duy nhất.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| `.refine()` mới vô tình bắt lỗi câu cũ không có `options` | Cao | Refine chỉ chạy điều kiện khi `options` tồn tại (`if (!q.options) return true`); test riêng cho câu không có field nào. |
| `synthesize_from` cho phép tham chiếu vòng qua `option_hints` chồng chéo | Thấp | Chỉ kiểm "đã khai báo trước đó" như `depends_on`, không cần graph phức tạp — đủ theo scope B22a (5 câu cố định). |
| Bump `2.1.0` bị hiểu nhầm là cần cập nhật `ConformanceMatrix` MAJOR | Thấp | Ghi rõ trong changelog đây là MINOR (field optional, tương thích ngược), không kích hoạt luật MAJOR ở mục 7 `interview-script.md`. |

## 6. Verification plan

- `npx vitest run src/core/loadScript.test.ts src/core/schemas/contract.test.ts`
- `npm test` xanh toàn bộ — đặc biệt `test/regression/golden-*.test.ts` không đổi output (câu chưa
  có `options` phải render y hệt trước).
- `node scripts/check-version-sync.mjs` xanh sau khi bump `script.yaml` version (không nằm trong
  phạm vi script này nhưng phải không vỡ).

## 7. Status

DONE (2026-08-16, lộ trình P4, nhánh `codex/lane-8-1-interactive-cards`). `interview-script.md` mục
2/5/6/Changelog cập nhật đủ; `loadScript.test.ts` có 8 ca test mới cho schema `2.1.0` (7 ca cũ +
đồ thị `depends_on` vẫn xanh không sửa) — 15/15 pass. `npm run lint`/`typecheck:all` xanh.

**Bốn deviation từ spec (ghi lại, không sửa lén — xem [D58](../../../../DecisionLog.md)):**

0. **Mutual exclusion chặt hơn mục 3 checklist.** Checklist gốc ghi "câu có cả hai [`options` và
   `option_hints`] (không xảy ra với 19 câu B22a nhưng schema không được cấm)". Code thực tế **từ
   chối** câu có cả hai (`superRefine` phát issue khi cả hai field cùng có mặt) — ngược với "không
   được cấm". Giữ nguyên mức chặt này thay vì nới ra: hai cơ chế "viết cứng lựa chọn" và "agent tổng
   hợp tại runtime" mâu thuẫn ngữ nghĩa nếu cùng tồn tại trên một câu (D53's "hai loại câu khác bản
   chất" — plan §4); cho phép cả hai sẽ tạo mơ hồ về nguồn sự thật lựa chọn nào adapter phải theo.
   Test khoá lại ở `loadScript.test.ts`.

1. **Shape khác mục 2.** `options[].recommended: boolean` (spec gốc) → tách thành field cấp câu
   `recommendation: {mode: 'fixed', value: string} | {mode: 'contextual'}`. Lý do ở §7 của
   [b22a](b22a_script_options_content_contract.md).
2. **`.refine()` khác mục 2.** Luật máy-check gốc "nếu có `options` và `default !== null`, tồn tại
   đúng một entry `recommended: true` với `value === default`" **bị bỏ**, vì bất khả thi: `default`
   luôn là văn xuôi tự do (vd W1's default dài 2 câu), còn `value` là token ngắn (`public-seo`) —
   không bao giờ bằng nhau theo nghĩa `===`. Thay bằng: `recommendation` bắt buộc khi có `options`
   (mọi mode), `fixed.value` phải thuộc tập `options[].value`. Lưới thay thế cho ý định D55 gốc
   ("`default` phải xuất hiện như một lựa chọn khuyến nghị") chuyển sang tầng QA — xem B22e §7 khi
   đóng (P7): mỗi câu có `recommendation.mode = 'fixed'` phải đối chiếu tay với `default`, ghi vào
   evidence B22a thay vì máy-check `===` tại schema.
3. **`loadScript.ts` chặt hơn mục 2.** Spec ghi rõ "KHÔNG bắt buộc `synthesize_from` là tập con của
   `depends_on`". Code hiện tại (đã có từ trước phase này) **bắt buộc** mọi `synthesize_from` nằm
   trong closure bắc cầu của `depends_on` (throw nếu không). Giữ nguyên mức chặt này — nó siết chặt
   hơn yêu cầu tối thiểu của spec chứ không vi phạm nó (không có `option_hints` nào trong 5 câu B22a
   cần tham chiếu ngoài `depends_on`), và ngăn một lớp lỗi thật: hint tổng hợp từ một câu chưa chắc
   đã trả lời tại thời điểm câu hiện tại được hỏi.
