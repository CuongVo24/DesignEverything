# Contract — B25a `docs/Guideline.md`: cửa vào cây tài liệu dự án đích

> Tầng: Lõi.
> Nguồn: [V9-DocDepthPlan.md](../../../../RoadMap/V9-DocDepthPlan.md) §Batch (mục 1),
> [D62](../../../../DecisionLog.md). Phụ thuộc: không (batch đầu lane).

## 1. Micro-task target

Sinh `docs/Guideline.md` — cửa vào duy nhất của cây tài liệu dự án đích, mang thứ tự đọc, bản đồ
thư mục và **bảng file khoá cứng**, suy hoàn toàn từ dữ liệu đã có (catalog + docs tầng 1 + profile),
không hỏi thêm câu phỏng vấn nào.

## 2. Scope

**In scope**

- Template `Design/Content/doc-templates/Guideline.md` — cùng khuôn với 12 template tầng 1 đã có,
  mang phần "Tại sao cần file này" như mọi doc khác.
- `renderGuideline(input)` trong `src/core/renderGuideline.ts` — hàm thuần, không I/O. Dựng bốn khối:
  1. **First 5 minutes** — thứ tự đọc suy từ catalog theo `tier` rồi theo thứ tự số của path.
  2. **Bản đồ thư mục** — một dòng cho mỗi nhóm artifact có mặt trong lần emit này (đọc từ
     `listArtifacts(catalog, { shape })`, không hardcode).
  3. **Bảng file khoá cứng** — `03-data-model.md` (kiểu dữ liệu/thực thể), `05-architecture.md`
     (ranh giới kỹ thuật), `docs/conventions/tech-stack.md` (stack đã pin),
     `docs/conventions/allowed-paths.md` (chỗ đặt file). Mỗi dòng: *cần gì · tra ở đâu · không có
     thì làm gì* — luôn là "dừng, sửa tài liệu trước, code sau".
  4. **Đang ở đâu** — link `08-build-plan.md` / `09-execution-plan.md` / `decisions.md`.
- Entry catalog `doc-guideline` → `docs/Guideline.md`, `tier: 1`, `shapes: [core]`,
  `required: true`, `ownership: managed`, `kind: doc`.
- Wiring vào `emitTier1.ts` cùng đường với 12 doc hiện có (qua `prepareEmit`/`activateEmit`, không
  ghi thẳng vào `docs/`).

**Out of scope**

- Không thêm câu hỏi vào `script.yaml`. Mọi nội dung suy từ dữ liệu đã có — nếu phải hỏi thì thiết
  kế sai, dừng và báo manager.
- Không đổi nội dung 12 doc tầng 1 hiện có, kể cả `docs/README.md` (quan hệ giữa `README.md` và
  `Guideline.md` để B27b chốt sau khi thấy cả hai cạnh nhau).
- Không đụng tier-2, không đụng `docs/contracts/` (B25b).
- Không emit `Guideline.md` cho `docs/design/` — chỉ một file ở gốc `docs/`.

## 3. Checklist

- [ ] `renderGuideline` là hàm thuần: cùng input → cùng output, không đọc đĩa, không `Date.now()`.
- [ ] Bảng file khoá cứng chỉ liệt kê file **thật sự có trong lần emit này** — shape `cli` không có
      `07-deployment.md` thì bảng không được nhắc tới nó.
- [ ] Mỗi khối kết bằng đúng một dòng SourceRef theo grammar B19a
      ([taxonomy-tier2.md](../../../../Content/taxonomy-tier2.md) §SourceRef), hoặc `⚠ unknown` khi
      không truy được nguồn.
- [ ] Emit trên golden web/mobile/cli đều ra `docs/Guideline.md` hợp lệ, khác nhau đúng ở phần
      shape-specific.
- [ ] `validateStagedEmit` chấp nhận: `doc-guideline` là `required: true` tier-1 nên
      catalog-completeness phải thấy nó trong staged generation, không được báo thiếu.
- [ ] **Re-emit dự án cũ:** chạy emit trên một fixture đã emit bằng 8.x → `Guideline.md` xuất hiện,
      12 doc cũ **không đổi nội dung** (diff sạch ngoài file mới).
- [ ] `check-docs.mjs` chạy trên cây `docs/` vừa emit → mọi link trong `Guideline.md` resolve.

## 4. Interfaces / Files expected to change

- `[NEW] src/core/renderGuideline.ts` (~120 dòng)
  ```ts
  export function renderGuideline(input: GuidelineRenderInput): RenderedArtifact
  export interface GuidelineRenderInput {
    catalog: RuntimeCatalog;      // từ loadRuntimeCatalogFor()
    shape: string;                // 'web' | 'mobile' | 'hybrid' | 'cli'
    tier1Docs: Record<string, string>;
    profile: ProjectProfile | null;
  }
  ```
  Tái dùng `assembleArtifact` / `findTier1Doc` từ
  [tier2RenderHelpers.ts](../../../../../src/core/tier2RenderHelpers.ts) — **không** viết bộ lắp
  khối thứ hai.
- `[NEW] src/core/renderGuideline.test.ts` (~110 dòng)
- `[NEW] Design/Content/doc-templates/Guideline.md` (~60 dòng)
- `[MODIFY] Design/Content/artifact-catalog.yaml` (+12 dòng) — entry `doc-guideline`, đặt **trước**
  `doc-00-vision` để thứ tự catalog phản ánh thứ tự đọc.
- `[MODIFY] src/core/emitTier1.ts` (~+15 dòng) — gọi `renderGuideline` trong cùng vòng staging.
- `[MODIFY] Design/Content/taxonomy.md` (+6 dòng) — thêm `Guideline.md` vào cây.

## 5. Risks & mitigations

| Rủi ro | Giảm bằng |
|---|---|
| `required: true` làm vỡ mọi fixture/golden 8.x đang assert đúng 12 file | B25a phải cập nhật cả 3 golden trong cùng contract; ca test re-emit ở §3 là cái chặn |
| Bảng "file khoá cứng" hardcode 4 file rồi lệch khi catalog đổi | Suy từ `listArtifacts` + một map `kind → vai trò`, không viết literal path |
| `Guideline.md` và `README.md` nói cùng một thứ ở hai chỗ | Contract này **không** đụng `README.md`; B27b quyết định phân vai sau khi nhìn cả hai |

## 6. Verification plan

```bash
npx vitest run src/core/renderGuideline.test.ts src/core/emitTier1.test.ts
npx vitest run test/regression/golden-web.test.ts test/regression/golden-mobile.test.ts test/regression/golden-cli.test.ts
npx vitest run test/e2e/web-flow.test.ts
npm run typecheck:all && node scripts/check-docs.mjs
```

Kỳ vọng: toàn bộ xanh; golden 3 shape có thêm đúng một file `docs/Guideline.md`; không file cũ nào
đổi nội dung.

## 7. Status

`READY_TO_IMPLEMENT` — duyệt 2026-08-31 (Gate E1 đóng 6/6, D62–D67 `Active`)
