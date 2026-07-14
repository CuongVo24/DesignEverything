# V5 · Phác kỹ thuật B16a/B16b — Contract schema + Feature synthesis

> Sketch thiết kế cho [V5-ContractSynthesisPlan.md](V5-ContractSynthesisPlan.md). **Chưa phải schema khoá** — mục đích: chốt shape trước khi viết code (VibeCode Step 2). Bám type thật trong [`src/core/schemas/executionPlan.ts`](../../src/core/schemas/executionPlan.ts) và extractor trong [`src/core/validatePlan.ts`](../../src/core/validatePlan.ts).

## 1. Contract schema máy đọc (D43) — 7 mục thành field

7 mục của [CONTRACT_STRUCTURE_RULE](../ContractForAI/CONTRACT_STRUCTURE_RULE.md) §3 → zod. Đặt tại `src/core/schemas/contract.ts`.

```ts
import { z } from 'zod';
import { verificationCommandSchema } from './executionPlan.js';

// mục 4 — một dòng "Interfaces / Files expected to change"
export const contractInterfaceSchema = z.object({
  path: z.string().min(1),                       // "src/features/auth/login.ts"
  change: z.enum(['NEW', 'MODIFY']),
  signature: z.string().nullable().optional(),   // "loginUser(email,pw): Promise<Session>" — executor KHÔNG tự chế
  est_lines: z.number().int().positive(),        // ép trần ~200 (D42); vượt → tách nhóm
});

// mục 5 — một dòng bảng Risks & mitigations
export const contractRiskSchema = z.object({
  risk: z.string().min(1),
  level: z.enum(['low', 'medium', 'high']),
  mitigation: z.string().min(1),
});

export const contractStatusSchema = z.enum([
  'WAITING_FOR_APPROVAL', 'READY_TO_IMPLEMENT', 'IN_PROGRESS', 'DONE', 'BLOCKED',
]); // map thẳng CONTRACT_STRUCTURE_RULE §5

export const contractSchema = z.object({
  id: z.string().min(1),                         // "C-auth-login" hoặc "C-auth-login-a" khi tách
  feature_milestone: z.string().min(1),          // "M4-auth" — nối vào ExecutionPlanV3.milestones
  layer: z.enum(['core', 'content', 'adapter', 'app']), // mục "một tầng" — với dự án đích thường 'app'
  // (1) micro_task — một câu, một đơn vị triển khai được
  micro_task: z.string().min(1),
  // (2) scope In/Out — nêu rõ cái cố ý KHÔNG làm để chống trôi
  scope: z.object({ in: z.array(z.string()).min(1), out: z.array(z.string()).default([]) }),
  // (3) checklist tick được
  checklist: z.array(z.string()).min(1),
  // (4) interfaces
  interfaces: z.array(contractInterfaceSchema).min(1),
  // (5) risks
  risks: z.array(contractRiskSchema).default([]),
  // (6) verification — LỆNH CHẠY THẬT, tái dùng verificationCommandSchema của V3
  verification: z.array(verificationCommandSchema).min(1),
  // (7) status
  status: contractStatusSchema,
  // bind (D44) — con trỏ tới Conventions dự án đích; validator chặn nếu chế stack ngoài đây
  conventions_ref: z.string().min(1),            // ví dụ "docs/conventions/tech-stack.md"
  // truy vết ngược docs nguồn (mục 0 của rule): Must + entity + flow đã đẻ ra hợp đồng này
  derived_from: z.object({
    must_id: z.string().min(1),
    entity_ids: z.array(z.string()).default([]),
    flow_id: z.string().nullable().optional(),
  }),
});
export type Contract = z.infer<typeof contractSchema>;
```

> **Quan hệ với TaskCard V3**: mỗi `Contract` khi được duyệt sẽ **compile xuống một `TaskCard`** để chạy trên gate/evidence sẵn có — `interfaces[].path → allowed_paths`, `verification → commands`, `feature_milestone → milestone`. Runtime KHÔNG cần cơ chế thực thi mới; contract chỉ là lớp giàu hơn ngồi trên TaskCard.

## 2. `synthesizeFeatureContracts` — đọc field nào từ docs nào

Đặt tại `src/core/synthesizeFeatureContracts.ts`. Chạy **sau** khi `synthesizeExecutionPlan` đã ra skeleton (T0-T3) và skeleton đã `verified`.

### Input → nguồn field

| Cần gì | Đọc từ | Hàm/field có sẵn |
|---|---|---|
| Danh sách Must | `02-scope.md` / answers | `extractMustFeatures(answers)` (đã có) |
| Loại Won't (để KHÔNG sinh) | answers | `extractWontFeatures(answers)` (đã có) — bỏ khỏi tập sinh |
| Entity + quan hệ | `03-data-model.md` | **mới**: `parseDataModel(doc)` → `{entities[], relations[]}` |
| Bước flow của Must | `04-flows.md` | **mới**: `parseFlows(doc)` → `{flow_id, steps[]}[]` |
| Stack/paths hợp lệ | `ProjectProfile` + Conventions | `getRecipe()` (đã có) + Conventions emitter (B16a) |

### Thuật toán (deterministic — D42)

```
cho mỗi must ∈ extractMustFeatures(answers) \ extractWontFeatures(answers):
  milestone = "M4-" + slug(must)
  entities  = entity trong parseDataModel khớp must (tên/keyword)
  flow      = flow trong parseFlows khớp must
  weight    = f(1, |entities|, |flow.steps|)          # quy mô → số hợp đồng

  hợp đồng cơ bản cho một must (tăng dần theo weight):
    - C-{must}-data      nếu chạm entity mới        (layer=app, interfaces = model/schema files)
    - C-{must}-logic     luôn có                    (service/handler + verification chạy thật)
    - C-{must}-surface   nếu flow có bước UI/route   (route/component)

  với mỗi hợp đồng: nếu Σ est_lines > ~200 HOẶC chạm >1 tầng → tách -a/-b (D42)
  set status = WAITING_FOR_APPROVAL   # executor chưa được chạm (D46: manager duyệt trước)
  derived_from = { must_id, entity_ids, flow_id }
  conventions_ref = <đường dẫn Conventions emit ở B16a>
```

### Output

- Ghi thêm milestone `M4-*…` vào `ExecutionPlanV3.milestones` (nối tiếp M0-M3).
- Ghi `contracts/*.json` (một file/hợp đồng) theo taxonomy mới, + `trace_links` **trỏ task compile từ hợp đồng** (không trỏ skeleton) — đây là chỗ D41 sửa cái "mọi Must trỏ T0-T3".
- Mở **just-in-time**: chỉ sinh hợp đồng cho feature-milestone kế tiếp, không dựng cả cây.

## 3. Điều validator (B16a) phải bắt được
- Contract sai shape (thiếu mục 4/6, interface không signature khi cần) → fail.
- `interfaces[].path` nằm ngoài `conventions_ref` allowed-path → fail (D44).
- `trace_link.task_ids` trỏ task type `scaffold`/`skeleton` cho một Must feature → fail (D41).
- `verification` rỗng hoặc chỉ `file-exists` cho task `implementation` → fail (đòi lệnh chạy thật, chống "done giả" D45/D36).
- Must ∈ Won't mà vẫn sinh hợp đồng → fail.

## 4. Ranh giới cố ý chưa chốt ở sketch này
- `parseDataModel`/`parseFlows` chi tiết (regex vs cú pháp bảng chuẩn trong template 03/04) → chốt ở B16b khi xem template thật.
- Ngưỡng `weight → số hợp đồng` cụ thể → hiệu chỉnh bằng fixture nhiều quy mô ở B18a, không hardcode sớm.
