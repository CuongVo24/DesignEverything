# Contract — B25b `docs/contracts/`: đổ `Contract[]` ra cây markdown đọc được

> Tầng: Lõi.
> Nguồn: [V9-DocDepthPlan.md](../../../../RoadMap/V9-DocDepthPlan.md) §Batch (mục 2),
> [D63](../../../../DecisionLog.md). Phụ thuộc: B25a.

## 1. Micro-task target

Render `Contract[]` (đã có sẵn từ `synthesizeFeatureContracts`) thành cây markdown
`docs/contracts/{milestone}/{id}_contract.md` theo đúng bảy mục
[CONTRACT_STRUCTURE_RULE §3](../../../CONTRACT_STRUCTURE_RULE.md), kèm `CONTRACT_INDEX.md` và
`EXECUTOR_RUNBOOK.md` — biến hợp đồng từ dữ liệu JSON thành tài liệu người và agent đọc được.

## 2. Scope

**In scope**

- `renderContractDoc(contract): RenderedArtifact` — một `Contract` → một file bảy mục. Map field
  theo bảng ở [README lane](../README.md#vì-sao-b25b-là-batch-ăn-nhất); không thêm/bớt mục.
- `renderContractIndex(contracts): RenderedArtifact` — bảng `Nhóm | Contract | Status`, cùng shape
  với [CONTRACT_INDEX.md](../../../CONTRACT_INDEX.md) của chính repo này (dogfood).
- `renderExecutorRunbook(): RenderedArtifact` — tám bước, port từ
  [EXECUTOR_RUNBOOK.md](../../../EXECUTOR_RUNBOOK.md), thay tham chiếu nội bộ DE bằng tham chiếu tới
  `docs/` của dự án đích.
- Ba entry catalog, tất cả `tier: 1`, `required: false`, `ownership: managed`, `kind: doc`:
  `contract-doc` (`path_pattern: "docs/contracts/{milestone}/{id}_contract.md"`),
  `contract-index` (`docs/contracts/CONTRACT_INDEX.md`),
  `contract-runbook` (`docs/contracts/EXECUTOR_RUNBOOK.md`).
- Emit ở **pha build**, kênh transaction riêng `contracts` (theo khuôn `tier2ChannelFor` ở
  [emitTier2.ts](../../../../../src/core/emitTier2.ts)) — không trộn manifest với tier-1.

**Out of scope**

- **Không** đổi `synthesizeFeatureContracts`, `validateContract`, `compileContractToTaskCard`, hay
  `contractSchema`. Lane này chỉ render cái đã có. Thấy thiếu field → DỪNG, báo manager.
- **Không** đổi `execution-plan.json`: nó vẫn là nguồn chân lý máy đọc; markdown là bản trình bày.
  Hai chiều không đồng bộ ngược (sửa `.md` không đổi plan).
- Không sinh contract cho milestone skeleton `M0`–`M3` — chỉ feature-milestone `M4+` (D41).
- Không thêm câu hỏi phỏng vấn nào.

## 3. Checklist

- [ ] Mỗi file sinh ra có **đủ và đúng bảy mục** `## 1.` … `## 7.`, theo đúng thứ tự §3.
- [ ] `## 7. Status` mang đúng `contract.status`, dùng từ vựng một token của §5.
- [ ] `docs/contracts/CONTRACT_INDEX.md` có đúng một dòng cho mỗi file contract sinh ra, status khớp
      — kiểm bằng chính `check-docs.mjs` chạy trên cây đích (chung phép kiểm 2 với repo này).
- [ ] `required: false` — emit tầng 1 trên một dự án **chưa** có execution plan vẫn phải xanh, không
      bị `catalog-completeness-missing` (đây là lý do D63 chọn `false`; nếu đổi thành `true` thì
      [emitTransactionValidate.ts:44-56](../../../../../src/core/emitTransactionValidate.ts) sẽ báo
      thiếu).
- [ ] Re-render sau khi một contract đổi `status` → chỉ file đó và `CONTRACT_INDEX.md` đổi; các
      file contract khác byte-identical.
- [ ] Tên file slug hoá qua `slugify` đã có, không tự viết bộ chuẩn hoá thứ hai.
- [ ] Dự án có 1 Must và dự án có 6 Must đều ra cây hợp lệ (sizing theo D42 giữ nguyên, không cứng
      hoá số file).

## 4. Interfaces / Files expected to change

- `[NEW] src/core/renderContractDoc.ts` (~150 dòng)
  ```ts
  export function renderContractDoc(contract: Contract): RenderedArtifact
  export function renderContractIndex(contracts: Contract[]): RenderedArtifact
  export function renderExecutorRunbook(): RenderedArtifact
  ```
- `[NEW] src/core/renderContractDoc.test.ts` (~140 dòng)
- `[NEW] src/core/emitContracts.ts` (~110 dòng) — `emitContracts({ workspace, contracts })`, dùng
  `prepareEmit`/`activateEmit` từ
  [emitTransactionStage.ts](../../../../../src/core/emitTransactionStage.ts) và
  [emitTransactionActivate.ts](../../../../../src/core/emitTransactionActivate.ts). **Không**
  `writeFileSync` thẳng vào `docs/`.
- `[NEW] src/core/emitContracts.test.ts` (~120 dòng)
- `[MODIFY] Design/Content/artifact-catalog.yaml` (+36 dòng) — ba entry.
- `[MODIFY] src/adapters/shared/cliOps/validate.ts` (~+12 dòng) — gọi `emitContracts` sau khi plan
  validate xong.
- `[MODIFY] Design/Content/taxonomy.md` (+10 dòng).

## 5. Risks & mitigations

| Rủi ro | Giảm bằng |
|---|---|
| Contract markdown và `execution-plan.json` lệch nhau | Một chiều duy nhất: plan → markdown. Re-render là idempotent; ca test §3 khoá điều đó |
| `required: false` khiến không ai phát hiện khi cây contract không sinh ra | `check-docs.mjs` ở dự án đích (B26a) kiểm index ↔ file; thiếu cả hai thì không có gì để lệch |
| Bảy mục render ra rỗng vì `Contract` thiếu dữ liệu | `validateContract` đã chặn từ B16a; renderer fail-closed: field rỗng → `⚠ unknown — cần hỏi người`, không im lặng bỏ mục |
| Cây contract lớn làm chậm emit | Emit ở pha build, không phải pha interview; không nằm trên đường nóng của phỏng vấn |

## 6. Verification plan

```bash
npx vitest run src/core/renderContractDoc.test.ts src/core/emitContracts.test.ts
npx vitest run test/e2e/skeleton-to-feature.test.ts
npx vitest run test/replay/featureJourneyReplay.test.ts
npm run typecheck:all && node scripts/check-docs.mjs
```

Thêm một smoke tay: chạy `/build validate` trên fixture web, mở `docs/contracts/CONTRACT_INDEX.md`,
xác nhận mọi link trong đó mở được và status khớp file.

## 7. Status

`WAITING_FOR_APPROVAL`
