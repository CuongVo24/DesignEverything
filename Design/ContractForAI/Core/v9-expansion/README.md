# Contracts — V9 Doc Depth (target 9.0.0)

> Nguồn: [V9-DocDepthPlan.md](../../../RoadMap/V9-DocDepthPlan.md) (TaskBrief của lane, theo ngoại lệ
> expansion [CONTRACT_STRUCTURE_RULE](../../CONTRACT_STRUCTURE_RULE.md) §0) và quyết định D62–D67 ở
> [DecisionLog.md](../../../DecisionLog.md).
>
> **Lane MỞ (2026-08-31)** — Gate E0 đã đóng (đợt dọn `Design/`: `check-docs.mjs` xanh trong
> `npm test`). **D62–D67 đã duyệt hết 2026-08-31 (Gate E1 ✅).** Cả 6 contract vẫn ở
> `WAITING_FOR_APPROVAL`: **executor chưa được chạm code** cho tới khi từng contract được chuyển
> sang `READY_TO_IMPLEMENT` — duyệt quyết định và duyệt contract là hai việc khác nhau (§5).

## Lane này làm gì

Đóng khoảng cách giữa cái DesignEverything **emit ra** (12 file `docs/` + 4 conventions + 4 module
tier-2) và cái nó **tự dùng** (`Design/` 352 file có `Guideline.md`, `ContractForAI/` với index và
runbook). Năm mục, theo bảng đối chiếu với `SlideAmNhac` ở đầu plan.

## Bản đồ thực thi

| Batch | Contract | Mục | Tầng | Phụ thuộc | Status |
|---|---|---|---|---|---|
| B25a | [guideline_emitter](B25/b25a_guideline_emitter_contract.md) | 1 | Lõi | — | `WAITING_FOR_APPROVAL` |
| B25b | [contract_tree_emitter](B25/b25b_contract_tree_emitter_contract.md) | 2 | Lõi | B25a | `WAITING_FOR_APPROVAL` |
| B26a | [doc_checker_emitter](B26/b26a_doc_checker_emitter_contract.md) | 4 | Adapter | B25b | `WAITING_FOR_APPROVAL` |
| B26b | [modules_deepen_module](B26/b26b_modules_deepen_module_contract.md) | 3 | Nội dung + Lõi | B25b | `WAITING_FOR_APPROVAL` |
| B27a | [frontend_deepen_module](B27/b27a_frontend_deepen_module_contract.md) | 5 | Nội dung + Lõi | B26b | `WAITING_FOR_APPROVAL` |
| B27b | [v9_sync_release](B27/b27b_v9_sync_release_contract.md) | — | QA | tất cả | `WAITING_FOR_APPROVAL` |

Thứ tự bắt buộc: `B25a → B25b → (B26a ∥ B26b) → B27a → B27b`. Nội dung khoá trước lõi, lõi trước
adapter, QA cuối ([VibeCode.md](../../../VibeCode.md) Step 1).

`B26a` và `B26b` song song được: khác tầng, không đụng file chung.

## Vì sao B25b là batch ăn nhất

Bảy field của `contractSchema` (D43) map **thẳng** bảy mục bắt buộc của
[CONTRACT_STRUCTURE_RULE §3](../../CONTRACT_STRUCTURE_RULE.md):

| Field (D43) | Mục §3 |
|---|---|
| `micro_task` | 1. Micro-task target |
| `scope{in,out}` | 2. Scope |
| `checklist[]` | 3. Checklist |
| `interfaces[]{path,change,signature,est_lines}` | 4. Interfaces / Files expected to change |
| `risks[]{risk,mitigation}` | 5. Risks & mitigations |
| `verification[]{command,expected}` | 6. Verification plan |
| `status` | 7. Status |

Dữ liệu đã có sẵn từ [synthesizeFeatureContracts.ts](../../../../src/core/synthesizeFeatureContracts.ts);
thứ thiếu duy nhất là bộ render. Không cần thêm câu hỏi phỏng vấn nào.

## Ràng buộc chung mọi contract của lane

1. **Không đổi cây `docs/` tầng 1** ngoài việc *thêm* `Guideline.md`. Dự án emit bằng 8.x phải
   re-emit được mà không phải hỏi lại người dùng câu nào.
2. **Không tự chế `kind` mới** ngoài `'tool'` đã khoá ở D64.
3. Mọi artifact mới phải đăng ký vào
   [artifact-catalog.yaml](../../../Content/artifact-catalog.yaml) — không ghi file nằm ngoài catalog.
4. Đóng contract = cập nhật [CONTRACT_INDEX.md](../../CONTRACT_INDEX.md) **cùng commit**
   (`npm test` fail nếu lệch).
