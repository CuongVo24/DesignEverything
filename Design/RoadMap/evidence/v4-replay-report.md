# Cross-runtime Replay Benchmark Report

Tài liệu này ghi nhận ma trận kết quả chạy thử nghiệm đối chiếu (replay benchmark) giữa hai môi trường Claude Code và Codex Plugin trên các stacks kỹ thuật Node CLI, Vite Web và Python CLI.

## 1. Kết quả chạy thử nghiệm (Replay Matrix)

| Dự án mẫu | Công cụ (Tool) | Tham số đầu vào (Input) | Task hiện tại | Quyết định kỳ vọng | Quyết định thực tế | Kết quả |
|---|---|---|---|---|---|---|
| node-cli | Bash | `node --version` | T0-discovery | allow | allow | PASS |
| node-cli | Bash | `npm install typescript` | T0-discovery | deny | deny | PASS |
| node-cli | apply_patch | `src/index.ts` | T2-skeleton | allow | allow | PASS |
| node-cli | apply_patch | `package.json` | T2-skeleton | deny | deny | PASS |
| vite-web | Bash | `npm run build` | T3-verify | allow | allow | PASS |
| python-cli | Bash | `pytest` | T3-verify | allow | allow | PASS |

## 2. Kết quả tổng hợp

*   Tổng số kiểm tra: 6. Pass: 6. Fail: 0.
*   Tất cả kiểm tra khớp quyết định kỳ vọng trong ma trận replay.

## 3. Phạm vi & Giới hạn (Parity & Gaps)

*   Ma trận trên là **replay quyết định của PreToolUse hook** cho các tool `Bash` và `apply_patch` mà hook thực sự intercept — KHÔNG phải bằng chứng ngăn chặn tuyệt đối. Các đường tool nằm ngoài PreToolUse (direct file read, network call không qua shell) vẫn là gap đã tài liệu hóa và cần người dùng giám sát qua PostToolUse audit + runner evidence.
*   Trạng thái thực thi được đặt phục vụ replay quyết định của hook; hành trình end-to-end đầy đủ (doctor → validate → start → verify) được kiểm bởi bộ test tích hợp riêng.
