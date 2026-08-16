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

- [ ] Test invariant toàn cục pass trên `script.yaml` thật (không phải fixture giả) — 19 câu B22a
      phải qua hết.
- [ ] Test tích hợp xác nhận cả `render-inject.ts` (Claude) và `generateAgentsMd.ts` (AGENTS.md) đều
      phát dòng nhắc tự nhập khi câu có `options` — hai adapter không được lệch nhau ở bất biến D55.
- [ ] Test đối chiếu 5 file khớp nhau, đỏ khi cố tình xoá một entry khỏi file markdown song sinh
      (verify bằng cách tạm xoá thử một dòng, chạy test, thấy fail, rồi khôi phục — ghi vào evidence
      khi DONE, không để lại thay đổi thật).
- [ ] Golden transcript web cập nhật, số lượt tương tác trước/sau ghi vào báo cáo tại
      `Design/RoadMap/evidence/` (đường dẫn cụ thể xác nhận khi implement, theo pattern
      `Design/RoadMap/evidence/` đã dùng ở B21b của lane V6).
- [ ] Không file nào ngoài mục 4 bị đổi.

## 4. Interfaces / Files expected to change

- [NEW] `src/core/scriptOptionsInvariants.test.ts` (hoặc vị trí tương đương xác nhận khi implement)
  — test invariant toàn cục, ~120 dòng.
- [MODIFY] `src/adapters/claude/skill/render-inject.test.ts` — thêm ca test tích hợp đường tự nhập,
  nếu chưa đủ sau B22c, ~20 dòng.
- [MODIFY] `src/adapters/agents/generateAgentsMd.test.ts` — thêm ca test tích hợp tương ứng phía
  AGENTS.md, ~20 dòng.
- [NEW] test đối chiếu 5 file (`script.yaml` ↔ 4 markdown song sinh) — vị trí xác nhận khi implement
  (có thể gộp vào `contentIntegrity.test.ts` hiện có nếu hợp phạm vi), ~60 dòng.
- [MODIFY] `test/regression/golden-web.test.ts` — thêm phần đếm lượt tương tác, ~40 dòng.
- [NEW] `Design/RoadMap/evidence/interactive-cards-turn-count-report.md` — báo cáo số liệu trước/sau,
  ≤60 dòng.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Test invariant chỉ chạy trên fixture, không bắt lỗi thật trong `script.yaml` | Cao | Bắt buộc chạy trên `script.yaml` thật đã parse qua `loadScript()`, không mock. |
| Đếm lượt tương tác chủ quan, không tái hiện được | TB | Định nghĩa "một lượt" = một lần gọi `commitStep`/`commitDeepenAnswer` thành công; đếm bằng test tự động, không đếm tay. |
| Test đối chiếu 5 file quá cứng, vỡ mỗi khi sửa nội dung câu | Thấp | Chỉ đối chiếu SỰ TỒN TẠI của entry `options`/`option_hints` tương ứng, không đối chiếu nội dung `description` chữ-với-chữ. |

## 6. Verification plan

- `npx vitest run src/core/scriptOptionsInvariants.test.ts` (hoặc tên file thật khi implement)
- `npx vitest run src/adapters/claude/skill/render-inject.test.ts src/adapters/agents/generateAgentsMd.test.ts`
- `npx vitest run test/regression/golden-web.test.ts`
- `npm test` xanh toàn bộ — đây là batch cuối của lane, DoD plan §8 phải đạt đủ 4 mục trước khi
  lane được coi là hoàn tất.

## 7. Status

IN_PROGRESS (2026-08-16) — gần như chưa bắt đầu. Duy nhất một test đã có (trong
`contentIntegrity.test.ts`) xác nhận đúng danh sách 19 id có `options`/`option_hints`; chưa có
`scriptOptionsInvariants.test.ts`, chưa có test D55 hai adapter, chưa có test đối chiếu 5 file, chưa
có đếm lượt, chưa có `evidence/interactive-cards-turn-count-report.md`.

**Bổ sung ngoài scope gốc, cần thiết vì audit phát hiện lỗi thật:** một invariant `warning_rules`
sẽ được thêm — không có trong checklist §3 ban đầu. Lý do: `warning_rules` của 3 câu (`C5`, `M2`,
`M5`) được viết để khớp văn xuôi tự do, và khi audit lộ trình phát hiện `C5_MULTIPLATFORM_DISTRIBUTION_REQUESTED`
khớp **0/4** option (kể cả bằng `deriveAnswerText`), còn `M2_OFFLINE_SYNC_REQUESTED` khớp nhầm cả
phương án an toàn `online-first`. Đây là lưới thay thế cho luật `value === default` đã bỏ khỏi B22b
(xem §7 file đó) — buộc tác giả khai tường minh tập option nào mỗi `warning_rules` được phép bắt.
Đóng ở lộ trình P7, sau khi B22c (P5) và B22d (P6) xong.
