# Contract — B26b module deepen `modules` + bốn file nguồn chân lý khoá cứng

> Tầng: Nội dung + Lõi.
> Nguồn: [V9-DocDepthPlan.md](../../../../RoadMap/V9-DocDepthPlan.md) §Batch (mục 3),
> [D65](../../../../DecisionLog.md). Phụ thuộc: B25b. Chạy song song được với B26a.

## 1. Micro-task target

Thêm module deepen tier-2 `modules`: mỗi Must-have thành một đặc tả module dưới
`docs/design/modules/`, cộng **bốn file nguồn chân lý khoá cứng** (`CanonicalTypes`, `ApiContract`,
`ErrorCodes`, `ModuleTypeMap`) để agent tra thay vì bịa kiểu dữ liệu, endpoint và mã lỗi.

## 2. Scope

**In scope**

- `'modules'` vào `deepenModuleIdSchema`
  ([deepenScript.ts:4](../../../../../src/core/schemas/deepenScript.ts)).
- Câu opt-in `DS0-modules` (`kind: meta`, `default_from: [S3]`, `depends_on_tier1: [S3, S4]`) và
  series `DS5*` trong [deepen-script.yaml](../../../../Content/interview-script/deepen-script.yaml):
  - `DS5a` (`per_subject: must`) — dữ liệu module này đọc/ghi là gì.
  - `DS5b` (`per_subject: must`) — tiêu chí nghiệm thu của module.
  - `DS5c` (`per_subject: none`) — endpoint/lệnh mà hệ thống phơi ra.
  - `DS5d` (`per_subject: none`) — mã lỗi và câu chữ hiện cho người dùng cuối.
  Mỗi câu kèm hai dòng chú thích bắt buộc của file đó: *(1) vì sao tầng 1 chưa hỏi*, *(2) cách suy
  default*.
- `renderModules.ts` theo khuôn [renderGlossary.ts](../../../../../src/core/renderGlossary.ts), dùng
  `assembleArtifact`/`answerBlock`/`findTier1Doc`. Sinh:
  - `docs/design/modules/{must-slug}.md` — một file mỗi Must (`per_subject: must`).
  - `docs/design/modules/CanonicalTypes.md` — thực thể từ `03-data-model.md` + `DS5a`.
  - `docs/design/modules/ApiContract.md` — từ `DS5c` + `05-architecture.md`.
  - `docs/design/modules/ErrorCodes.md` — từ `DS5d`.
  - `docs/design/modules/ModuleTypeMap.md` — bảng module ↔ kiểu dữ liệu, suy từ hai file trên.
- Đăng ký `modules: renderModules` vào `RENDERERS`
  ([emitTier2.ts:44](../../../../../src/core/emitTier2.ts)).
- Năm entry catalog `tier: 2`, `required: false`, `shapes: [core]`.
- Cập nhật [taxonomy-tier2.md](../../../../Content/taxonomy-tier2.md): cây thư mục + bảng module +
  điều kiện kích hoạt.

**Out of scope**

- Không đụng 4 module tier-2 hiện có (`glossary`/`feature-spec`/`adr`/`test-strategy`).
- `modules` **không** phải plan-affecting: không gọi `invalidateSnapshotForTier2`. Nó mô tả
  module, không mô tả lại architecture/test-strategy mà execution plan đã validate.
- Không sinh code, không sinh type TypeScript thật — đây là tài liệu.
- Không đụng `frontend` (B27a).

## 3. Checklist

- [ ] `DS0-modules` deny đúng khi tier-1 chưa emit / phỏng vấn lõi chưa xong (ba điều kiện
      `canStartDeepen` ở [deepenLifecycle.ts](../../../../../src/core/deepenLifecycle.ts)).
- [ ] `listDeepenSubjects('modules', …)` trả đúng danh sách Must từ `02-scope.md` — dự án 1 Must ra
      1 file, 6 Must ra 6 file.
- [ ] Mỗi khối kết bằng đúng một dòng SourceRef hợp grammar, hoặc `⚠ unknown — cần hỏi người`.
- [ ] `ModuleTypeMap.md` **không** khai kiểu nào không có trong `CanonicalTypes.md` — kiểm bằng test,
      đây là điểm khiến bốn file "khoá cứng" đáng tin.
- [ ] Emit lại `modules` sau khi execution đã qua `plan-validating` → **không** đánh dấu snapshot
      stale (khác `adr`/`test-strategy`).
- [ ] Rerun một câu `DS5*` rồi emit lại → nội dung đổi theo generation mới nhất, generation cũ vẫn
      còn trong `deepen-answer-history.json`.
- [ ] `checkTier2Consistency` chạy trước staging; module chỉ emit khi sạch (all-or-nothing).

## 4. Interfaces / Files expected to change

- `[MODIFY] src/core/schemas/deepenScript.ts` (+1 dòng)
- `[MODIFY] Design/Content/interview-script/deepen-script.yaml` (~+70 dòng) — `DS0-modules` + `DS5a-d`
- `[NEW] src/core/renderModules.ts` (~190 dòng)
  ```ts
  export function renderModules(input: Tier2RenderInput): RenderedArtifact[]
  ```
- `[NEW] src/core/renderModules.test.ts` (~160 dòng)
- `[MODIFY] src/core/emitTier2.ts` (~+3 dòng) — `RENDERERS`
- `[MODIFY] Design/Content/artifact-catalog.yaml` (+60 dòng) — 5 entry
- `[MODIFY] Design/Content/taxonomy-tier2.md` (~+25 dòng)

> `renderModules.ts` sát trần 200 dòng. Vượt → tách `renderModuleTruthFiles.ts` (bốn file khoá cứng)
> khỏi `renderModules.ts` (per-Must), đúng luật tách nhóm §4.

## 5. Risks & mitigations

| Rủi ro | Giảm bằng |
|---|---|
| Bốn câu mới kéo dài phỏng vấn cho người chỉ cần tầng 1 | Toàn bộ opt-in; `DS0-modules` mặc định theo S3 nhưng luôn từ chối được |
| `ApiContract`/`ErrorCodes` sinh ra rỗng và vô dụng | Fail-closed: không đủ nguồn → khối `⚠ unknown — cần hỏi người`, không bịa endpoint |
| Bốn file "khoá cứng" mâu thuẫn nhau | Ca test §3: `ModuleTypeMap` chỉ được dùng kiểu có trong `CanonicalTypes` |
| Trùng nội dung với `feature-spec` (cũng per-Must) | `feature-spec` = hành vi + ca biên; `modules` = dữ liệu + endpoint + mã lỗi + nghiệm thu. Ghi rõ ranh giới này vào `taxonomy-tier2.md` |

## 6. Verification plan

```bash
npx vitest run src/core/renderModules.test.ts src/core/emitTier2.test.ts src/core/deepenState.test.ts src/core/deepenLifecycle.test.ts
npx vitest run test/e2e/deepen-flow.test.ts test/eval/tier2-golden-corpus.test.ts
npm run build:bundle && npx vitest run test/integration/installed-runtime/
npm run typecheck:all && node scripts/check-docs.mjs
```

## 7. Status

`WAITING_FOR_APPROVAL`
