# B2d — Exact gate evidence and recomputation contract

## 1. Micro-task target

Loại gate basename/file-exists-only và cache append-only; mỗi quyết định phải recompute từ exact artifact path, integrity, validation và evidence hiện tại.

## 2. Scope

### In scope

- Gate requirement schema theo exact relative path.
- Evidence non-empty/digest/managed status.
- Derived gates_passed có revocation.

### Out of scope

- Semantic doc quality chi tiết; thuộc B3a/B3b.
- Host hook mapping; thuộc B4a.

## 3. Implementation checklist

- [ ] requires_docs dùng canonical exact relative path từ artifact catalog, không so basename.
- [ ] Artifact chỉ hợp lệ khi regular file đúng root, non-empty sau trim, thuộc current managed manifest và digest khớp last successful emit.
- [ ] Gate requires_validation đọc current validation digest khớp plan/docs digests.
- [ ] requires_evidence đọc evidence pass hiện tại, không chỉ completed task id.
- [ ] evaluateGate là pure recomputation từ snapshot; không mutate state.
- [ ] gates_passed nếu còn giữ để hiển thị chỉ là cache kèm input_digest, bị thay toàn bộ/revoke khi snapshot đổi.
- [ ] Xóa/sửa/đổi symlink artifact làm gate đóng ngay.
- [ ] Duplicate basename ở docs/archive không có giá trị.
- [ ] Policy schema/linter reject path mơ hồ, duplicate requirement và artifact ngoài catalog.

## 4. Interfaces / Files expected to change

- [MODIFY] Design/Core/Schemas/gate-policy.md.
- [MODIFY] Design/Content/interview-script/gate-policy.yaml.
- [MODIFY] src/core/schemas/index.ts gate schema.
- [MODIFY] src/core/evaluateGate.ts — snapshot/evidence API.
- [NEW] src/core/gateSnapshot.ts — khoảng 70–120 dòng.
- [MODIFY] src/core/evaluateGate.test.ts.

Interface đích:

- buildGateSnapshot(root, manifests, validation, evidence) → immutable snapshot
- evaluateGate(gate, snapshot) → { open, missing, invalid, input_digest }
- evaluateAllGates(policy, snapshot) → derived status map

## 5. Risks & mitigations

- Hash cost: hash chỉ managed artifacts và cache theo stat trong một evaluation, không dùng cache làm authority qua lượt.
- User sửa docs có chủ ý: manifest mismatch đóng gate và chỉ dẫn re-emit/revalidate.
- Empty-but-large whitespace: bounded read/stream và content policy theo artifact type.

## 6. Verification plan

- docs/archive/00-vision.md không thỏa docs/00-vision.md.
- File rỗng, symlink, digest stale, validation digest stale đều đóng gate.
- Gate đã pass rồi xóa/sửa file phải revoke ngay.
- Cache gates_passed giả trong state không ảnh hưởng quyết định.
- Property test path canonicalization dùng module B2c.

## 7. Status

WAITING_FOR_APPROVAL
