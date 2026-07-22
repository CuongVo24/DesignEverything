# B2a — Protected artifact ownership policy contract

## 1. Micro-task target

Ngăn agent sửa trực tiếp state, answers, policy, script, managed docs và output manifest; chỉ Core transaction/emit được quyền mutate các artifact do engine sở hữu.

## 2. Scope

### In scope

- Phân loại ownership đường dẫn.
- Pure policy cho Write/Edit/shell-write.
- Scratch scope theo session/question.
- Internal mutation capability giữa adapter và Core.

### Out of scope

- Cú pháp command classifier; thuộc B2b.
- Glob/path canonicalization; thuộc B2c.
- Adapter hook wiring; thuộc B4a.

## 3. Implementation checklist

- [ ] Định nghĩa bốn lớp: engine-state, engine-policy, managed-output, user-owned và interview-scratch.
- [ ] Engine-state gồm canonical interview/execution state, plan, manifests, journals, locks và integrity metadata.
- [ ] Engine-policy gồm copied script/gate/shapes/deepen/schema/version manifest.
- [ ] Managed-output lấy từ artifact catalog B3c, không đồng nhất toàn bộ Design/ hoặc docs/.
- [ ] Pre-action request từ host không bao giờ được Write/Edit trực tiếp ba lớp engine/managed.
- [ ] Chỉ operation Core có internal capability scoped theo action + revision + exact paths mới mutate.
- [ ] Scratch duy nhất nằm dưới .design-everything/scratch/{session}/{question}/, có size/type/key allowlist và lifecycle cleanup.
- [ ] Không dùng scratch để override raw answer đã confirmed, policy hoặc past/future question.
- [ ] Direct write bị deny cả trong phase interview; xóa/rename/chmod/symlink cũng được coi mutation.
- [ ] Recovery sửa state phải đi qua command explicit có backup/audit, không mở Write tùy ý.

## 4. Interfaces / Files expected to change

- [NEW] src/core/artifactOwnership.ts — khoảng 100–160 dòng.
- [NEW] src/core/schemas/internalMutationCapability.ts — khoảng 30–50 dòng.
- [MODIFY] src/core/evaluatePreAction.ts — gọi ownership policy.
- [MODIFY] Design/Core/Schemas/gate-policy.md — ownership/action semantics.
- [NEW] src/core/artifactOwnership.test.ts.

Interface đích:

- classifyArtifact(path, installManifest, artifactCatalog) → ownership class
- authorizeMutation(action, actor, target, capability?) → decision + reason_code

## 5. Risks & mitigations

- Chặn user-owned docs: chỉ catalog manifest đánh dấu managed; file ngoài manifest giữ user-owned.
- Internal capability bị adapter giả: capability được Core phát và bind operation/revision; wrapper text không thể tự tạo.
- Scratch tích rác: TTL + cleanup idempotent, nhưng cleanup không được theo glob unresolved.

## 6. Verification plan

- Deny direct write/delete/rename cho progress, answers, execution-state, plan, policy, script và managed docs ở mọi phase.
- Allow user-owned doc ngoài manifest và đúng scratch path/schema.
- Symlink từ scratch ra ngoài vẫn deny.
- Internal emit/commit đúng capability được phép; reused/wrong-path capability deny.
- Regression: Design/ và docs/ không còn blanket allow.

## 7. Status

WAITING_FOR_APPROVAL
