# MVP Scope Lock — Month 1

> **Chốt phạm vi phát triển cho Month 1.** Bản chạy được đầu tiên của dự án DesignEverything.

## Tại sao cần file này
Người mới (và AI agent) dễ bị cuốn vào việc giải quyết tất cả các nhánh (web/mobile), các adapter (Claude Code/AGENTS.md) hoặc các tính năng nâng cao (maintain/drift flagging). File này khóa cứng phạm vi của Month 1 để cả đội ngũ phát triển và AI chỉ bám sát theo một lát cắt dọc tối thiểu hoạt động được (vertical slice), tránh phình phạm vi (scope creep).

---

## 1. Phạm vi tính năng và nền tảng (Month 1)

Trong Month 1, chúng ta chỉ triển khai và đảm bảo hoạt động hoàn chỉnh cho cấu hình sau:

*   **Harness/Adapter duy nhất**: Chỉ xây dựng adapter cho **Claude Code** (Bậc A - ép cứng với cơ chế hook thực tế).
*   **Nhánh phát triển duy nhất**: Chỉ hỏi và xử lý nhánh **Web** (phỏng vấn từ câu S0–S6 và rẽ sang nhánh web W1–W5).
*   **Gate policy tối thiểu**: Chỉ kích hoạt đúng **1 gate** duy nhất tên là `scope-locked`.
*   **Hooks hỗ trợ**: Chỉ cài đặt 3 hook cốt lõi của Claude Code là `SessionStart`, `UserPromptSubmit`, và `PreToolUse`.
*   **Giao tiếp hội thoại**: Triển khai skill để **INJECT** câu hỏi hiện tại kèm theo 4 quy tắc vàng và nội dung dịch ngược `translate_back`.

---

## 2. Quản lý câu hỏi (Interview Script)

*   **Câu hỏi hoạt động**: Chỉ thực thi và kiểm thử các câu hỏi thuộc Khung Lõi (`S0` đến `S6`) và nhánh Web (`W1` đến `W5`).
*   **Nhánh Mobile**: Kịch bản Mobile (`M1` đến `M5`) **vẫn được khai báo** trong `script.yaml` để đảm bảo tính nhất quán của schema lõi, nhưng **hoàn toàn không** được gọi, kiểm thử hoặc xử lý logic nhánh này trong code adapter của Month 1.

---

## 3. Quản lý Gate & Tài liệu bắt buộc

Căn cứ vào `gate-policy.yaml` đã khóa, điều kiện để mở cổng phát triển (cho phép code/build) là:
*   **Tài liệu bắt buộc phải có**:
    1.  `00-vision.md` (sinh ra sau S0, S1)
    2.  `01-personas.md` (sinh ra sau S2)
    3.  `02-scope.md` (sinh ra sau S3)
*   Khi cả 3 tài liệu trên tồn tại đầy đủ, gate `scope-locked` sẽ mở ra $\rightarrow$ Adapter Claude Code sẽ cho phép sử dụng các công cụ lập trình (`Write`, `Edit`, `Bash` để code/build).

---

## 4. Định nghĩa "Bản chạy được" (Definition of Done cho Month 1)

Một phiên làm việc được coi là thành công và đạt yêu cầu của Month 1 khi:
1.  Khởi động phiên: Hook `SessionStart` tạo đúng file trạng thái `progress.json` ban đầu.
2.  Phỏng vấn: Đi qua lần lượt từ `S0` $\rightarrow$ `S6`, sau đó rẽ sang `W1` $\rightarrow$ `W5` thành công trên terminal của Claude Code. Mỗi lượt tương tác của người dùng chỉ tiến tối đa 1 bước (đảm bảo nhịp).
3.  Tạo tài liệu: Rót đúng thông tin đã dịch ngược vào các file tài liệu theo taxonomy đầu ra (trong thư mục `docs/`). Các tài liệu sinh ra đều mang mỏ neo truy vết ở trạng thái `status=planned`.
4.  Ép gate cứng:
    *   Trước khi trả lời đến `S3` (chưa có `02-scope.md`), nếu AI cố tình viết code hoặc chạy lệnh build ứng dụng $\rightarrow$ Hook `PreToolUse` phải chặn đứng và đưa ra thông báo lỗi từ gate-policy.
    *   Sau khi phỏng vấn xong `S3` (và đã tạo đủ 3 doc bắt buộc) $\rightarrow$ Gate `scope-locked` mở, cho phép AI viết code và chạy lệnh build bình thường.

---

## 5. Các phần cố ý chưa làm trong Month 1 (Out of Scope)

*   **Nhánh Mobile**: Không xử lý logic mobile, không xuất file `07-release.md`.
*   **Adapter bậc B (`AGENTS.md`)**: Chưa sinh rules tự động, chưa test trên Cursor/Codex/Cline.
*   **Chau chuốt template**: Chỉ sinh nội dung cấu trúc cơ bản, chưa tối ưu hóa văn phong/lý do chi tiết.
*   **Phân phối sản phẩm**: Chưa đóng gói npm package, chưa viết hướng dẫn cài đặt bên ngoài.
*   **Bảo trì tài liệu (Drift Flagging/Fixing)**: Tầm nhìn dài hạn, hoàn toàn nằm ngoài phạm vi Month 1.

---

## 6. Đối chiếu sự nhất quán

*   **Khớp với [ProductPRD.md](../../ProductPRD.md) §9 (Non-goals)**: Không UI, không DB, không backend, không tự chạy model riêng.
*   **Khớp với [gate-policy.yaml](../../Content/interview-script/gate-policy.yaml)**: Đòi hỏi đúng 3 file `00-vision.md`, `01-personas.md`, `02-scope.md` để mở gate `scope-locked`, chặn các hành động `Write`, `Edit`, `Bash`.
