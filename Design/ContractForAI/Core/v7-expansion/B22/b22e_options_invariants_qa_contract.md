# Contract — B22e QA: bất biến `options` + golden transcript nhịp lượt mới

> Tầng: QA. Nguồn: [InteractiveQuestionCardsPlan.md](../../../../RoadMap/InteractiveQuestionCardsPlan.md)
> §5 (bảng batch B22e), §8 (Definition of Done). Phụ thuộc: B22c, B22d (cần cả hai adapter xong để
> viết golden transcript so sánh; test bất biến schema có thể viết ngay sau B22b nếu cần chạy sớm).

## 1. Micro-task target

Khoá bất biến máy-check được cho mọi câu có `options` (2–4 mục, mỗi mục có mô tả, `default` nằm
trong danh sách, luôn còn đường tự nhập) và cập nhật golden transcript web để khớp nhịp lượt mới,
đo được số lượt gõ giảm — biến DoD của plan §8 thành số liệu thật, không phải cảm nhận.

## 2. Scope

**In scope**

- Test invariant toàn cục trên `script.yaml` đã parse (không phải test riêng từng câu): với mọi câu
  có `options`, xác nhận (a) 2 ≤ `options.length` ≤ 4, (b) mọi entry có `description` không rỗng,
  (c) nếu `default !== null` thì tồn tại đúng một entry `recommended: true` với `value === default`,
  (d) không có ràng buộc nào trong schema/adapter chặn nhánh tự nhập (kiểm bằng cách xác nhận
  `render-inject.ts`/`generateAgentsMd.ts` luôn phát dòng nhắc tự nhập khi có `options` — test tích
  hợp gọi thẳng hai hàm này với fixture câu có `options`, không phải đọc string literal trong source).
- Test invariant cho `option_hints`: `synthesize_from` không rỗng, `hint_count` ∈ {2, 3}, và một test
  tích hợp xác nhận `render-inject.ts`/`generateAgentsMd.ts` phát đúng nội dung `hint_style` khi câu
  active có `option_hints`.
- Đối chiếu 5 file (`script.yaml` + 4 file markdown song sinh) khớp nhau: mọi câu có `options`/
  `option_hints` trong `script.yaml` phải có đoạn tương ứng trong đúng một trong bốn file markdown
  (`S0-S6-core.md`, `W-web.md`, `M-mobile.md`, `C-cli.md`) — test chặn lệch giữa hai nguồn, theo DoD
  plan §8 dòng 2 ("khớp nhau, có test chặn lệch").
- Cập nhật `test/regression/golden-web.test.ts` (hoặc thêm fixture transcript riêng nếu golden hiện
  có không đo lượt gõ) để phản ánh nhịp lượt mới cho các câu `S7`/`W1-W4`/`CAL0` có `options`: đếm số
  lượt tương tác của người dùng thay vì chỉ so khớp doc output cuối. Ghi số liệu trước/sau vào báo
  cáo — theo đúng yêu cầu "không claim bằng cảm nhận" ở DoD.
- Test cho nhánh giữ-câu-trả-lời-qua-lượt (nếu B22c implement nhánh đó theo kết quả R-spike): xác
  nhận không xảy ra double-commit, token cũ hết hiệu lực đúng lượt kế tiếp.

**Out of scope**

- Không viết lại chính golden transcript nội dung câu trả lời (giữ nguyên answers hiện có của
  `golden-web.test.ts`) — chỉ đo thêm số lượt tương tác của nhịp thẻ mới.
- Không test hiệu năng/độ trễ render.
- Không mở rộng `check-matrix.mjs`/`check-version-sync.mjs` để quét lane này — theo đúng phạm vi đã
  ghi trong `InteractiveQuestionCardsPlan.md` (chỉ `v1-fix-bugs/B1..B5/` bị quét).

## 3. Checklist

- [x] Test invariant toàn cục pass trên `script.yaml` thật (không phải fixture giả) — 19 câu B22a
      phải qua hết. `src/core/scriptOptionsInvariants.test.ts` — 6/6 pass, chạy qua `loadScript()`
      trên file thật.
- [x] Test tích hợp xác nhận cả `render-inject.ts` (Claude) và `generateAgentsMd.ts` (AGENTS.md) đều
      phát dòng nhắc tự nhập khi câu có `options`, và cả hai render CÙNG văn xuôi `deriveAnswerText`
      cho từng option — hai adapter không lệch nhau ở bất biến D55/D58 (1 test tích hợp, gọi thẳng
      2 hàm adapter thật, không đọc string literal nguồn).
- [x] Test đối chiếu 5 file khớp nhau, đỏ khi cố tình xoá một entry khỏi file markdown song sinh —
      verify thật: xoá dòng `**options**` của W1 khỏi `W-web.md`, chạy test thấy fail đúng thông
      điệp, khôi phục nguyên văn (`git diff` xác nhận sạch), ghi lại quy trình ở §7.
- [x] **Deviation:** không sửa `golden-web.test.ts` — nó so cấu trúc doc (`emitTree` + answers cứng),
      không mô hình hoá lượt tương tác; thêm test riêng thay vì gò ép vào file đó (lý do & lưới thay
      thế ở §7).
- [x] Không file nào ngoài mục 4 bị đổi — `test/journey/interactive-cards-turn-count.test.ts` [NEW]
      thay cho việc sửa `golden-web.test.ts`, đúng deviation ghi ở trên.

## 4. Interfaces / Files expected to change

- [NEW] `src/core/scriptOptionsInvariants.test.ts` — test invariant toàn cục (6 test): sanity 14+5,
  shape 2-4/unique/description, `recommendation` nhất quán, `option_hints` shape, D55 tích hợp hai
  adapter, audit `warning_rules` (C5/M2/M5).
- [MODIFY] `src/core/contentIntegrity.test.ts` — test đối chiếu 5 file (thay vì file riêng — đúng
  phạm vi file này đã đối chiếu script.yaml↔taxonomy↔gate-policy↔shapes từ trước).
- [NEW] `test/journey/interactive-cards-turn-count.test.ts` — đo lượt qua state machine thật (3 test:
  thứ tự 16 câu, phân loại free-text/assisted, số liệu baseline/sau/giảm%). Thay cho việc sửa
  `golden-web.test.ts` (deviation, lý do ở §7).
- [NEW] `Design/RoadMap/evidence/interactive-cards-turn-count-report.md` — báo cáo số liệu thật,
  bao gồm việc sửa lại số "16" tạm thời đã công bố sai ở P0 thành số đo thật (5, giảm 84%).

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Test invariant chỉ chạy trên fixture, không bắt lỗi thật trong `script.yaml` | Cao | Bắt buộc chạy trên `script.yaml` thật đã parse qua `loadScript()`, không mock. |
| Đếm lượt tương tác chủ quan, không tái hiện được | TB | Định nghĩa "một lượt" = một lần gọi `commitStep`/`commitDeepenAnswer` thành công; đếm bằng test tự động, không đếm tay. |
| Test đối chiếu 5 file quá cứng, vỡ mỗi khi sửa nội dung câu | Thấp | Chỉ đối chiếu SỰ TỒN TẠI của entry `options`/`option_hints` tương ứng, không đối chiếu nội dung `description` chữ-với-chữ. |

## 6. Verification plan

- `npx vitest run src/core/scriptOptionsInvariants.test.ts src/core/contentIntegrity.test.ts test/journey/interactive-cards-turn-count.test.ts`
- `npm test` xanh toàn bộ.

## 7. Status

DONE (2026-08-16, lộ trình P7, nhánh `codex/lane-8-1-interactive-cards`) — batch cuối của lane
Interactive Question Cards.

**Invariant `warning_rules` (bổ sung ngoài scope gốc §3, cần thiết vì audit phát hiện lỗi thật ở
P3):** `warning_rules` của 3 câu (`C5`, `M2`, `M5`) được viết để khớp văn xuôi tự do; audit phát hiện
`C5_MULTIPLATFORM_DISTRIBUTION_REQUESTED` khớp 0/4 option trước khi vá, `M2_OFFLINE_SYNC_REQUESTED`
khớp nhầm phương án an toàn `online-first`. `scriptOptionsInvariants.test.ts` khoá một bảng kỳ vọng
tường minh (`C5→{release-binary,os-package-manager}`, `M2→{offline-critical,offline-first}`,
`M5→{store-free,store-iap,store-other}`) và đối chiếu bằng chính `deriveAnswerText` + `RegExp` thật
— lưới thay thế cho luật `value === default` đã bỏ khỏi B22b (§7 file đó).

**Test đối chiếu 5 file — verify thật đã chạy (không chỉ viết code):** xoá dòng `**options**` khỏi
block W1 trong `W-web.md`, chạy `npx vitest run src/core/contentIntegrity.test.ts` → fail đúng với
thông điệp `"W1: no matching... missing \"**options**\" section"`; khôi phục nguyên văn bằng Edit,
`git diff` xác nhận sạch (không còn thay đổi thật để lại).

**Deviation — không sửa `golden-web.test.ts`:** file đó nạp `answers` cứng thẳng vào `emitTree()` để
so cấu trúc doc output — không đi qua `commitStep`/state machine nên không có khái niệm "lượt" để
đếm. Viết `test/journey/interactive-cards-turn-count.test.ts` riêng, tái dùng đúng harness
`commitWithCapability` của `newbie-shapes.test.ts` (NJ-01..05) để đi hết hành trình canonical thật
qua state machine, đảm bảo con số đếm được không lệch khỏi hành vi runtime thật.

**Số liệu thật (đã sửa số liệu tạm P0):** [interactive-cards-turn-count-report.md](../../../../RoadMap/evidence/interactive-cards-turn-count-report.md)
— baseline 32 tin nhắn gõ tay, sau 8.1 còn 5 (giảm 84%), không phải "16" như bản nháp P0 đã đoán sai
(nhầm "tổng lượt commit" với "số tin nhắn phải gõ tay" — commit vẫn giữ 16 theo D54, nhưng gõ tay chỉ
còn ở 5 câu free-text vì bước xác nhận dịch ngược nay luôn là thẻ cho MỌI câu). P8 sẽ cập nhật lại
`v8.1-release-note.md`/`InteractiveQuestionCardsPlan.md` header theo số liệu này.

`npx vitest run src/core/scriptOptionsInvariants.test.ts src/core/contentIntegrity.test.ts test/journey/interactive-cards-turn-count.test.ts`
= 18/18 pass (6 + 9 + 3). `npm run lint`/`typecheck:all` xanh.
