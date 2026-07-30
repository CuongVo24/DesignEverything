# Báo cáo lane `QA-01` — `baseline-agent`

## Tóm tắt

- Kết luận: `PASS_WITH_FINDINGS`
- Commit/branch: `main@b392c1b6a8935ae1efcd1538cc82f1905f339606` (`main` ahead `origin/main` 25 commit)
- Thời gian: `2026-07-30`, kết thúc lúc `02:50:25 +07:00`
- OS / Node / npm: Windows `10.0.26200.8875` / Node `v24.11.1` / npm `11.6.2`
- Dung lượng trống ban đầu trên `E:`: `43.12 GB`
- Snapshot drift: `YES`. Nhiều phiên QA dùng chung working tree và sửa/xóa test, `package.json` trong lúc lane này chạy. Kết quả chỉ có giá trị exploratory, **không phải release evidence**.
- Phạm vi đã chạy: typecheck, lint, bundle build, hai full suite, kiểm tra Git sau build, timezone UTC targeted test, cùng một Vitest process chạy targeted suite hai lượt, scan test focus/skip/todo/type/lint escape, đối chiếu scripts với README/quickstart/runbook, public CLI error-envelope probe.
- Phần không chạy và lý do: không có check bắt buộc nào bị bỏ; không chạy full suite lần ba vì snapshot tiếp tục drift và run 2 đã hoàn tất.
- Finding: `S0: 0, S1: 0, S2: 0, S3: 0, S4: 2`

## Trạng thái working tree

Baseline trước khi chạy:

```text
M  src/adapters/claude/skill/render-inject.test.ts
M  src/core/turnCapability.test.ts
?? test/qa-campaign/
?? tsconfig.test.json
```

Trong và sau khi chạy, các thay đổi không thuộc QA-01 xuất hiện ở nhiều test tracked và `package.json`; file tạm `src/core/scratch-type-probe.test.ts` xuất hiện rồi bị xóa giữa lúc Vitest collect. QA-01 không tạo, sửa hay xóa các file này.

## Lệnh và kết quả

| Lệnh/probe | Exit code | Kết quả | Thời lượng | Bằng chứng |
|---|---:|---|---:|---|
| `rtk git status --short --branch` | 0 | PASS | ~6s | Chụp baseline dirty tree như trên |
| `rtk git rev-parse HEAD` | 0 | PASS | ~6s | `b392c1b6a8935ae1efcd1538cc82f1905f339606` |
| `rtk proxy node --version` / `rtk proxy npm --version` | 0 / 0 | PASS | ~6s mỗi lệnh | `v24.11.1` / `11.6.2` |
| Disk-free probe qua `Get-PSDrive E` | 0 | PASS | ~25s | `43.12 GB` trống |
| `rtk npm run typecheck` | 0 | PASS | ~195s | `tsc --noEmit`, không lỗi |
| `rtk npm run lint` | 0 | PASS | ~120s | `eslint .`, không lỗi/cảnh báo |
| `rtk npm run build:bundle` | 0 | PASS | ~132s | Ghi `dist/bundle/runtime.mjs` |
| `rtk git status --short` sau build | 0 | PASS_WITH_DRIFT | ~6s | Không có tracked source do build sửa; một scratch test từ phiên khác xuất hiện |
| `rtk npm test` — full run 1 | 1 | FAIL do snapshot drift | `826.33s` | `124 passed`, `1 failed suite`, `825 passed tests`; suite transient bị xóa khi collect |
| `rtk npm test` — full run 2 | 0 | PASS | `3363.55s` | `124/124` test files, `825/825` tests; không skip |
| UTC targeted: `TZ=UTC ... vitest run src/core/slugify.test.ts` | 0 | PASS | `10.97s` | `1/1` file, `6/6` tests |
| Một Node process gọi `startVitest(...)` hai lượt liên tiếp cho `slugify.test.ts` | 0 | PASS | `9.83s` + `4.98s` | Lượt 1 `6/6`, lượt 2 `6/6`; không thấy state leakage |
| Exact scan `.only(`, `.skip(`, `.todo(`, `xdescribe(`, `xtest(` | 0/1 (không match) | PASS | ~11s | Không có focus/skip/todo API |
| Scan `@ts-ignore`, `@ts-nocheck`, `expect.assertions(0)` | 1 (không match) | PASS | ~11s | Không có match |
| Scan `eslint-disable` | 0 | REVIEWED | ~11s | 5 blanket/inline suppressions ở production TypeScript và 1 suppression trong test; không vô hiệu hóa assertion |
| `rtk npx tsc --noEmit -p tsconfig.test.json` | 0 | PASS | ~92s | `TypeScript: No errors found` trên test tree hiện tại |
| Invalid public CLI JSON envelope trong thư mục temp | 1 | PASS | ~25s | `UNKNOWN_SUBCOMMAND`; output không chứa absolute workspace/user path |
| Đọc `package.json`, README, quickstart, web/mobile runbook, CONTRIBUTING | 0 | PASS_WITH_NOTE | — | Tất cả tên lệnh được tài liệu hóa đều tồn tại và dùng đúng exit semantics; thứ tự quality gate không thống nhất |

## So sánh hai full suite

| Thuộc tính | Run 1 | Run 2 |
|---|---:|---:|
| Exit | 1 | 0 |
| Test files | 124 pass + 1 transient fail | 124 pass |
| Tests | 825 pass | 825 pass |
| Skip | 0 | 0 |
| Duration | 826.33s | 3363.55s |

Tập test thực chất cùng có 825 test. Chênh lệch file/kết luận đến từ file `src/core/scratch-type-probe.test.ts` do phiên khác tạo rồi xóa khi run 1 đang collect. Run 2 sạch nhưng chậm hơn khoảng 4.1 lần; riêng `crossRuntimeReplay.test.ts` mất `2590.111s`, phù hợp với tranh chấp runner/tài nguyên trong chiến dịch dùng chung workspace hơn là một regression đã được cô lập.

## Finding `QA-01-F01` — Snapshot thay đổi giữa hai full suite làm baseline không tái lập

- Severity: `S4`
- Confidence: `high`
- Tỷ lệ tái hiện: `1/1` chiến dịch có drift; run 1 bị ảnh hưởng trực tiếp
- Thành phần: test orchestration / môi trường QA dùng chung working tree
- Phạm vi ảnh hưởng: độ tin cậy của toàn bộ số liệu baseline và so sánh repeatability
- Preconditions: nhiều tester chạy song song và sửa cùng working tree

### Bước tái hiện

1. Chụp `git status --short` trước suite.
2. Chạy `rtk npm test`.
3. Trong lúc collect, một phiên khác tạo rồi xóa `src/core/scratch-type-probe.test.ts`.
4. Chụp lại `git status --short`; quan sát thêm nhiều tracked test và `package.json` bị sửa.

### Expected

Hai full suite chạy trên cùng một snapshot và trả cùng tập file, số test, kết luận.

### Actual

Run 1 fail khi Vite không còn tải được scratch test đã bị xóa; run 2 pass sau khi file biến mất. Các file tracked tiếp tục đổi giữa lane.

### Bằng chứng

```text
Run 1:
FAIL src/core/scratch-type-probe.test.ts
Error: Failed to load url E:/DesignEverything/src/core/scratch-type-probe.test.ts
Test Files 1 failed | 124 passed
Tests 825 passed

Run 2:
Test Files 124 passed
Tests 825 passed
```

### Phân tích

- Nguyên nhân khả dĩ: các lane dùng chung working tree thay vì snapshot/worktree riêng.
- Vì sao chọn severity này: đây là rủi ro chất lượng bằng chứng, chưa chứng minh lỗi sản phẩm.
- Workaround: cấp mỗi lane một Git worktree/clone riêng, hoặc đóng băng snapshot và cấm mutation đến khi baseline xong.
- Test regression nên bổ sung: không phải product regression; thêm pre/post snapshot digest vào QA coordinator và hủy release evidence nếu digest đổi.
- Có thể trùng với: ghi nhận snapshot drift của coordinator/các lane khác.

## Finding `QA-01-F02` — Quality gate typecheck ở snapshot đầu không kiểm kiểu test

- Severity: `S4`
- Confidence: `high`
- Tỷ lệ tái hiện: `2/2` lần đọc cấu hình đầu lane cho cùng kết quả
- Thành phần: `package.json` scripts / `tsconfig.json`
- Phạm vi ảnh hưởng: lỗi type trong test có thể lọt qua `npm run typecheck`; Vitest transpile không thay thế TypeScript typecheck
- Preconditions: snapshot đầu lane, trước khi phiên khác sửa `package.json`

### Bước tái hiện

1. Đọc script `typecheck`: `tsc --noEmit`.
2. Đọc `tsconfig.json`.
3. Quan sát `include: ["src/**/*"]` và `exclude: ["**/*.test.ts"]`; thư mục top-level `test/**/*` cũng không nằm trong include.
4. Chạy riêng `rtk npx tsc --noEmit -p tsconfig.test.json` để kiểm test tree.

### Expected

Quality gate tĩnh dùng cho release kiểm cả production TypeScript lẫn test TypeScript, hoặc tài liệu nói rõ test types không thuộc gate.

### Actual

`npm run typecheck` đầu lane chỉ kiểm production. Test tree hiện tại không có lỗi khi kiểm bổ sung, nên đây là khoảng trống gate chứ chưa phải lỗi type đang tồn tại.

### Bằng chứng

```text
package.json (snapshot đầu):
"typecheck": "tsc --noEmit"

tsconfig.json:
"include": ["src/**/*"]
"exclude": ["node_modules", "dist", "**/*.test.ts"]

Supplemental:
rtk npx tsc --noEmit -p tsconfig.test.json
TypeScript: No errors found
```

### Phân tích

- Nguyên nhân khả dĩ: production build cố ý loại test nhưng cùng config được dùng cho quality gate.
- Vì sao chọn severity này: rủi ro chưa tạo failure thực tế; supplemental test-tree typecheck đang pass.
- Workaround: chạy thêm test tsconfig trong CI/release gate.
- Test regression nên bổ sung: một compile-only fixture chứng minh type error trong test làm quality gate fail.
- Có thể trùng với: thay đổi concurrent cuối lane đã thêm `typecheck:all` và gọi nó từ `npm test`; thay đổi đó chưa thuộc snapshot đã test đầy đủ.

## Observation không đủ bằng chứng thành bug

| ID | Quan sát | Rủi ro | Cách kiểm tiếp |
|---|---|---|---|
| `QA-01-O01` | README/quickstart dùng `npm ci` + `npm run build`; runbook dùng `npm install` và thứ tự `test → typecheck → lint`; CONTRIBUTING dùng `build → lint → test`. Tên lệnh đều hợp lệ. | Người đóng release có thể bỏ sót `build:bundle` hoặc test-typecheck vì không có một canonical gate order. | Thêm một script `verify` duy nhất và trỏ tất cả tài liệu vào script đó. |
| `QA-01-O02` | Public CLI invalid-command envelope không lộ path, nhưng raw Vitest diagnostics luôn in absolute repo path. | Log CI công khai có thể lộ cấu trúc máy dù product envelope đã redact. | Quyết định rõ threat model có bao gồm runner logs không; nếu có, sanitize ở CI log layer. |
| `QA-01-O03` | Run 2 chậm 3363.55s, trong đó cross-runtime replay chiếm 2590.111s, trong khi cùng test ở run 1 là 77.285s. | Timeout/flakiness khi nhiều lane chạy subprocess song song. | Benchmark lại 3 lần trên clean isolated worktree, không có runner khác. |

## Coverage và residual risk

- Đã kiểm: tất cả mandatory gates; repeatability; timezone khác; same-process rerun; skip/focus/todo; docs/scripts; build drift; public error path leak.
- Chưa kiểm: full suite trên clean immutable snapshot; Node 18/20; CI runner khác; POSIX.
- Rủi ro còn lại: run 2 pass không thể làm release evidence vì source/test/package đã đổi; cần chạy lại canonical gate trên worktree sạch sau khi hợp nhất các thay đổi concurrent.
