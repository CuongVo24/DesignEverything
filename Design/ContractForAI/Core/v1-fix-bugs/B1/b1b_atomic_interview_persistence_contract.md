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

WAITING_FOR_APPROVAL
