# Glossary — Từ vựng chuẩn

> **Chốt từ vựng trước khi viết câu.** Dự án này là chữ nghĩa → mọi file, mọi adapter ở mọi harness phải gọi tên một thứ giống nhau. Thuật ngữ mới phải thêm vào đây trước khi dùng rộng.

## Tại sao cần file này
Không có nguồn từ vựng chuẩn → mỗi doc viết mỗi kiểu, adapter mỗi harness đặt tên khác nhau, người mới loạn. Glossary giữ nhất quán xuyên suốt.

## Kiến trúc

| Thuật ngữ | Nghĩa | Đừng nhầm với |
|---|---|---|
| **Lõi (Core)** | Phần portable, viết một lần: hợp đồng + schema + taxonomy + anchor. | Không phải code adapter. |
| **Adapter** | Lớp gầy phủ một *harness*, làm đúng 3 việc INJECT/GATE/EMIT. | Không phải lớp phủ *model*. |
| **Harness** | Môi trường chạy agent (Claude Code, Cursor, Codex CLI, Cline...). Hook/rules nằm ở đây. | Không phải model (DeepSeek/GLM là model). |
| **Hợp đồng (Contract)** | Public API giữa Lõi và Adapter. Đổi = theo Versioning. | Không phải "ContractForAI" của dự án cũ. |

## Ba việc của Adapter

| Thuật ngữ | Nghĩa |
|---|---|
| **INJECT** | Đưa kịch bản phỏng vấn vào kênh chỉ thị của host (skill / `AGENTS.md`). |
| **GATE** | Chặn sinh code khi doc chưa xong (hook cứng / rules mềm). |
| **EMIT** | Cho output rơi đúng cây taxonomy. |

## Hai mức ép

| Thuật ngữ | Nghĩa |
|---|---|
| **Bậc A — ép cứng** | Harness có hook (Claude Code). Lệnh do harness chạy → deterministic. "Không xong doc, không cho code" là thật. |
| **Bậc B — ép mềm** | Harness chỉ đọc rules. Khuyến nghị mạnh, không bảo đảm. |
| **Graceful degradation** | Hứa nội dung như nhau mọi nơi, ép tốt nhất nền tảng cho phép — KHÔNG hứa ép bằng nhau. |

## Phương pháp phỏng vấn

| Thuật ngữ | Nghĩa |
|---|---|
| **Kịch bản phỏng vấn (interview-script)** | Sản phẩm thật: luồng câu hỏi S0–S6 + nhánh W/M, định dạng máy đọc. |
| **Dịch ngược (translate-back)** | Người dùng trả lời đời thường → agent tóm lại bằng ngôn ngữ chuẩn rồi xác nhận. |
| **Mặc định thông minh (smart default)** | Mỗi câu kèm lựa chọn phổ biến nhất; "không biết → chọn giúp" vẫn đi tiếp. |
| **Khung Lõi (S0–S6)** | Phần phỏng vấn dùng chung web & mobile (~70%). |
| **Nhánh (W1–W5 / M1–M5)** | Phần rẽ riêng cho web / mobile sau S6. |
| **MoSCoW** | Phân loại tính năng: Must / Should / Could / Won't. S3 dùng. |

## State & Gate

| Thuật ngữ | Nghĩa |
|---|---|
| **State machine** | Trạng thái phiên trong `progress.json`; chỉ tiến 1 bước mỗi lượt người thật. |
| **gate-policy** | Khai báo: chưa có doc X thì cấm hành động Y. |
| **Artifact-based gating** | Ép dựa trên "file có chưa / state đủ chưa", KHÔNG dựa trên ý định hay chất lượng câu. |

## Truy vết & Maintain (tầm nhìn xa)

| Thuật ngữ | Nghĩa |
|---|---|
| **Mỏ neo truy vết (anchor)** | Metadata nối một mẩu doc tới `file::symbol` + git blame SHA. Xem AnchorFormat. |
| **Drift (lệch pha)** | Code đổi sau lần sửa doc → doc có thể đã cũ. |
| **Drift Flagging** | Chỉ *gắn cờ* doc nghi đã cũ. Rẻ, an toàn — làm trước. |
| **Drift Fixing** | LLM đề xuất bản sửa doc. Đắt — làm sau. |
| **Dogfooding** | Dùng chính DesignEverything để sinh lại cây `Design/` của nó. |

## Quy ước viết
- Trong doc tiếng Việt, dùng tên tiếng Việt + kèm tên tiếng Anh trong ngoặc lần đầu: "Lõi (Core)".
- Trong code/schema, dùng tên tiếng Anh kebab-case: `interview-script`, `gate-policy`.
