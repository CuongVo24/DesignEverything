# Contract — B27a module deepen `frontend` (bản rút gọn ba tầng)

> Tầng: Nội dung + Lõi.
> Nguồn: [V9-DocDepthPlan.md](../../../../RoadMap/V9-DocDepthPlan.md) §Batch (mục 5),
> [D66](../../../../DecisionLog.md). Phụ thuộc: B26b.

## 1. Micro-task target

Thêm module deepen tier-2 `frontend` sinh **ba tầng** tài liệu giao diện — art direction, foundations
(màu/chữ/spacing/icon), components — dưới `docs/design/frontend/`, chỉ bật cho dự án có giao diện.

## 2. Scope

**In scope**

- `'frontend'` vào `deepenModuleIdSchema`.
- Câu opt-in `DS0-frontend` + series `DS6*` trong `deepen-script.yaml`:
  - `DS6a` (`none`) — bản sắc giao diện: cảm giác muốn tạo ra, tham chiếu, cái cố ý tránh.
  - `DS6b` (`none`) — màu: màu thương hiệu, nền sáng/tối, màu trạng thái.
  - `DS6c` (`none`) — chữ: bộ chữ, thang cỡ, mật độ.
  - `DS6d` (`per_subject: must`) — mỗi Must có màn hình gì, thành phần lặp lại nào.
  Mỗi câu kèm hai dòng chú thích bắt buộc *(1) vì sao tầng 1 chưa hỏi*, *(2) cách suy default*.
- `renderFrontend.ts` sinh:
  - `docs/design/frontend/art-direction.md` (từ `DS6a`)
  - `docs/design/frontend/foundations/color.md` (`DS6b`)
  - `docs/design/frontend/foundations/typography.md` (`DS6c`)
  - `docs/design/frontend/foundations/spacing.md` (suy từ `DS6c` + mật độ; unknown nếu thiếu)
  - `docs/design/frontend/foundations/iconography.md` (suy từ `DS6a`; unknown nếu thiếu)
  - `docs/design/frontend/components/{component-slug}.md` (từ `DS6d` + `04-flows.md`)
- Đăng ký vào `RENDERERS`; entry catalog `tier: 2`, `required: false`,
  **`shapes: [web, mobile, hybrid]`** — shape `cli` không có module này.
- Cập nhật `taxonomy-tier2.md`.

**Out of scope** — đây là phần quan trọng nhất của contract này:

- **Không** sinh `Patterns/`, `Layouts/`, `Flows/` (ba tầng dưới của bộ sáu tầng nguyên bản). Chúng
  trùng phần lớn với `04-flows.md` đã có ở tầng 1; nhân đôi nội dung ở hai chỗ là công thức tạo
  drift (D66). Muốn mở → cần quyết định mới trong `DecisionLog.md`, không tự thêm.
- **Không** sinh `VoiceAndContent.md`.
- **Không** sinh token máy đọc (`tokens.json`, biến CSS, theme file). Đây là tài liệu thiết kế, không
  phải bộ sinh code. Cố tình: sinh token nửa vời tệ hơn không sinh.
- Không bật cho shape `cli` — CLI không có giao diện đồ hoạ để nói về màu và typography.
- Không đụng `modules` (B26b) hay tier-1.

## 3. Checklist

- [ ] `DS0-frontend` **không xuất hiện** khi `branch === 'cli'` — kiểm bằng test, không chỉ bằng
      catalog `shapes`.
- [ ] Dự án `web` opt-in → ra đủ 5 file foundations/art-direction + ≥1 file component.
- [ ] `listDeepenSubjects('frontend', …)` cho `DS6d` trả đúng danh sách Must.
- [ ] Component slug hoá qua `slugify` có sẵn; hai Must sinh cùng slug → hậu tố phân biệt, không
      ghi đè nhau.
- [ ] Người dùng bỏ qua `DS6b`/`DS6c` → file vẫn sinh với khối `⚠ unknown — cần hỏi người`, không
      bịa mã màu hay tên font.
- [ ] `frontend` **không** plan-affecting — emit lại không đánh dấu snapshot stale.
- [ ] Mọi khối có đúng một dòng SourceRef hợp grammar.

## 4. Interfaces / Files expected to change

- `[MODIFY] src/core/schemas/deepenScript.ts` (+1 dòng)
- `[MODIFY] Design/Content/interview-script/deepen-script.yaml` (~+70 dòng)
- `[NEW] src/core/renderFrontend.ts` (~180 dòng)
  ```ts
  export function renderFrontend(input: Tier2RenderInput): RenderedArtifact[]
  ```
- `[NEW] src/core/renderFrontend.test.ts` (~150 dòng)
- `[MODIFY] src/core/emitTier2.ts` (~+3 dòng)
- `[MODIFY] Design/Content/artifact-catalog.yaml` (+66 dòng) — 6 entry, shape-gated
- `[MODIFY] Design/Content/taxonomy-tier2.md` (~+25 dòng)

## 5. Risks & mitigations

| Rủi ro | Giảm bằng |
|---|---|
| Bốn câu về thẩm mỹ khó trả lời cho người không rành thiết kế | Mỗi câu có `default` cụ thể (vd bảng màu trung tính an toàn) + luôn còn đường tự nhập (D55); trả lời "không biết" vẫn ra tài liệu dùng được |
| Tài liệu màu/chữ sinh ra chung chung, vô giá trị | Fail-closed: thiếu nguồn → `⚠ unknown`, không sinh văn mẫu. Thà thiếu còn hơn giả vờ đầy |
| Người dùng tưởng sẽ nhận được token/CSS chạy được | Ghi rõ giới hạn ngay trong phần "Tại sao cần file này" của `art-direction.md` |
| Sức ép mở lại Patterns/Layouts/Flows giữa lane | D66 đã khoá; mở cần quyết định mới, không sửa contract |

## 6. Verification plan

```bash
npx vitest run src/core/renderFrontend.test.ts src/core/emitTier2.test.ts
npx vitest run test/e2e/deepen-flow.test.ts test/eval/tier2-golden-corpus.test.ts
npx vitest run test/e2e/web-flow.test.ts test/e2e/mobile-flow.test.ts
npm run typecheck:all && node scripts/check-docs.mjs
```

Thêm ca CLI: chạy hành trình `cli` tới hết deepen, xác nhận `docs/design/frontend/` **không** tồn tại.

## 7. Status

`WAITING_FOR_APPROVAL`
