# Contract — W2B Loaders (script + gate-policy + progress)

> **Tầng:** Lõi. Nguồn: [Week-02](../../../../RoadMap/Month1/Week-02.md) + [claude-code.md](../../../../Adapters/claude-code.md) §"Cấu trúc module" + W2A schemas.

## 1. Micro-task target
Ba hàm lõi đọc + validate file nguồn ở ranh giới I/O: `script.yaml`, `gate-policy.yaml`, `progress.json`. Mọi dữ liệu vào hệ thống đều đi qua zod (W2A).

## 2. Scope
**In scope** — `src/core/`:
- `loadScript.ts` → `loadScript(path): Script` — đọc YAML (`yaml`), `scriptSchema.parse`. Kiểm thêm: `id` duy nhất; `depends_on` chỉ trỏ id xuất hiện trước; câu `web/mobile` không đứng trước `S6`.
- `loadGatePolicy.ts` → `loadGatePolicy(path): GatePolicy` — đọc `gate-policy.yaml`, `gatePolicySchema.parse`; kiểm `id` gate duy nhất.
- `loadProgress.ts` → `loadProgress(path): Progress` + `saveProgress(path, p)` — đọc/ghi JSON; nếu file chưa tồn tại, `loadProgress` trả state khởi tạo mặc định (S0, mảng rỗng, `answered_len_at_last_turn=0`); validate khi đọc, fail rõ field sai.

**Out of scope**
- Logic advance (W2C), evaluate gate (W2D).
- Ràng buộc `target_doc ∈ taxonomy` / `gate ∈ gate-policy` (test W2E đối chiếu chéo).

## 3. Checklist
- [ ] `loadScript` validate + 3 kiểm liên-câu (unique id, depends_on hợp lệ, thứ tự nhánh).
- [ ] `loadGatePolicy` validate + unique gate id.
- [ ] `loadProgress` tự khởi tạo khi thiếu file; `saveProgress` ghi JSON hợp lệ.
- [ ] Mọi hàm validate ở ranh giới; sai schema → throw có thông tin field.
- [ ] `npm run typecheck` + unit test loader xanh.

## 4. Interfaces / Files expected to change
```ts
export function loadScript(path: string): Script;
export function loadGatePolicy(path: string): GatePolicy;
export function loadProgress(path: string): Progress;
export function saveProgress(path: string, p: Progress): void;
```
- `[NEW]` `src/core/{loadScript,loadGatePolicy,loadProgress}.ts`

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Parse YAML lỗi im lặng | TB | Bọc parse + zod; throw kèm path + field. |
| `loadProgress` "chữa cháy" state hỏng | Cao | Chỉ tự khởi tạo khi **thiếu file**; file tồn tại mà sai schema → throw, không tự sửa (claude-code.md SessionStart ca biên). |

## 6. Verification plan
- `loadScript('Design/Content/interview-script/script.yaml')` pass, trả 17 câu.
- `loadGatePolicy('.../gate-policy.yaml')` trả gate `scope-locked`.
- `loadProgress` file thiếu → state S0 mặc định; fixture `invalid/*` → throw.

## 7. Status
`WAITING_FOR_APPROVAL`
