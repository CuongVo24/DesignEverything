# ProductPRD — DesignEverything

> Chuẩn hoá từ [FirstIdea.md](../FirstIdea.md). FirstIdea giữ nguyên làm chứng tích brainstorm; file này là phiên bản PRD có cấu trúc.

## Tại sao cần file này
Một câu trả lời chung cho mọi quyết định sau này: "Sản phẩm là gì, cho ai, thắng bằng gì?" Khi phân vân tính năng/phạm vi, quay về đây.

## 1. Một câu
DesignEverything = bộ **Lõi-text portable** (kịch bản phỏng vấn + template doc + taxonomy + lý do) **+ adapter native gầy theo từng harness**, ép enforcement xuống bậc theo nền tảng, ra mắt từ Claude Code.

## 2. Nỗi đau gốc
Người vibe code nhảy thẳng vào code, bỏ qua tài liệu nền móng. Soạn tài liệu mất ~1 tuần và thường chưa tối ưu. Nhiều người giỏi vẫn không biết thiết kế thư mục tài liệu chi tiết.

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
Không nằm ở công cụ mà ở **phương pháp đã thực chiến, opinionated** (ContractForAI / TaskBrief mài qua 2 dự án). Mỗi file sinh ra kèm "tại sao cần file này" → người dùng vừa có sản phẩm vừa học nghề.

## 7. Đối thủ
GitHub Spec Kit · Kiro (AWS) · BMAD-METHOD · Taskmaster AI · cookiecutter/Yeoman.
**Khe hở:** tất cả giả định người dùng đã biết mình muốn gì. Ta nhắm người chưa biết.

## 8. Không build agent
Chạy **trên lưng** agent có sẵn. Kịch bản phỏng vấn = system prompt + luồng câu hỏi. Không nuôi model.

## 9. Phi mục tiêu (out of scope cho MVP)
- Không tự nuôi/fine-tune model.
- Không UI, không backend, không DB, không deploy hạ tầng.
- Maintain tài liệu (drift flagging/fixing) → tầm nhìn xa, KHÔNG trong MVP.

## 10. Tiêu chí thành công MVP
Trên Claude Code: skill + hook gate + kịch bản lõi (web) sinh được cây doc end-to-end, và **rút thời gian "1 tuần soạn doc" xuống đo được** trên dự án thật.

## Liên kết
- Kiến trúc: [Core/Contract.md](Core/Contract.md)
- Sản phẩm thật: [Content/](Content/)
- Lộ trình: [RoadMap/MasterRoadMap.md](RoadMap/MasterRoadMap.md)
