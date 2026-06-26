# Contract — W2D evaluateGate

> **Tầng:** Lõi. Nguồn: [Week-02](../../../../RoadMap/Month1/Week-02.md) + [gate-policy.md](../../../../Core/Schemas/gate-policy.md) + [gate-policy.yaml](../../../../Content/interview-script/gate-policy.yaml).

## 1. Micro-task target
Hàm thuần quyết định một gate đang đóng hay mở **chỉ dựa trên artifact** (file doc có tồn tại không), và một hành động tool có bị chặn không. Đây là lõi của "chưa xong doc, chưa code".

## 2. Scope
**In scope** — `src/core/evaluateGate.ts`:
- `evaluateGate(gate, existingDocs): { open: boolean; missing: string[] }` — `open = requires_docs ⊆ existingDocs`; `missing` = phần thiếu.
- `isBlocked(gate, tool, existingDocs): boolean` — `true` khi gate đóng VÀ `tool ∈ gate.blocks`.
- `passedGates(policy, existingDocs): string[]` — các gate đã mở (để append `gates_passed`).
- Nhận `existingDocs: string[]` (tên file đã emit) từ ngoài — KHÔNG tự đọc filesystem (giữ thuần; adapter W3 truyền vào).

**Out of scope**
- Đọc filesystem / heuristic Bash (W3 PreToolUse).
- Mutate progress (adapter append `gates_passed`).

## 3. Checklist
- [ ] `evaluateGate` trả `open=false` + `missing` đúng khi thiếu doc.
- [ ] `evaluateGate` `open=true` khi đủ `00-vision/01-personas/02-scope`.
- [ ] `isBlocked` đúng cho `Write/Edit/Bash` khi gate đóng; `false` khi gate mở.
- [ ] Hàm thuần; test xanh.

## 4. Interfaces / Files expected to change
```ts
export function evaluateGate(gate: GatePolicy['gates'][number], existingDocs: string[]): { open: boolean; missing: string[] };
export function isBlocked(gate: GatePolicy['gates'][number], tool: 'Write'|'Edit'|'Bash', existingDocs: string[]): boolean;
export function passedGates(policy: GatePolicy, existingDocs: string[]): string[];
```
- `[NEW]` `src/core/evaluateGate.ts`

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Engine tự đọc FS → khó test | TB | Nhận `existingDocs` qua tham số; adapter mới chạm FS. |
| So tên file lệch (path vs basename) | TB | Chuẩn hoá so theo basename file (vd `02-scope.md`). |

## 6. Verification plan
- `evaluateGate(scope-locked, ['00-vision.md'])` → `open=false, missing=['01-personas.md','02-scope.md']`.
- Đủ 3 doc → `open=true`.
- `isBlocked(scope-locked,'Write',[])` → `true`; với đủ doc → `false`.

## 7. Status
`WAITING_FOR_APPROVAL`
