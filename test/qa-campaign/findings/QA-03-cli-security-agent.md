# Báo cáo lane `QA-03` — `cli-security-agent`

## Tóm tắt

- Kết luận: `FAIL`
- Commit/branch: `b392c1b` / `main`
- Thời gian: 2026-07-30 01:35–02:44 (UTC+07:00)
- OS / Node / npm: Windows / `v24.11.1` / `11.6.2`
- Snapshot drift: `YES`. Tracked source/test thay đổi bởi phiên khác trong lúc lane chạy; kết quả được xem là exploratory trên working tree hiện tại.
- Phạm vi đã chạy: đủ 8 suite bắt buộc; 21 probe adversarial mới trên Codex; tái hiện có kiểm soát 3 probe trọng yếu, hai lần trên cả Claude và Codex.
- Phần không chạy và lý do: probe capability token đúng nhưng khác workspace/wrong operation đã khởi chạy trong hai workspace tạm nhưng runner timeout trước khi trả evidence; không kết luận từ lần chạy này.
- Finding/observation: `S0: 0, S1: 1, S2: 0, S3: 0, S4: 3`

## Lệnh và kết quả

Tất cả payload giống lệnh shell trong phần novel probe chỉ được truyền như chuỗi JSON vào hook; không payload nối lệnh nào được thực thi.

| Lệnh/probe | Exit code | Kết quả | Thời lượng | Bằng chứng |
|---|---:|---|---:|---|
| `rtk npx vitest run test/integration/cli-protocol.test.ts --pool=forks --maxWorkers=1 --minWorkers=1` | 0 | PASS | 130.41s | 15/15 test |
| `rtk npx vitest run test/integration/adapter-parity.test.ts --pool=forks --maxWorkers=1 --minWorkers=1` | 0 | PASS | 62.05s | 4/4 test |
| `rtk npx vitest run test/integration/deepen-cli.test.ts --pool=forks --maxWorkers=1 --minWorkers=1` | 0 | PASS | 106.64s | 10/10 test |
| `rtk npx vitest run test/integration/installed-runtime/cli-health.test.ts --pool=forks --maxWorkers=1 --minWorkers=1` | 0 | PASS | 42.94s | 8/8 test |
| `rtk npx vitest run test/integration/installed-runtime/cli-invocation-recognition.test.ts --pool=forks --maxWorkers=1 --minWorkers=1` | 0 | PASS | 58.58s | 4/4 test |
| `rtk npx vitest run test/integration/installed-runtime/hook-adversarial.test.ts --pool=forks --maxWorkers=1 --minWorkers=1` | 0 | PASS | 98.61s | 21/21 test |
| `rtk npx vitest run test/integration/installed-runtime/codex-pre-tool-use.test.ts --pool=forks --maxWorkers=1 --minWorkers=1` | 0 | PASS | 56.82s | 4/4 test |
| `rtk npx vitest run test/integration/installed-runtime/codex-post-tool-use.test.ts --pool=forks --maxWorkers=1 --minWorkers=1` | 0 | PASS | 88.84s | 2/2 test |
| Ma trận 21 chuỗi adversarial gửi trực tiếp vào Codex PreToolUse | 0 | FAIL | 137.23s | 21/21 hook invocation trả JSON hợp lệ; newline chain trả `allow` |
| Tái hiện newline/unknown-launcher/control `&&`, 2 lần × 2 adapter | 0 | FAIL | 66.46s | newline: Claude 2/2 silent allow, Codex 2/2 explicit allow; `&&` control bị deny 4/4 |
| Token cross-workspace và wrong-operation trong temp | — | BLOCKED | >300s | tool timeout trước khi trả output; không dùng làm evidence |

Tổng suite bắt buộc: **8/8 file PASS, 68/68 test PASS**.

Ma trận novel probe đã kiểm:

| Nhóm | Input | Decision Codex |
|---|---|---|
| Subcommand/flag | mixed-case `StAtUs` | allow tới CLI |
| Subcommand/flag | `status --json --json` | allow tới CLI |
| Subcommand/flag | `commit --capability-token` thiếu value | allow tới CLI |
| Subcommand/flag | value bắt đầu bằng `--` | allow tới CLI |
| Subcommand/flag | hai capability token khác nhau | allow tới CLI |
| Quote | answer có quoted space | allow tới CLI |
| Quote | answer có escaped quote | allow tới CLI |
| Whitespace | NBSP giữa `node` và launcher | allow |
| Shell | `&&` | deny |
| Shell | `;` | deny |
| Shell | `|` | deny |
| Shell | newline | **allow — finding QA-03-F01** |
| Shell | backtick substitution | deny |
| Shell | PowerShell call operator `&` | deny |
| Wrapper | `cmd /c` | deny |
| Wrapper | `powershell -Command` | deny |
| Wrapper | `node -e` | deny |
| Path | `hooks/../cli.mjs` | allow |
| Path | Windows path đổi sang `/` | allow |
| Path | launcher đổi casing | deny |
| Path | launcher ngoài runtime, path chưa tồn tại | allow |

Việc hook cho phép malformed flag đi tới CLI không tự nó là bypass; suite protocol xác nhận CLI vẫn chịu trách nhiệm trả envelope/exit code. Không nâng các trường hợp này thành finding khi chưa có evidence CLI fail-open.

## Finding `QA-03-F01` — Newline command chaining vượt PreToolUse trên cả Claude và Codex

- Severity: `S1 — Critical`
- Confidence: `high`
- Tỷ lệ tái hiện: Claude `2/2`; Codex `2/2`; tổng `4/4`
- Thành phần: installed runtime `hooks/pre-tool-use.mjs`, shell command tokenizer/classifier, adapter Claude và Codex
- Phạm vi ảnh hưởng: mọi workspace đã tham gia DesignEverything; một lệnh bắt đầu bằng launcher CLI hợp lệ có thể nối thêm command bằng CR/LF mà gate vẫn cho phép.
- Preconditions: runtime đã cài, workspace đã `init`; attacker/agent có thể gửi Bash tool input chứa newline.

### Bước tái hiện

1. Cài adapter Claude hoặc Codex vào một thư mục tạm và chạy CLI `init --json`.
2. Gọi trực tiếp installed `hooks/pre-tool-use.mjs`, truyền stdin JSON với `tool_name: "Bash"`.
3. Đặt `tool_input.command` thành chuỗi dưới đây, trong đó `\n` là newline thật:

```text
node "<TMP>/.design-everything/runtime/6.0.0/cli.mjs" status
echo never-executed
```

4. Chỉ đọc decision của hook; không chuyển chuỗi trên cho shell.
5. Lặp lại hai lần cho mỗi adapter. Dùng cùng fixture với `&&` làm control.

### Expected

Hook phải fail-closed và trả `deny` cho mọi command gồm nhiều shell segment, bất kể separator là `&&`, `;`, `|`, CR hay LF.

### Actual

- Claude: hook exit 0 và không có stdout ở cả 2 lần, tương ứng silent allow.
- Codex: hook exit 0 và trả `permissionDecision: "allow"` ở cả 2 lần.
- Control thay newline bằng `&&` bị deny ở cả Claude và Codex, cả 2 lần.

### Bằng chứng

```text
adapter=claude run=1 newline-chain decision=allow-silent exit=0
adapter=claude run=2 newline-chain decision=allow-silent exit=0
adapter=codex  run=1 newline-chain decision=allow        exit=0
adapter=codex  run=2 newline-chain decision=allow        exit=0

adapter=claude run=1 and-control decision=deny exit=0
adapter=claude run=2 and-control decision=deny exit=0
adapter=codex  run=1 and-control decision=deny exit=0
adapter=codex  run=2 and-control decision=deny exit=0
```

Temp roots đã được rút gọn thành `<TMP>` và xóa sau probe. Payload thứ hai là `echo never-executed`; không payload phá hoại nào được dùng hoặc thực thi.

Finding này không được suy ra từ một assertion đang drift: nó được tái hiện qua hai target install độc lập (Claude/Codex), hai lần mỗi adapter trong cùng harness chỉ đọc decision. Dù vậy, vì campaign có snapshot drift, cần pin commit sạch rồi chạy lại regression trước khi release.

### Phân tích

- Nguyên nhân khả dĩ: bộ phát hiện dangerous shell syntax nhận `&&`, `;`, `|`, backtick và call operator nhưng không coi CR/LF là command separator trước khi nhận dạng launcher CLI hợp lệ.
- Vì sao chọn severity này: đây là fail-open trực tiếp ở ranh giới thực thi. Sau khi hook trả allow, shell thật sẽ thực thi segment sau newline; không có lớp gate khác được chứng minh sẽ chặn segment thứ hai.
- Workaround: không truyền command nhiều dòng vào Bash; runner phía ngoài nên từ chối CR/LF cho tới khi runtime được sửa.
- Test regression nên bổ sung: cùng một bảng separator `\n`, `\r`, `\r\n`, Unicode line separator, `&&`, `;`, `|` cho cả installed Claude và Codex; assert deny trước khi launcher/subcommand classification có thể trả allow.
- Có thể trùng với: nhóm P4.3 command chaining/tokenizer, nhưng các test hiện tại chỉ pin `&&`, `;`, `|` và không bao phủ newline.

## Observation không đủ bằng chứng thành bug

| ID | Quan sát | Rủi ro | Cách kiểm tiếp |
|---|---|---|---|
| QA-03-O01 (S4) | Codex allow launcher ngoài runtime khi path chưa tồn tại, nhưng deny 2/2 khi tạo file JS trơ tại chính path đó; Claude deny path tồn tại 2/2. | TOCTOU hoặc parity không nhất quán nếu file xuất hiện giữa check và execution; chưa chứng minh đường khai thác ổn định. | Probe symlink/junction và create-after-check trong temp trên snapshot sạch, không thực thi file. |
| QA-03-O02 (S4) | Codex deny launcher đúng khi chỉ đổi casing toàn path trên Windows, trong khi `/` và `..` được normalize. | False-deny trên filesystem case-insensitive; có thể làm hỏng invocation hợp lệ. | Lặp lại 2 lần trên Claude/Codex và Windows volume case-insensitive ở snapshot sạch. |
| QA-03-O03 (S4) | Capability token cross-workspace/wrong-operation probe timeout trước output. | Contract token scope chưa có novel evidence độc lập ngoài suite forged/replay hiện có. | Chạy một workspace/operation mỗi process với timeout riêng và lưu envelope đã redact. |
| QA-03-O04 | Working tree drift trong suốt lane; `package.json`, nhiều tracked test và toàn bộ `test/qa-campaign/` đang dirty/untracked. | Kết quả không đại diện cho một commit sạch có thể tái tạo hoàn toàn. | Tạo snapshot/commit sạch, ghi digest trước-sau, chạy lại 8 suite và QA-03-F01. |

## Coverage và residual risk

- Đã kiểm: public CLI protocol; parity suite; deepen; installed health/invocation; adversarial hook; Codex pre/post hook; mixed-case/duplicate/missing flags; quoted/escaped/Unicode input; 7 dạng shell separator/operator; 3 nested wrapper; path `..`, separator, casing và unknown launcher; JSON parseability của 21 hook responses.
- Chưa kiểm hoàn chỉnh: token hợp lệ dùng khác workspace/phase/operation; CRLF/Unicode line separator; symlink/junction launcher; stderr Unicode/invalid UTF-8; repeatability trên snapshot git sạch.
- Rủi ro còn lại: newline fail-open ảnh hưởng trực tiếp cả hai adapter. Mandatory suite PASS không phát hiện được lỗi này vì không có test CR/LF separator.
