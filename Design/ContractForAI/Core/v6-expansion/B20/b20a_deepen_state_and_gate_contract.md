# Contract — B20a Deepen state machine + hoàn tất theo module

> Tầng: Lõi. Nguồn: [V6-DetailedDesignPlan](../V6-DetailedDesignPlan.md) B20a, đề xuất D49, deepen-script B19b. Phụ thuộc: B19b.
>
> **Sửa 2026-07-19 theo review mở lane:** (1) state chuyển sang mô hình **question-instance** `{module, subject_id, question_id}` để biểu diễn "mỗi Must / mỗi quyết định một bộ câu" — `answered: string[]` cấp module không đủ, một bộ DS2 sẽ bị tái dùng cho mọi feature; (2) commit deepen là **đường advance riêng** (`commitDeepenAnswer`) vì `commitStep` tầng 1 từ chối khi `current_step === null` — vẫn giữ nguyên kỷ luật một-bước-mỗi-lượt + chống duplicate turn (D11/D14); (3) KHÔNG đụng gate-policy/evaluateGate — enforcement là fail-closed trong core, không phải gate PreToolUse; (4) ký đầy đủ chữ ký API + persistence atomic để executor yếu không phải đoán.

## 1. Micro-task target

Lõi biết một dự án đã opt-in module deepen nào, từng question-instance (câu × subject) đã answered chưa, và trả lời được "module này đủ điều kiện emit chưa / bản emit có stale không" một cách fail-closed — không đổi bất kỳ hành vi nào của luồng tầng 1 và luồng thực thi V3.

## 2. Scope

**In scope**

- [NEW] `src/core/schemas/deepenScript.ts`: zod schema cho `deepen-script.yaml` đúng format B19b (`id/module/per_subject/ask/kind/target_doc/default_from/depends_on_tier1/translate_back`). [NEW] `src/core/loadDeepenScript.ts`: loader riêng (pattern y như `loadScript`), file thiếu/hỏng → throw lỗi có message rõ (KHÔNG fallback im lặng).
- [NEW] `src/core/schemas/deepenState.ts` (zod), lưu tại `.design-everything/deepen-state.json`; thiếu file = chưa opt-in gì:

  ```ts
  type DeepenModuleId = 'glossary' | 'feature-spec' | 'adr' | 'test-strategy';

  interface DeepenAnswerRef {
    question_id: string;          // id trong deepen-script.yaml
    subject_id: string | null;    // slug Must / id quyết định; null khi per_subject: none
  }

  interface DeepenModuleState {
    opted_in: boolean;                       // mặc định false
    activation: 'explicit' | 'condition' | null;
    answered: DeepenAnswerRef[];             // instance đã commit — KHÔNG lưu nội dung answer
    last_user_turn_id: string | null;        // chống duplicate turn cho kênh deepen
    emitted_at: string | null;               // ISO của lần emit thành công gần nhất
    source_digest: string | null;            // sha256 nguồn tại thời điểm emit (xem computeSourceDigest)
    artifacts: string[];                     // đường dẫn file đã emit lần gần nhất (manifest per-module)
  }

  interface DeepenState { version: string; modules: Record<DeepenModuleId, DeepenModuleState>; }
  ```

- [NEW] `src/core/deepenState.ts` — chữ ký KHOÁ, executor không được đổi shape:

  ```ts
  interface QuestionInstance { module: DeepenModuleId; question_id: string; subject_id: string | null; target_doc: string | null }

  loadDeepenState(workspace: string): DeepenState
  //  thiếu file → state mặc định (mọi module opted_in:false); file hỏng/không parse được →
  //  state mặc định + console.warn một dòng; KHÔNG crash, KHÔNG suy diễn.

  saveDeepenState(workspace: string, state: DeepenState): void
  //  atomic: ghi `deepen-state.json.tmp` cùng thư mục rồi rename đè — không bao giờ để file dở dang.

  listDeepenSubjects(module: DeepenModuleId, input: { answers: unknown; tier1Docs: Record<string, string> }): string[]
  //  'feature-spec' → slug từng Must (extractMustFeatures của 02-scope + slugify dùng chung — xem dưới);
  //  'adr' → id từng quyết định trong 05-architecture (thứ tự xuất hiện: 'adr-001', 'adr-002'…);
  //  'glossary' | 'test-strategy' → [] (per_subject: none).

  expandQuestionInstances(script: DeepenScript, module: DeepenModuleId, subjects: string[]): QuestionInstance[]
  //  per_subject none → 1 instance (subject_id null); must/adr → 1 instance mỗi subject;
  //  {subject}/{subject-slug}/{NNN} trong ask/target_doc được thay tại đây.

  optInModule(state: DeepenState, module: DeepenModuleId, activation: 'explicit' | 'condition'): DeepenState
  //  pure, idempotent — opt-in lại không reset answered.

  commitDeepenAnswer(state: DeepenState, script: DeepenScript,
    args: { module: DeepenModuleId; questionId: string; subjectId: string | null; userTurnId: string }
  ): DeepenState
  //  pure; throw khi: module chưa opted_in; questionId không thuộc module; subjectId không khớp per_subject;
  //  instance đã có trong answered; userTurnId === last_user_turn_id (duplicate turn).
  //  KHÔNG đi qua commitStep tầng 1, KHÔNG đọc/ghi progress.json.

  canEmitModule(state: DeepenState, script: DeepenScript, subjects: string[]): { ok: boolean; missing: QuestionInstance[]; stale: boolean }
  //  ok = mọi instance của module có trong answered (fail-closed);
  //  stale = emitted_at ≠ null && source_digest hiện tại ≠ source_digest đã lưu (answer/doc tầng 1 đổi sau emit).

  computeSourceDigest(module: DeepenModuleId, input: { deepenAnswers: unknown; tier1Docs: Record<string, string> }): string
  //  sha256 ổn định (key sort) trên nội dung nguồn mà renderer của module sẽ đọc.
  ```

- [NEW] `src/core/slugify.ts`: trích hàm slug đang inline 3 chỗ trong [synthesizeExecutionPlan.ts:267](../../../../../src/core/synthesizeExecutionPlan.ts) thành helper export duy nhất. Khoá thêm: slug rỗng sau chuẩn hoá → `item-<index>`; collision trong cùng một danh sách → hậu tố `-2`, `-3` theo thứ tự. [MODIFY] `synthesizeExecutionPlan.ts` dùng helper — output byte-identical (golden test là lưới).
- [MODIFY] `src/core/evaluatePreAction.ts`: khi (và chỉ khi) có module `opted_in` mà `canEmitModule(...).ok === false`, thêm cảnh báo MỀM (field thông tin trong kết quả allow) — KHÔNG deny thêm trường hợp mới nào, KHÔNG thêm gate, KHÔNG đụng vòng lặp `policy.gates`.

**Out of scope**

- KHÔNG sửa `gate-policy.yaml`, `evaluateGate.ts`, schema gate — enforcement deepen không dùng kênh gate.
- Không render/emit (B20b — `source_digest`/`artifacts` do `emitTier2` ghi). Không sửa CLI/skill (B21a).
- Không đổi `progress.json` schema tầng 1; không thêm phase mới vào ExecutionState V3; không đụng `commitStep`.

## 3. Checklist

- [ ] Workspace không có `deepen-state.json` → mọi `canEmitModule` = `{ok:false}`, mọi luồng cũ chạy y nguyên (regression).
- [ ] File state hỏng → state mặc định + warning, không crash; `saveDeepenState` atomic (test: tmp+rename, không còn file `.tmp` sau khi save).
- [ ] `commitDeepenAnswer`: từ chối đủ 5 ca throw ghi ở chữ ký (mỗi ca một test).
- [ ] Per-subject completeness: DS2a answered cho must `A` KHÔNG được tính cho must `B`; `canEmitModule` liệt kê đúng `missing` theo instance.
- [ ] `stale` bật đúng khi answer DS hoặc doc tầng 1 nguồn đổi sau emit (test đổi 1 ký tự → digest khác).
- [ ] `slugify` byte-identical với logic cũ trên toàn bộ golden hiện có; ca slug rỗng + collision có test.
- [ ] Không diff nào trong output các golden/dogfood test hiện có.

## 4. Interfaces / Files expected to change

- [NEW] `src/core/schemas/deepenScript.ts` ≤70 dòng; `src/core/loadDeepenScript.ts` ≤80 dòng + test ≤120 dòng.
- [NEW] `src/core/schemas/deepenState.ts` ≤90 dòng.
- [NEW] `src/core/deepenState.ts` ≤200 dòng + `deepenState.test.ts` ≤200 dòng.
- [NEW] `src/core/slugify.ts` ≤40 dòng + test ≤80 dòng.
- [MODIFY] `src/core/synthesizeExecutionPlan.ts` ≤20 dòng (thay 3 chỗ inline bằng helper).
- [MODIFY] `src/core/schemas/index.ts`, `src/core/index.ts` ≤12 dòng (export).
- [MODIFY] `src/core/evaluatePreAction.ts` ≤30 dòng (cảnh báo mềm).

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Lỡ tay đổi hành vi luồng cũ | Cao | Mọi đường mới bắt đầu từ file state riêng, mặc định vắng mặt; golden/dogfood + test byte-identical slugify là lưới. |
| Hai nguồn sự thật answers (tầng 1 vs deepen) | TB | Answers deepen vẫn ghi vào kho answers hiện hành (key instance — B21a); deepen-state chỉ lưu *tiến độ*, không lưu nội dung. |
| Executor yếu chế thêm phase/đổi shape | TB | Chữ ký ký sẵn từng hàm ở trên; Out of scope cấm rõ; đổi shape = amend contract trước. |
| Digest quá nhạy → stale giả | Thấp | Digest chỉ tính trên đúng nguồn renderer đọc (danh sách chốt ở B20b); test 1-ký-tự làm chuẩn. |

## 6. Verification plan

- `npx vitest run deepenState loadDeepenScript slugify evaluatePreAction synthesizeExecutionPlan`
- `npx vitest run test/regression` (golden không đổi).
- `npm run build && npm run lint && npm test`

## 7. Status

DONE (2026-07-21) — chờ review manager trước khi sang B20b.

### Amendment khi thực thi (2026-07-21)
- **`canEmitModule` đổi chữ ký** thành `(state, script, module, subjects, currentDigest?)`. Chữ ký gốc thiếu 2 thứ không thể bù: (1) không có `module` nên không phân biệt được `glossary` vs `test-strategy` (cùng subjects `[]`); (2) không có nguồn để tính `stale`. `currentDigest` tuỳ chọn do caller tính bằng `computeSourceDigest`; vắng → `stale=false` (không kết luận). B20b/B21a phải gọi theo chữ ký mới.
- **Câu `kind: meta` (DS0-*) bị loại khỏi completeness/instance**: đó là cổng opt-in, `target_doc: null`, không sinh nội dung. `expandQuestionInstances` chỉ trả câu `anchored`. Opt-in đi qua `optInModule`/CLI `--opt-in` (B21a), không qua `commitDeepenAnswer` completeness.
- **Cảnh báo mềm ở `evaluatePreAction`** hiện thực dạng nhẹ: gắn `deepen_pending` (danh sách module `opted_in && emitted_at===null`) lên MỌI quyết định `allow`, best-effort (state hỏng/thiếu → bỏ qua), không bao giờ đổi decision. Đây là proxy rẻ cho "module dở dang"; phần completeness/`missing` chính xác nằm ở CLI `deepen` + `renderNextStep` (B21a). Không thêm gate, không đụng `policy.gates`.

### Kết quả verify (2026-07-21)
- `npx vitest run slugify loadDeepenScript deepenState` → 31 pass (gồm: 5 ca throw `commitDeepenAnswer`, per-subject completeness A≠B, stale theo digest, digest 1-ký-tự, save atomic không để `.tmp`, slug byte-identical).
- `npx vitest run evaluatePreAction synthesizeExecutionPlan test/regression` → 17 pass, golden/dogfood không đổi byte sau refactor `slugify`.
- `npm run lint` sạch, `npm run build` sạch, `npm test` → **310 pass / 59 file**.

### File thêm/sửa
- [NEW] `src/core/slugify.ts`, `src/core/schemas/deepenScript.ts`, `src/core/loadDeepenScript.ts`, `src/core/schemas/deepenState.ts`, `src/core/deepenState.ts` + 3 test (`slugify`, `loadDeepenScript`, `deepenState`).
- [MODIFY] `src/core/synthesizeExecutionPlan.ts` (3 chỗ inline → `slugify`), `src/core/evaluatePreAction.ts` (wrapper `deepen_pending`), `src/core/schemas/preActionGate.ts` (field `deepen_pending`), `src/core/schemas/index.ts`, `src/core/index.ts` (export).
