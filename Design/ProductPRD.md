# ProductPRD — DesignEverything

> Chuẩn hoá từ [FirstIdea.md](../FirstIdea.md). FirstIdea giữ nguyên làm chứng tích brainstorm; file này là phiên bản PRD có cấu trúc.

## Tại sao cần file này
Một câu trả lời chung cho mọi quyết định sau này: "Sản phẩm là gì, cho ai, thắng bằng gì?" Khi phân vân tính năng/phạm vi, quay về đây.

## 1. Một câu
DesignEverything = bộ **Lõi-text portable** (kịch bản phỏng vấn + template doc + taxonomy) **+ adapter native gầy theo từng harness**, biến ý định đời thường thành spec. Hiện sản phẩm đã hỗ trợ plan-validated và task/evidence để dẫn dắt thực thi có bằng chứng ở mốc 4.0.0.

## 2. Nỗi đau gốc
Người vibe code nhảy thẳng vào code, bỏ qua tài liệu nền móng. Soạn tài liệu mất ~1 tuần và thường chưa tối ưu. Ngay cả khi đã có spec đẹp, người mới vẫn không biết task đầu tiên là gì, cần kiểm chứng môi trường nào, test fail thì sửa ra sao, hoặc khi nào được sang milestone tiếp.

## 3. Đối tượng
- Dự án **greenfield** (từ số 0).
- Ưu tiên **người hoàn toàn không biết viết doc**.
- Hệ quả cốt lõi: sản phẩm **PHỎNG VẤN**, không SINH từ template trống.

## 4. Hai quyết định đã chốt
1. Đối tượng = người mới + dự án từ 0 → lõi là **phỏng vấn** (hỏi câu đời thường → dịch sang ngôn ngữ chuẩn).
2. Hình hài = **plugin native từng harness, dùng chung một lõi**.

## 5. Định lý ràng buộc: Portable ⟷ Enforce
- Chạy mọi agent → chỉ ép được mức **mềm**.
- Ép **cứng** (chặn nhảy vào code) → chỉ harness có hook (Claude Code). Phạm vi đảm bảo cứng nói thật: **gate dựa artifact** + **giới hạn nhịp một-bước-mỗi-lượt**, KHÔNG phải hook chấm từng câu trả lời (việc diễn giải ý nghĩa là của lớp skill — xem [Core/Contract.md](Core/Contract.md) §3).
- Lối thoát: **nội dung như nhau mọi nơi**, ép tốt nhất nền tảng cho phép (graceful degradation).

## 6. Lợi thế cạnh tranh
Không nằm ở công cụ mà ở **phương pháp đã thực chiến, opinionated** (ContractForAI / TaskBrief mài qua 2 dự án). Mỗi file sinh ra kèm "tại sao cần file này" → người dùng vừa có sản phẩm vừa học nghề. Từ v2, lợi thế được khoét sâu bằng đa hình-hài dự án, calibrate theo trình độ và critic phản biện. V3 Execution Expansion tiếp tục bằng **semantic validation, feasibility spike, task-level gate và evidence/resume**; mục tiêu là không chỉ tạo doc nghe hợp lý mà tạo đường thực thi nhỏ, kiểm được. Xem [RoadMap/V3-ExecutionExpansionPlan.md](RoadMap/V3-ExecutionExpansionPlan.md).

## 7. Đối thủ
GitHub Spec Kit · Kiro (AWS) · BMAD-METHOD · Taskmaster AI · cookiecutter/Yeoman.
**Khe hở:** tất cả giả định người dùng đã biết mình muốn gì. Ta nhắm người chưa biết.

## 8. Không build agent
Chạy **trên lưng** agent có sẵn. Kịch bản phỏng vấn = system prompt + luồng câu hỏi. Không nuôi model.

## 9. Phi mục tiêu (out of scope cho MVP)
- Không tự nuôi/fine-tune model.
- Không UI, không backend, không DB, không deploy hạ tầng hay tự động publish thay người dùng.
- Không biến thành swarm agent, issue tracker hoặc quy trình enterprise.
- Maintain tài liệu (drift flagging/fixing) → tầm nhìn xa, KHÔNG trong MVP.

## 10. Tiêu chí thành công MVP
Mốc 4.0.0 đã đạt được trọn vẹn: Claude Code đi được từ plan-validated đến task đầu có evidence, rules-only công khai giới hạn mềm, và evaluation có người mới chứng minh được journey qua E2E test thực tế.

## Liên kết
- Kiến trúc: [Core/Contract.md](Core/Contract.md)
- Sản phẩm thật: [Content/](Content/)
- Lộ trình: [RoadMap/MasterRoadMap.md](RoadMap/MasterRoadMap.md)
