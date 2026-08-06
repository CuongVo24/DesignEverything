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

- [x] requires_docs dùng canonical exact relative path từ artifact catalog, không so basename.
- [x] Artifact chỉ hợp lệ khi regular file đúng root, non-empty sau trim, thuộc current managed manifest và digest khớp last successful emit.
- [x] Gate requires_validation đọc current validation digest khớp plan/docs digests.
- [x] requires_evidence đọc evidence pass hiện tại, không chỉ completed task id.
- [x] evaluateGate là pure recomputation từ snapshot; không mutate state.
- [x] gates_passed nếu còn giữ để hiển thị chỉ là cache kèm input_digest, bị thay toàn bộ/revoke khi snapshot đổi.
- [x] Xóa/sửa/đổi symlink artifact làm gate đóng ngay.
- [x] Duplicate basename ở docs/archive không có giá trị.
- [x] Policy schema/linter reject path mơ hồ, duplicate requirement và artifact ngoài catalog.

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

Spec: APPROVED | Implementation: IMPLEMENTED | Proof: UNIT_ONLY

Cập nhật 2026-07-30 (P2.5 vocabulary sync, không phải implementation): chuẩn hoá về đúng 3 trục
khớp README.md. X10 (gate so basename nên docs/archive giả artifact) và X11 (gates_passed
append-only, không revoke) trong finding-coverage-matrix.md nay đã FIXED — `evaluateGate.ts`
candidateKeys không basename-anywhere, và `evaluatePreAction.ts` derive `gates_passed` fresh mỗi
lần (db90029). R09 (gate snapshot chưa xác minh manifest/digest active) vẫn OPEN.

Cập nhật 2026-08-06 (A1-P5): R09 đối chiếu lại `finding-coverage-matrix.md` — đã ghi `FIXED` từ
trước (P5.1/DEBT3.1, `src/core/gateSnapshot.test.ts`), note "vẫn OPEN" ở trên đã lỗi thời, không
còn khớp code lẫn matrix. Đóng 2 mục còn lại thật của checklist §3:

- **Symlink escape** — `buildGateSnapshot`'s artifact loop và `computeManifestBinding` dùng
  `statSync`/`readFileSync` (theo symlink) thay vì `lstatSync`; một symlink thay thế artifact thật,
  trỏ ra ngoài workspace, đọc như file hợp lệ có digest khớp. Sửa: `lstatSync` trước, symlink luôn
  coi là `exists: false` (không theo target). Test: `gateSnapshot.test.ts`'s "symlink artifacts must
  never be treated as valid" (skip khi môi trường không có quyền tạo symlink — Windows cần Developer
  Mode/elevated, xác nhận bằng probe runtime, không hardcode skip theo OS).
- **Policy linter — artifact ngoài catalog** — trước đây không gì cross-reference `requires_docs`
  của gate-policy.yaml với artifact-catalog.yaml; một path gõ sai/lỗi thời sẽ khoá gate vĩnh viễn mà
  không ai biết tới khi chạy thật. Thêm test content-integrity (`contentIntegrity.test.ts`) so từng
  `requires_docs` (basename) với path trong catalog. "path mơ hồ" (X10) và "duplicate requirement"
  (uniqueness refine trong `gateSchema` + duplicate-id check trong `loadGatePolicy`) đã đóng từ
  trước, chỉ riêng "artifact ngoài catalog" là mục thật còn thiếu.

Checklist §3 đủ 9/9. Implementation → `IMPLEMENTED`.
