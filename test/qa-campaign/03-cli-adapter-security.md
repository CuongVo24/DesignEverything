# QA-03 — CLI, adapter và security boundary

## Mục tiêu

Kiểm tra public CLI contract, parity Claude/Codex, capability enforcement, phân loại shell command và các đường bypass gate.

## Check bắt buộc

```powershell
rtk npx vitest run test/integration/cli-protocol.test.ts
rtk npx vitest run test/integration/adapter-parity.test.ts
rtk npx vitest run test/integration/deepen-cli.test.ts
rtk npx vitest run test/integration/installed-runtime/cli-health.test.ts
rtk npx vitest run test/integration/installed-runtime/cli-invocation-recognition.test.ts
rtk npx vitest run test/integration/installed-runtime/hook-adversarial.test.ts
rtk npx vitest run test/integration/installed-runtime/codex-pre-tool-use.test.ts
rtk npx vitest run test/integration/installed-runtime/codex-post-tool-use.test.ts
```

## Contract phải đối chiếu

- Subcommand công khai: `status`, `init`, `commit`, `validate`/`build`, `repair`, `emit`, `next`, `start`, `verify`, `review`, `deepen`.
- Envelope luôn có cấu trúc nhất quán và exit code khớp `ok`/reason category.
- Claude và Codex cho cùng decision/state transition với cùng fixture.
- Unknown launcher/subcommand, corrupt state và missing runtime đều fail-closed.
- Capability token không thể thiếu, giả, replay, dùng sai operation hoặc rò qua message.
- Chuỗi lệnh/nested shell không biến thành allow vì tokenizer hoặc quote.
- Path được normalize nhất quán trên Windows separator, quote và casing.

## Novel probes bắt buộc

Ít nhất mười input adversarial, gồm:

- mixed-case subcommand và flag trùng;
- flag thiếu value, value bắt đầu bằng `--`, flag lặp với hai giá trị;
- quoted space, escaped quote, Unicode whitespace;
- `&&`, `;`, `|`, newline, backtick và PowerShell call operator;
- `cmd /c`, `powershell -Command`, `node -e` bọc CLI;
- absolute/relative path có `..`, dấu `/` và `\`, khác hoa thường;
- output JSON khi stdout/stderr có Unicode hoặc input bất thường;
- token đúng định dạng nhưng thuộc workspace/phase/operation khác.

Không chạy payload phá hoại; mục tiêu là decision của gate, không phải thực thi lệnh.

## Oracle

Không fail-open, không parser ambiguity dẫn đến allow, parity không lệch, error envelope không lộ secret/absolute dev path và luôn có hướng recovery an toàn.

## Báo cáo

Ghi vào `findings/QA-03-<ten-phien>.md` theo `report-template.md`.
