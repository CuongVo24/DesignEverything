# B1b — Atomic interview persistence contract

## 1. Micro-task target

Loại trạng thái partial khi commit lưu progress trước answers/slots bằng một canonical transaction có revision, recovery và failure-injection rõ ràng.

## 2. Scope

### In scope

- Canonical interview store chứa progress, answers, slots/provenance và capability state.
- Atomic write, lock/CAS, checksum, backup và crash recovery trên Windows/Linux.
- Migration từ các file progress/answers hiện hành.

### Out of scope

- Transaction của cây docs emit; thuộc B3d.
- Nội dung hợp lệ của answer/slot; thuộc B3a.
- Installer migration UI; thuộc B4d.

## 3. Implementation checklist

- [ ] Chọn .design-everything/interview-state.json làm nguồn authoritative duy nhất ở v7.
- [ ] Envelope gồm schema_version, state_revision, session, progress, answers, slots, integrity checksum và updated_at.
- [ ] progress.json/answers.json cũ chỉ là migration input; không còn được hook/CLI đọc độc lập sau migration.
- [ ] Mọi commit: acquire workspace lock → load+validate → CAS revision → mutate in memory → validate toàn envelope → write temp cùng volume → flush → atomic rename.
- [ ] Capability consumption, answer append, slot update và next-step advance nằm trong một mutation.
- [ ] Có journal/recovery marker đủ để phân biệt committed file, temp orphan và corrupt canonical.
- [ ] Recovery không chọn file mới hơn chỉ theo timestamp; dùng revision + checksum + commit marker.
- [ ] Lock có timeout/reason code và không tự xóa lock đang sống.
- [ ] Migration tạo backup có version, chạy một lần idempotent và fail closed nếu hai nguồn cũ mâu thuẫn.
- [ ] Không ghi projection compatibility nếu việc đó có thể trở thành nguồn authority; nếu cần debug view thì sinh từ canonical revision và gắn non_authoritative=true.

## 4. Interfaces / Files expected to change

- [NEW] src/core/interviewStore.ts — khoảng 150–200 dòng.
- [NEW] src/core/schemas/interviewStore.ts — khoảng 45–70 dòng.
- [MODIFY] src/core/loadProgress.ts — adapter compatibility mỏng hoặc retire.
- [MODIFY] src/core/advanceState.ts — nhận envelope/revision transaction.
- [NEW] src/core/migrateInterviewStore.ts — khoảng 80–130 dòng.
- [MODIFY] Design/Core/Schemas/state-schema.md và Design/Core/Versioning.md.
- [NEW] src/core/interviewStore.test.ts.

Interface đích:

- loadInterviewStore(root, recoveryPolicy) → validated envelope
- transactInterviewStore(root, expectedRevision, mutator) → committed envelope
- migrateInterviewStore(root) → migrated | already-current | explicit-error

## 5. Risks & mitigations

- rename semantics khác Windows: temp cùng directory, đóng handle trước rename, test thật trên Windows CI.
- Process chết sau rename trước cleanup: canonical checksum/revision thắng; cleanup idempotent.
- Lock stale: lưu pid/session/created_at và chỉ recovery theo policy đã test.
- Migration làm mất dữ liệu: backup bất biến + dry-run report + không overwrite khi conflict.

## 6. Verification plan

- Inject failure ở trước temp write, giữa write/flush, trước rename, sau rename và trước cleanup.
- Sau mỗi failure, restart rồi load phải thấy toàn bộ old revision hoặc toàn bộ new revision, không tổ hợp lai.
- Parallel CAS: một writer thắng, writer còn lại nhận REVISION_CONFLICT.
- Corrupt canonical/checksum mismatch: fail closed với recovery command; không trả state rỗng.
- Migration fixtures: progress-only, answers-only, matching pair, conflicting pair, repeated migration.

## 7. Status

Spec: APPROVED | Implementation: IMPLEMENTED | Proof: UNIT_ONLY

Cập nhật 2026-08-01: `loadProgress` chỉ được dựng state mới khi workspace thật sự chưa có marker quản
lý nào. Có canonical store hoặc legacy answers thì lỗi parse/schema/checksum được propagate fail-closed,
không được reset thành state mới; regression ở `src/core/loadProgress.test.ts`. Canonical commit hiện đi
qua CAS có revision.

Cập nhật 2026-08-02: `cleanupOrphanTempFiles` xóa `interview-state.json.tmp.*` mồ côi mỗi lần
`transactInterviewStore`/`initializeInterviewStore`/`migrateInterviewStore` giữ lock — an toàn vì giữ
được lock nghĩa là không writer sống nào đang ghi dở, nên file tmp còn sót chỉ có thể tới từ process đã
chết; không cần file journal riêng vì hậu tố `.tmp.*` cùng checksum trong envelope đã đủ phân biệt
committed/temp/corrupt. `migrateInterviewStore` giờ fail-closed thêm hai ca: answers.json có dữ liệu
nhưng progress.json không tồn tại (`MIGRATION_BLOCKED_ANSWERS_WITHOUT_PROGRESS` — trước đây bị âm thầm
coi là "no-legacy" và mất dữ liệu), và progress.json/answers.json không có bước nào trùng nhau
(`MIGRATION_BLOCKED_LEGACY_CONFLICT`). Đã xác nhận: `commitInterviewAnswer` gộp capability consumption +
answer + slots + step advance vào đúng một `transactInterviewStore` mutation (một revision bump);
`saveProgress` không còn caller production nào (chỉ dùng cho fixture/migration). Toàn bộ 10 mục
implementation checklist ở §3 đã đóng — chuyển `IMPLEMENTED`. Proof giữ `UNIT_ONLY` vì chưa có seam
evidence installed-runtime/fault-injection qua CLI production thật (việc của B5b, Gate A2).
