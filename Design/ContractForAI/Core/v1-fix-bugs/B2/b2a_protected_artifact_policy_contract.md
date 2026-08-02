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

Spec: APPROVED | Implementation: PARTIAL | Proof: UNIT_ONLY

Cập nhật 2026-07-25 (bugfix, không phải implementation đầy đủ của contract): đã xoá check substring
`norm.includes('shapes/')`/`norm.includes('schemas/')` khỏi `classifyArtifact` — check này false-deny
mọi path người dùng chỉ TÌNH CỜ chứa "schemas/" hoặc "shapes/" (vd `src/schemas/user.ts`) vì không có
thư mục `shapes/`/`schemas/` nào thật sự được cài vào target project. Phần còn lại của checklist B2a
(exact catalog-driven managed-output, capability path binding chặt, scratch containment/size/TTL)
**chưa làm** — xem R07 trong finding-coverage-matrix.md.

Cập nhật 2026-08-02 (A1-P4): đóng phần "Scratch duy nhất nằm dưới
.design-everything/scratch/{session}/{question}/" của checklist §3 — `authorizeMutation` giờ nhận
`scratchContext` (session_id thật từ request + `progress.current_step` hiện tại) và deny khi path
scratch khớp session/question khác, cộng depth cap (chỉ `{session}/{question}/{file}`, không nested)
và extension allowlist. Đóng X02 (pre-create managed docs): `evaluatePreAction.ts` giờ luôn dùng
catalog thật; một managed-output path chỉ được coi "pre-create" hợp lệ khi chưa tồn tại trên đĩa VÀ
chưa nằm trong active tier-1 emit manifest (`getActiveManagedPaths`, gateSnapshot.ts) — đã claimed thì
deny `PROTECTED_ARTIFACT_MUTATION_DENIED` như managed-output khác. Còn lại của checklist §3 **chưa
làm**: internal capability chưa có issuer production thật (không có call site nào phát capability —
Core tự ghi state trực tiếp, không qua PreToolUse gate), operation binding, scratch size limit ở
write-gate (chỉ có ở read-time trong `loadQuestionSlots`), TTL cleanup, key allowlist đối chiếu
script.yaml. Implementation vẫn PARTIAL cho tới khi các mục đó đóng — xem R07 trong
finding-coverage-matrix.md.
