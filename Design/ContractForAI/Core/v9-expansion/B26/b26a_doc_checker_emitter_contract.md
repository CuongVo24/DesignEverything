# Contract — B26a emit bộ kiểm tài liệu + CI vào dự án đích

> Tầng: Adapter.
> Nguồn: [V9-DocDepthPlan.md](../../../../RoadMap/V9-DocDepthPlan.md) §Batch (mục 4),
> [D64](../../../../DecisionLog.md), [D67](../../../../DecisionLog.md). Phụ thuộc: B25b.
> Chạy song song được với B26b.

## 1. Micro-task target

Emit `tools/check-docs.mjs` + `.github/workflows/docs-check.yml` vào dự án đích, để bộ tài liệu vừa
sinh **ở lại đúng** khi code đổi — thay vì chỉ được kiểm một lần lúc emit.

## 2. Scope

**In scope**

- Thêm `'tool'` vào `artifactKindSchema`
  ([artifactCatalog.ts:9](../../../../../src/core/schemas/artifactCatalog.ts)) — D64.
- Hai entry catalog `kind: 'tool'`, `tier: 1`, `required: false`, `ownership: managed`:
  `tool-check-docs` (`tools/check-docs.mjs`, `media_type: text/javascript`),
  `tool-docs-workflow` (`.github/workflows/docs-check.yml`, `media_type: text/yaml`).
- `renderDocChecker(profile)` — sinh bản `check-docs.mjs` cho dự án đích. **Nguồn là chính
  [`scripts/check-docs.mjs`](../../../../../scripts/check-docs.mjs) của repo này** (D67), với đúng
  hai khác biệt được phép: (a) đường dẫn gốc trỏ `docs/` thay vì `Design/`; (b) phép kiểm số 3
  (lane index) và số 6 (version cũ) bị bỏ vì dự án đích không có lane.
- Phép kiểm giữ lại cho dự án đích: link resolution · contract index ↔ status · không link
  `file:///` tuyệt đối.
- Miễn trừ catalog-completeness: `kind: 'tool'` phải được `validateStagedEmit` bỏ qua **cùng cách
  `kind: 'convention'` đang được bỏ qua** ([emitTransactionValidate.ts:46](../../../../../src/core/emitTransactionValidate.ts)).

**Out of scope**

- **Không** viết bản `check-docs` thứ hai từ đầu (D67). Khác biệt duy nhất được phép là hai điểm
  liệt kê trên; thấy cần khác nữa → DỪNG, báo manager.
- Không emit CI cho nền tảng khác GitHub Actions.
- Không tự chạy `git init`, không tự commit, không tự bật Actions cho người dùng.
- Không đụng `docs/` — batch này chỉ thêm file ngoài cây docs.

## 3. Checklist

- [ ] `artifactKindSchema` chấp nhận `'tool'`; entry catalog cũ không đổi nghĩa (thêm giá trị enum
      là additive, nhưng version bump vẫn MAJOR theo D64 vì là public schema).
- [ ] `validateStagedEmit` bỏ qua `kind: 'tool'` khi tính completeness — emit không đòi hai file này.
- [ ] File emit ra **chạy được thật**: `node tools/check-docs.mjs` trong dự án đích exit 0 khi cây
      docs sạch, exit 1 khi cố tình làm hỏng một link.
- [ ] Workflow YAML hợp lệ và chạy đúng lệnh đó.
- [ ] Test khoá D67: so nội dung hai bản (`scripts/check-docs.mjs` ↔ bản render) và fail nếu chúng
      lệch ngoài hai khác biệt đã cho phép — đây là lưới chống "hai bản rồi mục dần".
- [ ] Dự án đích **không** có `.github/` sẵn → tạo mới; **có** sẵn → không clobber file khác trong
      thư mục đó.

## 4. Interfaces / Files expected to change

- `[MODIFY] src/core/schemas/artifactCatalog.ts` (+1 dòng) — `'tool'` vào enum.
- `[MODIFY] src/core/emitTransactionValidate.ts` (~+2 dòng) — mở rộng bộ lọc completeness.
- `[NEW] src/core/renderDocChecker.ts` (~90 dòng)
  ```ts
  export function renderDocChecker(profile: ProjectProfile | null): RenderedArtifact[]
  ```
- `[NEW] src/core/renderDocChecker.test.ts` (~120 dòng) — gồm ca so hai bản (D67).
- `[MODIFY] Design/Content/artifact-catalog.yaml` (+24 dòng).
- `[MODIFY] src/core/emitTier1.ts` (~+8 dòng) — đưa hai artifact vào staging.

## 5. Risks & mitigations

| Rủi ro | Giảm bằng |
|---|---|
| Hai bản checker lệch dần — đúng bệnh `.clauderules` vừa mắc | Ca test so nội dung ở §3, fail-closed |
| `kind: 'tool'` lọt vào completeness rồi vỡ mọi emit | Ca test §3 dòng 2 chạy trước; `required: false` là lớp thứ hai |
| Emit script thực thi được vào repo người dùng bị coi là xâm phạm | `required: false` + chỉ ghi khi catalog cho phép; không tự chạy, không tự commit |
| Dự án đích không dùng Node | `renderDocChecker` đọc `profile.runtime`; runtime khác Node → **không emit** hai artifact này, ghi lý do vào kết quả emit |

## 6. Verification plan

```bash
npx vitest run src/core/renderDocChecker.test.ts src/core/emitTransactionValidate.test.ts src/core/artifactCatalog.test.ts
npx vitest run test/integration/installed-runtime/
npm run build:bundle && npm run typecheck:all
node scripts/check-docs.mjs
```

Smoke tay: cài vào một target trống, emit, rồi trong target chạy `node tools/check-docs.mjs` (kỳ
vọng exit 0), sửa hỏng một link trong `docs/Guideline.md`, chạy lại (kỳ vọng exit 1 + chỉ đúng dòng).

## 7. Status

`WAITING_FOR_APPROVAL`
