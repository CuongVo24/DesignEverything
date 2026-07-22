# B5d — Documentation, version and release truth sync contract

## 1. Micro-task target

Đồng bộ schema/README/quickstart/glossary/conformance/release claims với runtime đã test, tách journey thật khỏi simulation và khóa next-MAJOR migration.

## 2. Scope

### In scope

- Core/Adapter/Content docs và DecisionLog/Versioning.
- Quickstart thật vs simulation.
- Generated count/journey tables và release checklist.

### Out of scope

- Thay đổi runtime ngoài lỗi docs phát hiện lúc sync; phải quay về contract primary tương ứng.

## 3. Implementation checklist

- [ ] Ghi DecisionLog cho F01–F18 và lý do next MAJOR; cập nhật Versioning/migration compatibility.
- [ ] state-schema/gate-policy/interview-script/adapter docs phản ánh capability, transaction, phase, blocked kind, ownership và gate recompute.
- [ ] Glossary sửa phạm vi câu hỏi hiện hành: CAL0, S0–S8, R1 và W/M/C; bỏ claim S0–S7/S0–S6 lỗi thời.
- [ ] README/quickstart dùng artifact/journey catalog generated data; không hardcode 10/11/12/13 trong prose current-state.
- [ ] Quickstart “5 phút thật” gồm install target-local, mở Claude Code, /design-everything và handoff /build; nêu thời lượng thực tế nếu interview không thể 5 phút.
- [ ] Đưa Vitest dogfood vào mục Simulation/Test, không gọi là trải nghiệm Claude Code thật.
- [ ] Bỏ file:///e:/... và absolute local links; dùng relative repo links.
- [ ] Installer/skill/CLI docs đều nói emit xong chưa code, bước kế là /build validate.
- [ ] ConformanceMatrix claim hard/soft/self-contained/deepen/parity chỉ khi B5a test có evidence.
- [ ] Release note liệt kê migration, breaking changes, recovery, known limitations và test commands/results.
- [ ] CI lint generated docs/catalog digest và cấm stale current-version phrases/counts.

## 4. Interfaces / Files expected to change

- [MODIFY] README.md và docs/quickstart.md.
- [MODIFY] Design/Glossary.md, Design/DecisionLog.md, Design/Core/Versioning.md.
- [MODIFY] Design/Core/Schemas/*.md liên quan.
- [MODIFY] Design/Adapters/claude-code.md và Design/Adapters/ConformanceMatrix.md.
- [MODIFY] Design/Content/interview-script/README.md.
- [NEW] Design/RoadMap/v7-release-note.md hoặc next-MAJOR tương ứng.
- [NEW] test/docs/runtime-truth.test.ts.

## 5. Risks & mitigations

- Docs đi trước code: B5d chỉ chạy sau B5a–B5c; claims link test/report id.
- Version repo đã đổi: chọn next MAJOR tại implementation, cập nhật đồng bộ một commit.
- Generated block khó đọc: giữ source link/version và script update idempotent.

## 6. Verification plan

- Link checker không còn absolute local/file URI.
- Runtime-truth test so question journey, artifact paths/counts, command/phase names và package version với catalog/manifests.
- Fresh-reader smoke theo quickstart thật đến /build validate.
- Simulation section chạy đúng command nhưng được label rõ.
- Full npm test/build + installed-runtime/fault/journey reports pass trước release claim.

## 7. Status

WAITING_FOR_APPROVAL
