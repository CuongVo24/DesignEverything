# Tuần 6/16 — Adapter AGENTS.md (bậc B) + test Codex/Cursor

> Tháng 2 · Mốc: v1 dùng được · Phụ thuộc: Tuần 5

## Tại sao cần file này
Nếu Claude Code là bản tham chiếu ép cứng, thì `AGENTS.md` là con đường ngắn nhất để biến DesignEverything thành công cụ thật sự lan ra nhiều môi trường làm việc. Tuần này cần nói thật về giới hạn của enforcement mềm, đồng thời vẫn giữ được cùng lõi nội dung và gate message.

## Mục tiêu tuần (Definition of Done)
Cuối tuần phải sinh được một `AGENTS.md` từ lõi với nội dung hỏi từng bước, gate mềm và tuyên bố giới hạn enforcement rõ ràng; đồng thời test được tối thiểu trên Codex và một harness rules-only khác như Cursor hoặc Cline. Mục tiêu không phải chặn cứng, mà là bảo đảm message của sản phẩm không bị biến dạng khi xuống bậc.

## Việc chi tiết
- [ ] Generator sinh `AGENTS.md` từ lõi theo [../../Adapters/agents-md.md](../../Adapters/agents-md.md).
- [ ] Map gate-policy → câu lệnh rules mềm.
- [ ] Ghi rõ giới hạn "không ép cứng".
- [ ] Test thật trên Codex và/hoặc Cursor.
- [ ] Cập nhật [../../Adapters/ConformanceMatrix.md](../../Adapters/ConformanceMatrix.md) trạng thái ✅.
- [ ] Viết vài prompt smoke-test chuẩn: xin code quá sớm, xin bỏ qua docs, xin tiếp tục hoàn thiện docs.
- [ ] So sánh output docs từ harness mềm với output từ Claude Code trên cùng một fixture nhỏ.

## Đầu vào / Phụ thuộc
Spec `agents-md.md`, `gate-policy`, `script.yaml`, nội dung `doc-templates`, cùng Month 1 reference implementation để dùng làm chuẩn so sánh. Tuần này không được tự chế thêm rules nằm ngoài hợp đồng lõi.

## Đầu ra / Artifact
- Một generator hoặc template hóa `AGENTS.md` lấy nội dung từ lõi.
- Kết quả smoke-test trên Codex và ít nhất một harness rules-only khác.
- Cập nhật `ConformanceMatrix` phản ánh đúng cái gì đã test thật, cái gì chưa.

## Rủi ro & cạm bẫy
Rủi ro lớn nhất là bán quá lời rằng harness mềm "bị chặn" như Claude Code. Tuần này phải giữ ngôn ngữ trung thực: đây là chỉ dẫn mạnh, không phải enforcement deterministic. Bẫy thứ hai là drift giữa `AGENTS.md` generator và lõi nội dung nếu copy-paste nhiều chỗ.

## Nghiệm thu
- [ ] Sinh ra được `AGENTS.md` với 5 phần lõi như đặc tả.
- [ ] Prompt smoke-test cho thấy harness mềm được kéo về hỏi/doc thay vì lao vào code ngay từ đầu, ít nhất trên một số tình huống đại diện.
- [ ] Tài liệu nói thật giới hạn enforcement, không nhập nhằng với bậc A.
- [ ] `ConformanceMatrix` chỉ đánh dấu những gì đã test thật.
