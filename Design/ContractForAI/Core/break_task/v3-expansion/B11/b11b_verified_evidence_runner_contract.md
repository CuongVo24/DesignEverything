# Contract — B11b Verified evidence runner

> Tầng: Lõi. Nguồn: V3 Post-implementation Review F11-02, D36. Phụ thuộc: B11a.

## 1. Micro-task target

Thay evidence tự khai bằng evidence do runner thực thi đúng verification command của active task và lưu output/artifact đã định danh.

## 2. Scope

**In scope**

- Định nghĩa `VerificationCommand { id, argv, cwd, expected }`; `expected.kind` chỉ là `exit-code-zero`, `output-includes` hoặc `file-exists`, không dùng prose không máy-chấm được.
- Định nghĩa `VerifiedEvidenceRecord { task_id, command_id, argv, cwd, exit_code, stdout_sha256, stderr_sha256, artifact_digests, captured_at, source: "runner" }`; output thô đặt trong `.design-everything/evidence/<task>/<command>.{stdout,stderr}.log`.
- Thêm `runTaskVerification({ workspace, plan, state, task_id, command_id })` chỉ chạy command id của active task, đánh giá `expected`, hash output/artifact rồi append record.
- Đổi CLI từ `record-evidence --exit-code --observed --artifact` sang `verify --task <id> --command <id>`; không có cờ nào nhận exit code, observed result hay pass từ caller.
- Exit khác 0, expected không match, artifact thiếu hoặc runner error giữ task ở verifying/repairing và lưu evidence failure; không mở task tiếp theo.

**Out of scope**

- Không cấp Internet, privilege, package install hoặc command ngoài plan.
- Không làm execution sandbox; guard adapter và diff enforcement thuộc B11e/B12.
- Không lấy screenshot/browser evidence; đó là extension sau V4.

## 3. Checklist

- [ ] Plan schema không còn command verification dạng string mơ hồ ở đường runner; mỗi command có id/argv/expected rõ.
- [ ] CLI reject cờ legacy tự khai và không có API public nào mark task complete chỉ từ `exit_code: 0` do caller truyền.
- [ ] Evidence pass/fail đều chứa source runner, hash output và artifact digest; log path không rời workspace.
- [ ] Artifact `file-exists` phải tồn tại sau command; path traversal, symlink outside workspace và duplicate command evidence bị reject.
- [ ] Test chứng minh fake `--exit-code 0`, command id không thuộc task và output không đạt expected không thể mở task kế tiếp.

## 4. Interfaces / Files expected to change

- [MODIFY] `src/core/schemas/executionPlan.ts`, ≤120 dòng: `VerificationCommand`/expected schema thay command string runtime.
- [MODIFY] `src/core/schemas/executionState.ts`, ≤120 dòng: `VerifiedEvidenceRecord`, artifact digest và evidence source enum.
- [NEW] `src/core/runTaskVerification.ts`, ≤200 dòng: spawn argv không shell, capture/hash/check expected/append evidence.
- [MODIFY] `src/core/advanceExecutionState.ts`, ≤140 dòng: chỉ nhận verified record từ runner path.
- [MODIFY] `src/core/index.ts` và schema exports, ≤50 dòng.
- [MODIFY] `adapter/claude-code/cli.mjs`, ≤140 dòng: verb `verify`, xóa self-report `record-evidence` flags.
- [NEW] `src/core/runTaskVerification.test.ts`, ≤200 dòng và fixture command pass/fail/artifact/path traversal.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Chạy command qua shell tạo injection/bypass | Cao | Dùng `spawn` với `argv`, không `exec`/string interpolation; cwd canonical dưới workspace. |
| Log chứa secret hoặc phình lớn | TB | Cap kích thước, redact biến môi trường phổ biến, chỉ hash + file local; không gửi telemetry. |
| Test không portable Windows | TB | Fixture Node script portable; command argv riêng theo platform chỉ khi profile đã nêu. |

## 6. Verification plan

- `npx vitest run runTaskVerification executionState`
- `npm run typecheck && npm run lint && npm run build`
- CLI E2E: pass thật → evidence log/hash → next mở; fail thật/artifact thiếu → repairing; fake legacy flags và task/command không khớp → exit non-zero.
- Inspect evidence fixture để xác nhận stdout/stderr/file hash được tạo bởi runner, không từ input CLI.

## 7. Status

WAITING_FOR_APPROVAL
