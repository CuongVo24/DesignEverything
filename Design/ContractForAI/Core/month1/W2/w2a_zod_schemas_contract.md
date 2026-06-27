# Contract — W2A Zod schemas mirror lõi

> **Tầng:** Lõi (đụng shape của public API — bám sát schema, không tự chế field). Nguồn: [Week-02](../../../../RoadMap/Month1/Week-02.md) + [interview-script.md](../../../../Core/Schemas/interview-script.md) + [state-schema.md](../../../../Core/Schemas/state-schema.md) + [gate-policy.md](../../../../Core/Schemas/gate-policy.md).

## 1. Micro-task target
Viết zod schema TypeScript **mirror đúng** 3 schema markdown đã khoá, để mọi I/O validate ở ranh giới. Đây là nguồn type duy nhất cho engine (suy type từ zod, không khai báo trùng).

## 2. Scope
**In scope** — `src/core/schemas/`:
- `interviewScript.ts` — `questionSchema` đủ 8 field (`id`, `ask`, `default: string|null`, `target_doc`, `branch: enum(core|web|mobile)`, `gate: string|null`, `translate_back`, `depends_on: string[]`) + `scriptSchema` (`version`, `questions[]`). Áp luật validate interview-script §6 ở mức zod làm được (id non-empty, branch enum, default nullable...).
- `state.ts` — `progressSchema` đủ field state-schema §2, **gồm `answered_len_at_last_turn: number().int().min(0)`**, `phase` enum 3 giá trị, `branch: enum(web|mobile).nullable()`.
- `gatePolicy.ts` — `gateSchema` (`id`, `requires_docs: string[].nonempty`, `blocks: enum(Write|Edit|Bash)[]`, `message`) + `gatePolicySchema`.
- `index.ts` — export type suy ra: `export type Question = z.infer<typeof questionSchema>` v.v.

**Out of scope**
- Đọc file (loaders) → W2B. Logic advance/gate → W2C/W2D.
- Ràng buộc liên-file (target_doc ∈ taxonomy, gate ∈ gate-policy) → kiểm ở loader/test, không nhồi vào zod đơn lẻ.

## 3. Checklist
- [x] 3 file schema + `index.ts` export type qua `z.infer`.
- [x] `answered_len_at_last_turn` có trong `progressSchema`.
- [x] `branch` enum + nullable đúng cả ở question (core/web/mobile) và state (web/mobile/null).
- [x] Không khai báo `interface`/`type` trùng shape ở nơi khác — chỉ suy từ zod.
- [x] `npm run typecheck` xanh.

## 4. Interfaces / Files expected to change
```ts
// src/core/schemas/index.ts
export type Question = z.infer<typeof questionSchema>;
export type Script = z.infer<typeof scriptSchema>;
export type Progress = z.infer<typeof progressSchema>;
export type GatePolicy = z.infer<typeof gatePolicySchema>;
```
- `[NEW]` `src/core/schemas/{interviewScript,state,gatePolicy,index}.ts`

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Zod lệch schema markdown | Cao | Đối chiếu từng field với bảng §2 mỗi schema; field thiếu = fail typecheck ở W2B. |
| Khai báo type trùng | TB | Chỉ `z.infer`, cấm interface song song. |
| Nhồi ràng buộc liên-file vào zod | TB | Để dành cho loader/test (W2B/W2E). |

## 6. Verification plan
- `npm run typecheck` xanh.
- Test nhỏ: `progressSchema.parse(<fixture init-s0>)` pass; bản thiếu `answered_len_at_last_turn` → throw.

## 7. Status
`DONE`

### Quyết định thực tế & Nghiệm thu
- Đã tạo các Zod schema tương ứng chính xác với đặc tả Markdown đã chốt trong `src/core/schemas/`:
  - `interviewScript.ts`: `questionSchema` và `scriptSchema`.
  - `state.ts`: `progressSchema` (bao gồm `answered_len_at_last_turn`).
  - `gatePolicy.ts`: `gateSchema` và `gatePolicySchema` (có bổ sung ràng buộc `.refine()` để đảm bảo các giá trị trong mảng là duy nhất).
  - `index.ts`: Export tất cả schema và suy luận các kiểu TypeScript tương ứng thông qua `z.infer`.
- Đã cập nhật `src/smoke.test.ts` để kiểm chứng logic validation trên các progress fixture (`init-s0.json` thành công, `missing-field.json` thất bại).
- Hệ thống chạy typecheck, lint, và vitest xanh hoàn toàn.
