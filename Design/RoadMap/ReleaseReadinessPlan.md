# Release Readiness Plan — vá 8 blocker trước khi cho người ngoài dùng thử

> **Ngày lập:** 2026-07-18. **Baseline:** `main@1c37f6e`, `npm test` = 268/268 xanh (54 file).
> **Mọi blocker dưới đây đã được tái xác minh trực tiếp trên source tại ngày lập** (không phải suy đoán): từng mục ghi rõ file:line bằng chứng.
> **Cách dùng file này:** mỗi Batch RB-xx là một contract TỰ ĐỨNG ĐƯỢC — copy nguyên một batch (kèm mục "Bối cảnh chung" ngay dưới) vào một session mới / executor yếu là đủ để thực thi, không cần đọc phần còn lại của plan.

---

## Bối cảnh chung (dán kèm mọi batch khi giao việc)

- Repo: `E:\DesignEverything` — engine TypeScript (`src/core`) + adapter (`adapter/claude-code`, `adapter/codex-plugin`). Nguồn sự thật sản phẩm: `README.md` + `FirstIdea.md`.
- Build: `npm run build` (tsc → `dist/`). Test: `npm test` (vitest). Lint: `npm run lint`. Typecheck: `npm run typecheck`.
- Kỷ luật bất biến của repo (KHÔNG batch nào được phá):
  1. **Fail-closed**: thiếu tín hiệu không bao giờ được diễn giải thành tín hiệu tốt.
  2. **Lõi béo, adapter gầy**: logic vào `src/core` hoặc `src/adapters/shared`; adapter chỉ INJECT/GATE/EMIT.
  3. **Engine tự quan sát**: agent không được tự khai "test xanh"; lệnh verify do engine chạy.
  4. Mọi thay đổi hành vi phải kèm/ sửa unit test tương ứng; kết thúc batch `npm test` phải xanh toàn bộ.
- Definition of Done chung cho MỌI batch: checklist của batch tick hết + `npm run build && npm run lint && npm test` xanh + không sửa file ngoài mục Interfaces của batch.

## Thứ tự & song song hoá

| Wave | Batch chạy song song được | Ghi chú phụ thuộc |
|---|---|---|
| 1 | RB-01, RB-02, RB-03, RB-04, RB-07 | Độc lập hoàn toàn về file (không đụng nhau) |
| 2 | RB-05 (cần RB-02 + RB-03 merge trước), RB-06 (cần RB-07 merge trước để pack kèm LICENSE) | RB-05 đụng `cli.mjs` (RB-02 đã sửa) và `renderNextStep.ts` (RB-03 đã sửa) |
| 3 | RB-08 | Viết docs phản ánh trạng thái SAU khi các batch trên xong |

Bản đồ đụng file (để 2 session không giẫm nhau): `adapter/*/cli.mjs` → RB-02 rồi RB-05; `renderNextStep.ts` → RB-03 rồi RB-05; `package.json` → RB-06 (RB-07 chỉ thêm field `license`, xung đột không đáng kể); còn lại mỗi file thuộc đúng một batch.

---

## RB-01 — Codex hook: không can thiệp dự án chưa init, không gate tool đọc

> **Tầng:** Adapter (Codex). Độc lập, nhỏ, ưu tiên CAO NHẤT — đây là lỗi phá máy người dùng: plugin đang chặn MỌI tool ở MỌI project không dùng DesignEverything.

### Hiện trạng (bằng chứng)
- Hook Codex [adapter/codex-plugin/hooks/pre-tool-use.mjs](../../adapter/codex-plugin/hooks/pre-tool-use.mjs) (hàm `main`, dòng 81–156) nhận mọi tool — kể cả `Read` (dòng 120–124 map thành `action_kind: 'read'`) — rồi gọi thẳng `evaluatePreAction` không có guard "dự án chưa init thì thôi".
- Core [src/core/evaluatePreAction.ts:111-119](../../src/core/evaluatePreAction.ts): thiếu `progress.json` → `deny` cứng (`progress-missing`). Đã tái hiện: payload `Read` bình thường trong repo bất kỳ bị deny vì thiếu `progress.json`.
- Guard ĐÚNG tham khảo ở hook Claude [adapter/claude-code/hooks/pre-tool-use.mjs:12-15](../../adapter/claude-code/hooks/pre-tool-use.mjs): không có `progress.json` → `process.exit(0)` (không can thiệp); và dòng 20–25: chỉ gác `Write`/`Edit`/`Bash`, tool khác cho qua.

### Micro-task target
Hook Codex chỉ được can thiệp khi workspace ĐÃ dùng DesignEverything, và chỉ gate hành vi ghi/shell — y hệt triết lý hook Claude — nhưng vẫn giữ fail-closed đầy đủ cho workspace đã init.

### Spec thay đổi
Trong `adapter/codex-plugin/hooks/pre-tool-use.mjs`, hàm `main()`, NGAY SAU khi parse payload thành công:
1. Tính `workspace = payload.cwd || process.cwd()`.
2. **Guard init:** nếu KHÔNG tồn tại `join(workspace, 'progress.json')` VÀ KHÔNG tồn tại `join(workspace, '.design-everything/execution-state.json')` → `allow()` và return. (Dự án không dùng DesignEverything → plugin phải vô hình.)
3. **Chỉ gate ghi/shell:** nếu `tool_name` không thuộc {`Bash`, `apply_patch`, `Write`, `Edit`} → `allow()` và return. Xoá nhánh xử lý `Read` (dòng 120–124) — đọc không bao giờ bị gate.
4. Giữ nguyên toàn bộ phần còn lại (fail-closed khi payload rỗng/hỏng, khi thiếu core runtime, khi evaluate lỗi) — các nhánh đó chỉ áp dụng SAU guard init.
5. Kiểm tra 2 hook còn lại của Codex ([post-tool-use.mjs](../../adapter/codex-plugin/hooks/post-tool-use.mjs), [permission-request.mjs](../../adapter/codex-plugin/hooks/permission-request.mjs)): nếu cùng thiếu guard init thì thêm y hệt bước 2.

### Out of scope
- KHÔNG sửa `evaluatePreAction` (hành vi deny-khi-thiếu-progress là ĐÚNG cho workspace đã init; guard nằm ở adapter).
- KHÔNG đổi format JSON output của hook.

### Checklist
- [ ] Payload `Read` bất kỳ trong workspace không có `progress.json` → allow.
- [ ] Payload `Write` trong workspace không init → allow (plugin vô hình).
- [ ] Payload `Write` trong workspace ĐÃ init nhưng docs chưa đủ → vẫn deny như cũ.
- [ ] Payload rỗng/hỏng trong workspace đã init → vẫn deny (fail-closed giữ nguyên).
- [ ] Unit test mới trong `src/adapters/codex/preToolUse.test.ts` (hoặc file test hook tương ứng) phủ 4 ca trên.

### Verification
```bash
npm run build && npm test
# Tái hiện tay (Git Bash, trong một thư mục KHÔNG có progress.json):
echo '{"tool_name":"Read","tool_input":{"path":"x.md"},"cwd":"."}' | node adapter/codex-plugin/hooks/pre-tool-use.mjs
# → JSON permissionDecision: "allow"
```

### Status: `DONE` (2026-07-19 — guard init + chỉ gate ghi/shell, tái hiện tay pass, 2 unit test mới)

---

## RB-02 — CLI `verify` truyền được xác nhận người dùng (mở kẹt scaffold)

> **Tầng:** Adapter CLI. Độc lập, nhỏ. Không có batch này, CẢ BA greenfield recipe kẹt vĩnh viễn ở T1-scaffold.

### Hiện trạng (bằng chứng)
- Cả 3 recipe đặt `requires_user_confirmation: true` cho command scaffold: [src/core/stackRecipes.ts:62](../../src/core/stackRecipes.ts) (node-cli `init-project`), dòng 159 (vite `init-vite`), dòng 240 (python `init-venv`).
- Core từ chối chạy khi thiếu xác nhận: [src/core/runTaskVerification.ts:70-77](../../src/core/runTaskVerification.ts) — reject với thông báo "Re-run verification with user_confirmed=true".
- CLI `verify` KHÔNG có cờ nào và KHÔNG truyền `user_confirmed`: [adapter/claude-code/cli.mjs:608-614](../../adapter/claude-code/cli.mjs) (call `runTaskVerification` chỉ với workspace/plan/state/task_id/command_id). Bản copy [adapter/codex-plugin/cli.mjs](../../adapter/codex-plugin/cli.mjs) cùng lỗi.

### Micro-task target
Thêm cờ `--confirm` cho subcommand `verify` ở cả hai CLI, truyền xuống `user_confirmed: true`. Giữ nguyên ngữ nghĩa an toàn: cờ này đại diện cho **người dùng thật đã đồng ý** — skill phải dặn agent hỏi người thật trước khi thêm cờ, không bao giờ tự thêm.

### Spec thay đổi
1. `adapter/claude-code/cli.mjs`, case `'verify'`: đọc `args.confirm` (parseArgs sẵn có đã hỗ trợ flag boolean — `--confirm` không có value sẽ thành `true`); truyền `user_confirmed: args.confirm === true` vào `core.runTaskVerification`.
2. Khi `runTaskVerification` reject vì thiếu confirmation: message lỗi hiện tại nói "user_confirmed=true" — CLI bắt riêng ca này và in thêm dòng hướng dẫn đúng cú pháp thật: `Hỏi người dùng thật; nếu họ đồng ý, chạy lại kèm --confirm`.
3. Đồng bộ y hệt sang `adapter/codex-plugin/cli.mjs` (file đang là bản copy — KHÔNG refactor gộp trong batch này, chỉ sửa song song; việc gộp là RB-06 ghi nhận nợ).
4. Cập nhật skill build [adapter/claude-code/skill/build/SKILL.md](../../adapter/claude-code/skill/build/SKILL.md) (và bản codex tương ứng): thêm quy tắc "command có requires_user_confirmation: agent PHẢI hỏi người dùng thật và chỉ thêm `--confirm` sau khi người dùng đồng ý trong chat".

### Out of scope
- KHÔNG đổi schema `requires_user_confirmation`, KHÔNG bỏ cơ chế xác nhận.
- KHÔNG auto-confirm ở bất kỳ đâu.

### Checklist
- [ ] `verify --task T1-scaffold --command init-project` (không cờ) → fail với hướng dẫn `--confirm` rõ ràng.
- [ ] Cùng lệnh + `--confirm` → command chạy, evidence ghi nhận, state tiến.
- [ ] Test e2e trong `test/e2e/execution-flow.test.ts` thêm 2 ca trên (mock/temp workspace như các ca sẵn có).
- [ ] Skill text đã có quy tắc hỏi-người-thật.

### Verification
```bash
npm run build && npm test
```

### Status: `DONE` (2026-07-19) — nợ: 2 ca e2e `--confirm` trong `test/e2e/execution-flow.test.ts` chưa thêm

---

## RB-03 — Next Step Card phát lệnh chạy được thật + nhận profile greenfield đã confirm

> **Tầng:** src/adapters/shared. Độc lập. Đây là bề mặt quan trọng nhất với newbie: card đang đưa lệnh sai cú pháp và lệnh không tồn tại.

### Hiện trạng (bằng chứng) — đối chiếu contract CLI thật
Contract CLI thật ([adapter/claude-code/cli.mjs](../../adapter/claude-code/cli.mjs)): `start` bắt buộc `--task` (dòng 516–519), `verify` bắt buộc `--task` VÀ `--command` (dòng 582–588), `review` bắt buộc `--milestone` (header dòng 9). Lệnh `doctor` KHÔNG tồn tại trong CLI (đã grep toàn file, 0 match).

Trong [src/adapters/shared/renderNextStep.ts](../../src/adapters/shared/renderNextStep.ts), card sinh:
- Dòng 106: `start T0-discovery` → thiếu `--task` → CLI fail ngay.
- Dòng 142: `verify ${activeTask}` → thiếu cả `--task` lẫn `--command`.
- Dòng 188: `review ${milestone}` → thiếu `--milestone`.
- Dòng 177: `start ${openBreaks[0]}` → thiếu `--task`.
- Dòng 59: hướng dẫn "bước doctor của build skill" — không có lệnh/bước doctor nào tồn tại.
- Dòng 43: `!profile || profile.workspace_kind === 'empty' || !profile.confirmation.confirmed` → profile greenfield ĐÃ `confirmed = true` vẫn bị đá về `needs-profile` chỉ vì workspace còn trống (mà greenfield thì luôn trống — mâu thuẫn với chính đối tượng của sản phẩm).

### Micro-task target
Mọi `nextCommand` trên card copy-paste chạy được nguyên văn với CLI hiện tại; card không nhắc tới bước/lệnh không tồn tại; profile greenfield đã confirm đi thẳng vào luồng validate.

### Spec thay đổi (tất cả trong `renderNextStep.ts` + test của nó)
1. Dòng 43 đổi điều kiện needs-profile thành: `!profile || !profile.confirmation.confirmed || (profile.workspace_kind === 'empty' && !profile.target)`. (Trống + đã confirm + có target = greenfield hợp lệ, đi tiếp.)
2. Dòng 59 (`now` của needs-profile): bỏ chữ "doctor", đổi thành mô tả luồng có thật: "Xác nhận cấu hình dự án: trả lời target/package manager khi skill /build hỏi để sinh project-profile.json có confirmed = true." KHÔNG thêm lệnh doctor mới trong batch này.
3. Dòng 106: `${CLI} start --task T0-discovery`.
4. Dòng 142 (phase verifying): lấy command đầu tiên của task chưa có evidence pass (nếu không truy được evidence từ chữ ký hàm hiện tại thì lấy `task.commands[0].id`) → `${CLI} verify --task ${activeTask} --command ${cmdId}`; nếu command đó có `requires_user_confirmation` → thêm hậu tố nhắc: "(cần người dùng đồng ý → thêm --confirm)".
5. Dòng 177: `${CLI} start --task ${openBreaks[0]}`.
6. Dòng 188: `${CLI} review --milestone ${milestone}`.

### Out of scope
- KHÔNG đổi contract CLI (card theo CLI, không ngược lại). KHÔNG thêm subcommand mới.
- KHÔNG đụng logic phase machine.

### Checklist
- [ ] Test trong `src/adapters/shared/renderNextStep.test.ts`: với mỗi phase có `nextCommand`, assert command khớp regex contract thật (`start --task `, `verify --task .* --command `, `review --milestone `, `amend approve`).
- [ ] Test: profile `{workspace_kind:'empty', target:'node-cli', confirmation:{confirmed:true}}` → KHÔNG ra `needs-profile`.
- [ ] Không còn chuỗi "doctor" trong file (grep = 0 match).
- [ ] Golden test (`test/regression/golden-cli.test.ts`) nếu đỏ vì thay đổi này → cập nhật golden có chủ đích, ghi rõ trong commit message.

### Verification
```bash
npm run build && npm test
grep -ri "doctor" src/adapters/shared/renderNextStep.ts   # → 0 match
```

### Status: `DONE` (2026-07-19 — kèm fix bổ sung: phase ready-to-execute trỏ task chưa xong đầu tiên thay vì hardcode T0-discovery, phục vụ luồng sau promote RB-05)

---

## RB-04 — Recipe Vite trung thực: verification không false-positive, scaffold thật

> **Tầng:** src/core. Độc lập về code (chạy thật end-to-end thì cần RB-02 để confirm lệnh install, nhưng sửa + test recipe không phụ thuộc).

### Hiện trạng (bằng chứng)
- [src/core/stackRecipes.ts:176](../../src/core/stackRecipes.ts): T2 vite `check-entry` = `node -e "require('fs').existsSync('index.html')"` — biểu thức chỉ được EVALUATE, không `process.exit`, nên **luôn exit 0 kể cả khi index.html không tồn tại** → verification giả. (Đối chiếu cách viết ĐÚNG ngay trong cùng file, dòng 88 của node-cli: `process.exit(require('fs').existsSync('src/index.ts') ? 0 : 1)`.)
- Dòng 156–160: command tên `init-vite` thực chất chỉ chạy `npm init -y` — không scaffold Vite, không cài Vite. Sau đó T3 `build-vite` chạy `npm run build` (dòng 192) chắc chắn fail vì không có script build lẫn package vite.
- Exact-command gate không cho agent tự chạy lệnh cài dependency ngoài plan → không có đường nào hợp lệ để vite xuất hiện.

### Micro-task target
Recipe vite-web tự nhất quán: các command trong plan đủ để đi từ thư mục trống tới `npm run build` xanh, mọi expected check fail được thật khi điều kiện không đạt.

### Spec thay đổi (trong `getRecipe`, nhánh `vite-web` của `stackRecipes.ts`)
1. **Sửa check-entry (bắt buộc, 1 dòng):** dòng 176 đổi argv thành `['node', '-e', "process.exit(require('fs').existsSync('index.html') ? 0 : 1)"]` — mirror dòng 88.
2. **T1-scaffold thành thật:** giữ `init-project` (`npm init -y` / `pnpm init`, đổi tên id từ `init-vite` → `init-project` cho trung thực) và THÊM command thứ hai:
   - id `install-vite`, argv `[pm, 'install', '--save-dev', 'vite']`, `requires_user_confirmation: true`, expected `{ kind: 'file-exists', value: 'node_modules/vite/package.json' }`.
   - `evidence_required` của T1 = `['init-project', 'install-vite']`.
   - `expected_result` T1 ghi rõ: "package.json tồn tại, vite nằm trong devDependencies; agent tự thêm script `\"build\": \"vite build\"` và tạo `index.html`, `vite.config.*` trong allowed_paths (manifests) ở bước thực thi T1/T2."
3. **intent các task** cập nhật khớp thực tế (không hứa "Scaffold Vite project structure" khi command chỉ init manifest).
4. Đồng bộ mọi test đang assert nội dung recipe vite (`emitGreenfieldStack.test.ts`, `synthesizeExecutionPlan.test.ts`, golden/dogfood nếu chứa plan vite) — cập nhật expectation CÓ CHỦ ĐÍCH.

### Out of scope
- KHÔNG dùng `npm create vite@latest` (interactive + network-nặng, vỡ trên máy offline; quyết định: scaffold tối thiểu bằng tay của agent trong allowed_paths).
- KHÔNG sửa recipe node-cli / python-cli (đang tự nhất quán).
- KHÔNG nới exact-command gate; `install-vite` hợp lệ vì NẰM TRONG plan.

### Checklist
- [ ] Unit test: recipe vite-web — mọi command có `expected.kind === 'exit-code-zero'` dùng `node -e` đều chứa `process.exit` (guard chống tái phạm cho CẢ 3 recipe).
- [ ] Unit test: T1 vite chứa `install-vite` với `requires_user_confirmation: true`.
- [ ] Chạy tay trong temp dir (ghi vào RUNBOOK-web.md phần smoke): init → install-vite → tạo index.html + script build tối thiểu → `npm run build` xanh; xoá index.html → check-entry exit 1.
- [ ] `npm test` xanh toàn bộ.

### Verification
```bash
npm run build && npm test
node -e "process.exit(require('fs').existsSync('index.html') ? 0 : 1)"; echo $?   # trong dir không có index.html → 1
```

### Status: `DONE` (2026-07-19 — kèm guard test chống tái phạm cho cả 3 recipe trong `stackRecipes.test.ts`) — nợ: smoke run chưa ghi vào RUNBOOK-web.md

---

## RB-05 — Nối luồng skeleton → feature thật (V6 end-to-end)

> **Tầng:** core + CLI + skill. **Batch lớn nhất, làm SAU RB-02 và RB-03** (đụng `cli.mjs`, `renderNextStep.ts`). Có thể chia 2 session: RB-05a (core+CLI), RB-05b (skill + e2e).

### Hiện trạng (bằng chứng)
- Feature contracts CHỈ được synth khi `T3-verify` đã nằm trong `completed_tasks`: [src/core/synthesizeExecutionPlan.ts:225-227](../../src/core/synthesizeExecutionPlan.ts).
- Nhưng `synthesizeExecutionPlan` chỉ được gọi từ đường emit (callers qua CodeGraph: `emitTree`, `generateExecutionPlanJson`) — tức là plan sinh LÚC EMIT, khi T3 chưa thể xong → plan vĩnh viễn chỉ có 4 task skeleton.
- Sau khi T3 pass, CLI `verify` chỉ save state ([adapter/claude-code/cli.mjs:619](../../adapter/claude-code/cli.mjs)); core kết luận `ready-to-ship` khi mọi task trong plan-4-task xong: [src/core/advanceExecutionState.ts:373-384](../../src/core/advanceExecutionState.ts). → Hệ thống tuyên bố "sẵn sàng bàn giao" khi CHƯA build một feature nào.
- Build skill không có bước regenerate/promote plan. Pilot feature thật tự khai "CHƯA CHẠY": [Design/RoadMap/evidence/v5-feature-pilot-protocol.md:3](evidence/v5-feature-pilot-protocol.md).

### Micro-task target
Sau khi T3-verify pass, plan tự động được tái sinh (promote) để chứa các feature contract M4-*; `ready-to-ship` chỉ đạt được khi các feature milestone cũng verify + review xong. Không còn đường nào tới ready-to-ship mà chưa đụng feature.

### Spec thay đổi
**RB-05a — core + CLI:**
1. Core: hàm mới `promoteExecutionPlan` trong `src/core` (file mới `promoteExecutionPlan.ts`, export qua `src/core/index.ts`): input `{workspace, answers, currentPlan, state}` → gọi lại đường sinh plan hiện có (`generateExecutionPlanJson`/`synthesizeExecutionPlan` với `executionState` truyền vào) → trả plan mới. Bất biến: (a) 4 task skeleton + evidence cũ giữ nguyên id; (b) plan mới là superset — chỉ THÊM milestone/task M4-*, không sửa task cũ; (c) idempotent — gọi lần 2 khi đã có M4-* thì trả plan không đổi.
2. CLI (`adapter/claude-code/cli.mjs` case `'verify'`, đồng bộ bản codex): sau `runTaskVerification` thành công, NẾU `nextState.completed_tasks` chứa `'T3-verify'` VÀ plan hiện tại chưa có milestone prefix `M4-` VÀ tồn tại answers (`Design/.interview/answers.json`): gọi `promoteExecutionPlan`, ghi `execution-plan.json` mới, recompute phase về `ready-to-execute` (KHÔNG phải ready-to-ship), rồi mới save state + in JSON kết quả kèm trường `promoted: true` và danh sách milestone mới.
3. Fail-closed khi không promote được (thiếu answers, synth ra 0 contract): state chuyển `blocked` với `block_reason` nói rõ, KHÔNG rơi về ready-to-ship. Sửa tương ứng ở [advanceExecutionState.ts:384](../../src/core/advanceExecutionState.ts): `ready-to-ship` chỉ khi mọi task xong VÀ (plan có ≥1 milestone `M4-` đã reviewed HOẶC plan được đánh dấu tường minh `no_features: true` — flag mới trong schema plan, mặc định không có).

**RB-05b — skill + card + e2e:**
4. `renderNextStep.ts`: sau promote, phase `ready-to-execute` với task M4 đầu tiên → card `start --task <task M4 đầu>`. (Nương theo cú pháp đã sửa ở RB-03.)
5. Build skill (`adapter/*/skill*/build/SKILL.md`): thêm bước tường minh "sau T3-verify pass, CLI tự promote plan; đọc output `promoted` và tiếp tục với feature đầu tiên".
6. E2e mới `test/e2e/skeleton-to-feature.test.ts`: temp workspace → emit → chạy hết T0→T3 (dùng `--confirm` từ RB-02) → assert plan sau verify T3 có milestone `M4-*` → assert phase KHÔNG phải ready-to-ship → chạy feature task + `review --milestone M4-*` → phase ready-to-ship.

### Out of scope
- KHÔNG đổi cách synthesizeFeatureContracts chọn/định dạng contract (nội dung feature là chuyện khác).
- KHÔNG chạy pilot người thật (đó là việc của protocol v5, sau khi batch này xong mới chạy được).

### Checklist
- [ ] Unit test `promoteExecutionPlan`: superset, giữ evidence, idempotent, fail-closed khi 0 contract.
- [ ] Unit test `advanceExecutionState`: plan 4-task thuần không bao giờ trả ready-to-ship (trừ `no_features: true`).
- [ ] E2e skeleton→feature xanh.
- [ ] `npm test` xanh toàn bộ; golden/dogfood regen có chủ đích nếu đổi.

### Verification
```bash
npm run build && npm test
npx vitest run test/e2e/skeleton-to-feature.test.ts
```

### Status: `IN_PROGRESS` (2026-07-19 — core `promoteExecutionPlan` + CLI wiring + feature gate + unit test promote 5 ca xong; fix 2 bug review: CLI bỏ qua promote khi `no_features: true`, card post-promote trỏ đúng task M4) — còn thiếu: e2e `skeleton-to-feature.test.ts`

---

## RB-06 — Đóng gói phân phối được: package.json đúng, gói sạch, version một nguồn

> **Tầng:** Packaging. Làm SAU RB-07 (để LICENSE có mặt trong gói). Độc lập với các batch code.

### Hiện trạng (bằng chứng)
- [package.json:6](../../package.json) `"main": "dist/index.js"` — file KHÔNG tồn tại sau build (đã kiểm: `dist/index.js` = False, `dist/src/core/index.js` = True).
- Không có `bin`, không có `files`, không có `license` field, không có LICENSE file, không `.npmignore` → `npm pack --dry-run` cho gói ~1.803 file / ~8 MB unpacked, chứa cả `.claude/worktrees`, test source, dogfood, dist của test.
- Version ba nơi ba giá: package `6.0.0`, Codex manifest [adapter/codex-plugin/.codex-plugin/plugin.json:3](../../adapter/codex-plugin/.codex-plugin/plugin.json) = `4.0.0`, README dòng 299 tuyên bố trạng thái "mốc 4.0.0".
- Installer Claude ([adapter/claude-code/install.mjs:11](../../adapter/claude-code/install.mjs)) ghi hook bằng **đường dẫn tuyệt đối về repo engine trên máy tác giả** — xoá/di chuyển repo là gãy mọi dự án đích; installer Codex thì bundle `core/` — hai chiến lược lệch nhau.

### Micro-task target
`npm pack` ra một gói sạch (<300 file), metadata đúng; version có MỘT nguồn sự thật là package.json và script check bắt lệch; hai installer cùng MỘT chiến lược bundle (self-contained vào đích, không phụ thuộc đường dẫn máy tác giả).

### Spec thay đổi
1. `package.json`:
   - `main`: `dist/src/core/index.js`; thêm `exports` tương ứng.
   - `files`: `["dist/src", "dist/adapter", "adapter", "Design/Content", "docs/quickstart.md", "RUNBOOK-web.md", "RUNBOOK-mobile.md", "README.md", "FirstIdea.md", "LICENSE"]` — tinh chỉnh sau khi soi `npm pack --dry-run`, mục tiêu KHÔNG chứa: test, dogfood, `.claude`, `Design/RoadMap`, `Design/ContractForAI`, dist của file test (`**/*.test.js` — exclude bằng tsconfig build riêng hoặc glob âm trong files).
   - `license`: khớp LICENSE của RB-07 (`MIT`).
   - `bin`: `{"design-everything": "adapter/claude-code/install.mjs"}` chỉ khi installer đã self-contained (bước 3); nếu bước 3 chưa xong trong batch này thì BỎ `bin`, không hứa lệnh chưa chạy được.
2. Script mới `scripts/check-version-sync.mjs`: đọc version package.json, so với `adapter/codex-plugin/.codex-plugin/plugin.json` và mọi chuỗi `mốc X.Y.Z` trong README — lệch thì exit 1. Wire vào `npm test` (thêm vào script test hoặc một test vitest gọi nó). Sửa plugin.json về `6.0.0` + sửa câu claim README (phối hợp RB-08; trong batch này chỉ sửa SỐ cho hết lệch).
3. Installer Claude: đổi chiến lược sang bundle như Codex — copy `dist/src` + `node_modules` runtime cần thiết (chỉ `yaml`, `zod`) hoặc bundle 1 file bằng esbuild vào `<đích>/.design-everything/engine/`; hooks trong settings.json trỏ tương đối vào bundle trong đích. Đây là phần nặng nhất — nếu session không đủ sức, TÁCH thành RB-06b riêng và dừng sau bước 1–2 (vẫn là tiến bộ đứng được).
4. Ghi kết quả `npm pack --dry-run` (số file, size) vào commit message làm bằng chứng.

### Out of scope
- KHÔNG publish npm thật trong batch này.
- KHÔNG gộp 2 bản cli.mjs (ghi nhận nợ: `adapter/claude-code/cli.mjs` và `adapter/codex-plugin/cli.mjs` là bản copy ~122 symbol — mở break-task riêng "hoist phần chung về src/adapters/shared" sau khi RB-02/05 ổn định).

### Checklist
- [ ] `node -e "require('./package.json'); import('./dist/src/core/index.js')"` chạy được sau build (main/exports đúng).
- [ ] `npm pack --dry-run` < 300 file, không chứa test/dogfood/.claude/RoadMap.
- [ ] `node scripts/check-version-sync.mjs` exit 0; đổi version plugin.json tay → exit 1.
- [ ] (Nếu làm bước 3) cài vào temp dir, XOÁ/đổi tên repo engine → skill + hook trong đích vẫn chạy.

### Verification
```bash
npm run build && npm pack --dry-run && node scripts/check-version-sync.mjs && npm test
```

### Status: `IN_PROGRESS` (2026-07-19 — bước 1–2 xong: main/exports/files/license đúng, version-sync quét cả plugin.json lẫn claim "mốc X.Y.Z" trong README và wire vào `npm test`, loại `*.test.*` khỏi pack: 1803 → 475 file / 2.9 MB) — còn lại: RB-06b installer self-contained; mục tiêu <300 file chờ RB-06b vì 281 file còn lại là `node_modules` vendored của codex plugin (esbuild bundle sẽ xoá)

---

## RB-07 — LICENSE + hồ sơ pháp lý tối thiểu

> **Tầng:** Legal/Community. Độc lập, dễ nhất, làm được NGAY. Không có LICENSE = về pháp lý người khác chưa được phép dùng/fork — chặn mọi kế hoạch "cho người khác dùng thử".

### Quyết định license (mặc định đã chọn, chủ repo có quyền phủ quyết trước khi merge)
**MIT** — lý do: mục tiêu sản phẩm là trở thành "cái mặc định ai cũng dùng" (FirstIdea §2), MIT tối đa hoá adoption và tương thích mọi harness/công ty; lợi thế cạnh tranh của dự án nằm ở phương pháp đã thực chiến và nhịp cải tiến, không nằm ở việc giữ code kín. Phương án thay thế nếu chủ repo lo về bằng sáng chế: Apache-2.0 (thêm patent grant, dài hơn). Nếu muốn chống cloud-wrap: đó là quyết định kinh doanh lớn, KHÔNG quyết trong batch này.

### Spec thay đổi
1. Tạo `LICENSE` ở root, nội dung MIT chuẩn nguyên văn (điền năm + tên):

```text
MIT License

Copyright (c) 2026 CuongVo24

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

2. `package.json`: thêm `"license": "MIT"` (nếu RB-06 chưa chạy thì thêm ở đây, RB-06 giữ nguyên).
3. README: thêm mục `## License` ngắn cuối file: "MIT — xem [LICENSE](LICENSE)."
4. `CONTRIBUTING.md` tối giản (~20 dòng): cách build/test, quy ước commit (theo [Design/Conventions/Coding & Git Standard.md](../Conventions/Coding%20&%20Git%20Standard.md)), nơi mở issue.

### Checklist
- [ ] `LICENSE` tồn tại, đúng nguyên văn MIT, đúng năm/tên.
- [ ] `package.json` có field license khớp.
- [ ] README có mục License.
- [ ] `npm test` xanh (không có lý do đỏ, nhưng vẫn chạy theo DoD chung).

### Status: `DONE` (2026-07-19 — LICENSE MIT + field license + mục README + CONTRIBUTING.md)

---

## RB-08 — Diệt drift tài liệu onboarding (làm CUỐI, sau các batch khác)

> **Tầng:** Docs. Chạy sau cùng để mô tả trạng thái THẬT sau khi RB-01→07 merge. Mỉa mai cần sửa: dự án chống doc-drift đang tự drift.

### Hiện trạng (bằng chứng)
- [docs/quickstart.md](../../docs/quickstart.md): (a) mục 5 vẫn nói execution/evidence là TƯƠNG LAI ("V3 target 4.0.0 sẽ thêm...") trong khi đã ship từ lâu (package 6.0.0); (b) dùng link tuyệt đối máy tác giả `file:///e:/DesignEverything/...` (dòng 9, 36, 57...) — vỡ trên mọi máy khác; (c) mục 4 mô tả Codex là rules-only trong khi plugin hook Codex native đã tồn tại ở `adapter/codex-plugin/`.
- [README.md:299](../../README.md): "hoàn thành mốc 4.0.0" — sai hai bậc version.
- [Design/Adapters/ConformanceMatrix.md](../Adapters/ConformanceMatrix.md): ma trận không có dòng cho Codex native plugin (bậc A - hook cứng); Codex đang bị xếp chung nhóm rules-only bậc B.

### Spec thay đổi
1. `docs/quickstart.md`: viết lại — mọi link thành đường dẫn tương đối repo; mục trạng thái phản ánh 6.x (execution plan, evidence, promote, review đã có); thêm tuyến Codex plugin (cài bằng `adapter/codex-plugin/install.mjs`) bên cạnh tuyến rules-only; cập nhật cây docs-generated nếu RB-05 đổi output.
2. `README.md`: mục "Trạng thái truthfulness" viết lại theo trạng thái sau RB-01→07 (số version lấy từ package.json, đã có check của RB-06 giữ khớp); mục Quickstart đồng bộ.
3. `ConformanceMatrix.md`: thêm dòng **Codex (native plugin)** bậc A với trạng thái THẬT (✅ code + unit test; smoke run thật trên Codex CLI: ghi ⏳ nếu chưa làm — thà gắn cờ nghi ngờ); giữ dòng AGENTS.md rules-only cho các harness khác.
4. Rà `RUNBOOK-web.md` / `RUNBOOK-mobile.md` link + claim lệch.
5. Chạy trọn quickstart từ đầu trên máy/thư mục sạch theo đúng chữ đã viết — kẹt ở đâu sửa chữ (hoặc mở break-task nếu kẹt do code).

### Checklist
- [ ] `grep -r "file:///" docs/ README.md` → 0 match.
- [ ] `grep -rn "4\.0\.0" README.md docs/quickstart.md` → 0 match (hoặc chỉ trong ngữ cảnh lịch sử có ghi chú).
- [ ] ConformanceMatrix có dòng Codex plugin với trạng thái trung thực.
- [ ] Quickstart đã được đi lại từ đầu, từng bước, trên thư mục sạch.
- [ ] `node scripts/check-version-sync.mjs` (từ RB-06) xanh.

### Status: `TODO`

---

## Ngoài plan (ghi nhận, KHÔNG làm trong đợt này)
- Gộp 2 bản `cli.mjs` trùng lặp về `src/adapters/shared` (sau khi RB-02/05 ổn định — mở contract riêng).
- Pilot người thật theo [v5-feature-pilot-protocol.md](evidence/v5-feature-pilot-protocol.md) — chỉ chạy được SAU RB-05; đây là cổng cuối trước khi mở beta thân hữu.
- Cân nhắc subcommand `doctor` thật (RB-03 đã gỡ khỏi card; nếu muốn thêm thì là feature mới có contract riêng).
