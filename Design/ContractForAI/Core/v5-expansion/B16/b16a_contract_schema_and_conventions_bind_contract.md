# Contract — B16a Contract schema & Conventions bind

> Tầng: Lõi. Nguồn: V5-ContractSynthesisPlan B16a, D43–D44, sketch V5-B16b §1/§3. Phụ thuộc: B15b (V4 DONE).

## 1. Micro-task target

Khoá `contractSchema` máy đọc (7 mục CONTRACT_STRUCTURE_RULE thành field) + emitter lớp Conventions cho dự án đích + validator bind, chưa sinh hợp đồng nào. Đây là public contract mới, mở đường cho B16b.

## 2. Scope

**In scope**

- `contractSchema` (zod) tại `src/core/schemas/contract.ts`: `micro_task`, `scope{in,out}`, `checklist[]`, `interfaces[]{path,change,signature,est_lines}`, `risks[]{risk,level,mitigation}`, `verification[]` (tái dùng `verificationCommandSchema` V3), `status`, `conventions_ref`, `derived_from{must_id,entity_ids,flow_id}`.
- `compileContractToTaskCard(contract)`: map `interfaces[].path → allowed_paths`, `verification → commands`, `feature_milestone → milestone`, `derived_from → trace`. Không tạo cơ chế runtime mới.
- Conventions emitter `emitProjectConventions({architectureDoc, constraintsDoc, profile})` → `docs/conventions/*.md` (tech-stack pin, coding standard, test tiers, allowed-path discipline) suy từ `05-architecture`/`06-constraints` + `ProjectProfile`.
- `validateContract(contract, conventions)`: chặn sai shape; chặn `interfaces[].path` ngoài allowed-path của Conventions; chặn `verification` rỗng hoặc chỉ `file-exists` cho task type implementation; chặn contract chế stack/dep ngoài Conventions.
- Bump schema theo `Versioning.md` (MAJOR) + cập nhật `ConformanceMatrix.md`.

**Out of scope**

- Không sinh hợp đồng từ docs (B16b), không phase review (B17a), không adapter (B17b).
- Không đọc data-model/flows ở batch này.

## 3. Checklist

- [ ] `contractSchema` reject contract thiếu bất kỳ mục nào trong 7 mục hoặc thiếu `conventions_ref`/`derived_from`.
- [ ] `compileContractToTaskCard` ra `TaskCard` hợp lệ theo `executionPlanSchemaV3`; round-trip giữ nguyên allowed_paths và commands.
- [ ] `emitProjectConventions` sinh tech-stack pin đúng `ProjectProfile` (không hardcode Node khi profile là Python).
- [ ] `validateContract` chặn được: path ngoài Conventions, verification rỗng, stack ngoài Conventions.
- [ ] Versioning + ConformanceMatrix cập nhật cho public schema mới.

## 4. Interfaces / Files expected to change

- [NEW] `src/core/schemas/contract.ts`, ≤160 dòng.
- [NEW] `src/core/compileContractToTaskCard.ts`, ≤120 dòng.
- [NEW] `src/core/emitProjectConventions.ts`, ≤180 dòng.
- [NEW] `src/core/validateContract.ts`, ≤180 dòng.
- [NEW] `src/core/schemas/contract.test.ts`, `compileContractToTaskCard.test.ts`, `validateContract.test.ts`, ≤200 dòng/file.
- [MODIFY] `Design/Core/Versioning.md`, `Design/Adapters/ConformanceMatrix.md`, `Design/Content/taxonomy.md` (thêm `contracts/`, `docs/conventions/`), ≤120 dòng/file.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Contract schema drift khỏi TaskCard runtime | Cao | `compileContractToTaskCard` là cầu duy nhất; test round-trip bắt drift. |
| Conventions emit sai stack | Cao | Suy từ `ProjectProfile` đã confirmed (D38), fixture 3 profile. |
| Mở taxonomy mới không versioned | TB | Bump MAJOR + ConformanceMatrix trong cùng batch. |

## 6. Verification plan

- `npx vitest run contract compileContractToTaskCard validateContract emitProjectConventions`
- `npm run typecheck && npm run lint && npm run build`
- Fixture 3 profile (node-cli, vite-web, python-cli): emit Conventions → validateContract chặn đúng 4 ca vi phạm (path ngoài, verify rỗng, stack lạ, sai shape).

## 7. Status

DONE

> Đã code: `schemas/contract.ts`, `compileContractToTaskCard.ts`, `emitProjectConventions.ts`, `validateContract.ts` + tests. typecheck/lint sạch. Review 2026-07-14: est_lines/auto-split ban đầu là code chết → đã sửa ở B16b; shadowing biến `errors` trong `validateContract` đã dọn.
