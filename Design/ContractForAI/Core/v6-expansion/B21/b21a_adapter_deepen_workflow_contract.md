# Contract — B21a Adapter workflow `deepen` (Claude + Codex)

> Tầng: Adapter. Nguồn: [V6-DetailedDesignPlan](../V6-DetailedDesignPlan.md) B21a, lõi B20a/B20b. Phụ thuộc: B20b. Adapter chỉ INJECT / GATE / EMIT — mọi logic nằm ở lõi đã có.
>
> **Sửa 2026-07-19 theo review mở lane:** bổ sung `--next`/`--commit` — bản trước không có đường hỏi/commit câu DS nào cả (lệnh `commit` tầng 1 từ chối khi phỏng vấn đã xong), nên không tồn tại happy path opt-in → hỏi → commit → emit. Commit deepen đi qua `commitDeepenAnswer` (B20a), KHÔNG qua `commitStep` tầng 1.

## 1. Micro-task target

Người dùng gọi được `deepen` từ cả hai harness thành vòng khép kín: liệt kê module + điều kiện kích hoạt, opt-in, được hỏi từng câu DS (`--next`), commit từng câu (`--commit`), và emit module khi đủ — không thay đổi gì cho người không gọi.

## 2. Scope

**In scope**

- CLI (cả `adapter/claude-code/cli.mjs` và `adapter/codex-plugin/cli.mjs`, sửa song song y hệt — nợ hoist đã ghi ở RB-06):
  - `deepen` (không arg): in JSON trạng thái 4 module (`opted_in/answered/missing/stale/emitted_at`) từ `loadDeepenState` + `canEmitModule`.
  - `deepen --module <id> --opt-in [--activation explicit|condition]`: gọi `optInModule`, `saveDeepenState`.
  - `deepen --module <id> --next`: in JSON instance kế tiếp chưa answered — `{question_id, subject_id, ask (đã thay {subject}), default (suy từ default_from + answers tầng 1), translate_back}`; hết câu → `{complete: true}`. Module chưa opt-in → exit ≠ 0.
  - `deepen --module <id> --commit --turn <TURN_ID> --question <qid> [--subject <sid>] --answer "..."`: gọi `commitDeepenAnswer` (B20a — mọi luật từ chối do core gác), lưu nội dung answer vào kho answers hiện hành với key instance `<qid>@<sid>` (câu `per_subject: none` → key `<qid>`), rồi `saveDeepenState`. Vẫn dịch ngược + xác nhận như tầng 1.
  - `deepen --module <id> --emit`: gọi `emitTier2`; chưa đủ câu → in `missing`, consistency error → in `issues`; cả hai exit ≠ 0 (fail-closed).
  - KHÔNG có đường auto-answer: skill chỉ được commit sau khi người dùng trả lời và xác nhận dịch ngược từng câu.
- Skill: `adapter/claude-code/skill/design-everything/` (và bản build nếu chạm) + `adapter/codex-plugin/skills/`: thêm mục "Đào sâu thiết kế (tuỳ chọn)" — quy tắc: chỉ chào mời deepen khi NGƯỜI DÙNG hỏi hoặc điều kiện kích hoạt §3 taxonomy-decision xuất hiện trong answers; hỏi từng câu một; mọi câu vẫn dịch ngược + xác nhận.
- `renderNextStep`: khi tồn tại module `opted_in` nhưng chưa emit, thêm card mềm (`enforcement: 'soft'`) nhắc hoàn tất module đó, `nextCommand: deepen --module <id> --emit`; KHÔNG bao giờ hiện khi không opt-in.

**Out of scope**

- Không thêm hook mới, không đổi PreToolUse; không hard-gate deepen (tầng 2 là tuỳ chọn theo D48).
- Không tự ý gộp 2 bản cli.mjs trong batch này.

## 3. Checklist

- [ ] `deepen` các biến thể chạy đúng trên workspace dogfood; JSON đúng shape ghi trong In scope.
- [ ] Happy path e2e trọn vòng: opt-in `feature-spec` → `--next`/`--commit` từng instance cho ĐỦ 2 Must → `--emit` ok, file sinh đúng slug từng Must.
- [ ] `deepen --module glossary --emit` khi thiếu câu → exit ≠ 0 + liệt kê `missing` đúng; `--commit` duplicate turn / sai subject → exit ≠ 0 với message của core.
- [ ] Card deepen chỉ xuất hiện khi có module opted_in dở dang (test renderNextStep 2 chiều).
- [ ] Hai bản cli.mjs diff-identical ở phần deepen (so bằng script/diff tay, ghi vào PR).
- [ ] Workspace không opt-in: `next-step`, golden, dogfood — không đổi một byte.

## 4. Interfaces / Files expected to change

- [MODIFY] `adapter/claude-code/cli.mjs` ≤160 dòng; [MODIFY] `adapter/codex-plugin/cli.mjs` ≤160 dòng (bản sao y hệt).
- [MODIFY] `src/adapters/shared/renderNextStep.ts` ≤40 dòng + test ≤60 dòng.
- [MODIFY] SKILL.md hai adapter ≤40 dòng/file.
- [NEW] test e2e `test/e2e/deepen-flow.test.ts` ≤220 dòng (temp workspace: opt-in → `--next`/`--commit` đủ vòng 2 Must → emit ok; nhánh thiếu câu bị chặn; workspace không opt-in không đổi byte nào).

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Agent tự opt-in hộ người dùng | Cao | Skill ghi luật cấm tường minh (như bài học `--confirm` RB-02); card không bao giờ tự đề xuất khi chưa opt-in. |
| Hai bản CLI trôi lệch | TB | Checklist diff-identical; nợ hoist giữ nguyên trong sổ RB-06. |
| Card deepen làm newbie tưởng bắt buộc | TB | `enforcement: 'soft'` + chữ "tuỳ chọn" ngay trong `now`. |

## 6. Verification plan

- `npx vitest run renderNextStep test/e2e/deepen-flow.test.ts`
- `npm run build && npm run lint && npm test`
- Chạy tay 3 lệnh `deepen` trên workspace dogfood, dán output vào contract khi DONE.

## 7. Status

WAITING_FOR_APPROVAL
