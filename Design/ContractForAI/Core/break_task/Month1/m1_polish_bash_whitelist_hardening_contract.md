# Contract — M1-POLISH Siết heuristic Bash trong PreToolUse

> **Tầng:** Adapter (Claude Code). Nguồn: Month 1 review (finding #3, xem [README](README.md)) + [claude-code.md](../../../../Adapters/claude-code.md) §"Heuristic tối thiểu cho Bash" + [pre-tool-use W3C](../../month1/W3/w3c_pre_tool_use_hook_contract.md).

## 1. Micro-task target
Vá lỗ bypass trong phân loại Bash của [onPreToolUse](../../../../../src/adapters/claude/preToolUse.ts:64): hiện chỉ lấy token đầu (`cmdName = split[0]`) nên lệnh ghép `cat x && npm install` bị coi là an toàn → lọt gate; redirect-check chỉ bắt `>`/`>>`; `git` cho rộng (kể cả `git apply`/`checkout` ghi source). Nguyên tắc: **không chắc → chặn**.

## 2. Scope
**In scope** — khối phân loại Bash trong `src/adapters/claude/preToolUse.ts` ([dòng ~64–105](../../../../../src/adapters/claude/preToolUse.ts:64)):
- Coi là **KHÔNG an toàn** (rơi xuống đánh giá gate) nếu `command` chứa bất kỳ ký tự nối lệnh / redirect / substitution: `|`, `;`, `&&`, `||`, `>`, `>>`, `` ` ``, `$(`, `&`, hoặc chứa `tee`. → chặn `cat x && npm install`, `a | tee src/x.ts`.
- `git`: chỉ an toàn khi subcommand ∈ allowlist chỉ-đọc `{status, diff, log, show, branch, rev-parse, remote, blame, config}` (lấy `split[1]`). `git apply`/`checkout`/`reset`/`restore`... → rơi xuống gate.
- Giữ nguyên các lệnh đọc đơn còn lại trong `safeCmds`.
- Message khi chặn: giữ `gate.message`; trường hợp chặn vì lệnh ghép/không nhận diện, vẫn dùng đường gate hiện có (không thêm message mới ngoài gate-policy).

**Out of scope**
- KHÔNG đụng phân loại `Write`/`Edit` (vùng `Design/`+`docs/`). KHÔNG đổi chữ ký `onPreToolUse`.
- KHÔNG viết shell-parser đầy đủ — chỉ heuristic chuỗi an toàn-quá-mức.
- KHÔNG đổi `gate-policy.yaml` hay logic `evaluateGate`/`isBlocked` (W2D).

## 3. Checklist
- [ ] `cat x && npm install` → `deny` (hết bypass token-đầu).
- [ ] `ls docs` / `git status` / `git diff` / `cat docs/00-vision.md` → `allow`.
- [ ] `git apply patch.diff` / `git checkout .` → đánh giá gate → `deny` khi gate đóng.
- [ ] `echo hi > src/x.ts` (đã chặn) + `cat a | tee src/x.ts` (mới chặn) → `deny`.
- [ ] Test bổ sung phủ đúng các ca trên; test W3C cũ vẫn xanh.

## 4. Interfaces / Files expected to change
- Chữ ký `onPreToolUse` **không đổi**.
- `[MODIFY]` `src/adapters/claude/preToolUse.ts` (~+20 dòng ở khối Bash)
- `[MODIFY]` `src/adapters/claude/preToolUse.test.ts` (+ ca: lệnh ghép bypass, git read-only vs git ghi, tee→file)

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Chặn nhầm lệnh đọc hợp lệ có pipe (vd `git log \| head`) | TB | Chấp nhận chặn (an toàn hơn lọt); người dùng tách lệnh. Ghi rõ trong nghiệm thu. |
| Bỏ sót operator nguy hiểm khác | TB | Dùng danh sách operator + `tee`; "không chắc → chặn" làm mặc định. |
| Vỡ test W3C cũ | TB | Giữ allow cho các lệnh đọc đơn cũ; chạy lại full preToolUse.test. |

## 6. Verification plan
- `npx vitest run preToolUse` — phủ bypass lệnh ghép, git read-only/ghi, tee→file, các ca W3C cũ.
- `npm run typecheck && npm run lint && npm test` — toàn bộ xanh.

## 7. Status
`WAITING_FOR_APPROVAL`
