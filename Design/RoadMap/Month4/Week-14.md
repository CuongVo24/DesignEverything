# Tuần 14/16 — Nghiên cứu đối thủ + định vị + landing

> Tháng 4 · Mốc: Đáng chia sẻ · Phụ thuộc: Tuần 13

## Tại sao cần file này
Khi sản phẩm bắt đầu ra ngoài, "nó làm gì" là chưa đủ; cần nói rõ "nó khác gì" và "nó dành cho ai". Tuần này tồn tại để biến trực giác định vị trong FirstIdea thành ngôn ngữ người khác hiểu được, thay vì mỗi lần giới thiệu lại phải kể lại lịch sử dự án từ đầu.

## Mục tiêu tuần (Definition of Done)
Cuối tuần phải có một bảng so sánh đủ công bằng với một vài công cụ gần nhất, một tuyên ngôn định vị ngắn gọn, và một landing/pitch 1 trang có thể dùng để chia sẻ với người ngoài. Mục tiêu không phải marketing hoành tráng, mà là làm rõ DesignEverything giải quyết bài toán nào và cố ý không giải quyết bài toán nào.

## Việc chi tiết
- [ ] Nghiên cứu kỹ Spec Kit, Kiro, BMAD, Taskmaster (chỗ họ làm dở).
- [ ] Viết bảng so sánh + điểm khác biệt cốt lõi (PHỎNG VẤN, không SINH).
- [ ] Soạn tuyên ngôn định vị + thông điệp cho người mới.
- [ ] Dựng landing/pitch 1 trang.
- [ ] Kiểm tra mọi claim đều bám vào thứ repo hiện có, không hứa trước những thứ chưa xây.
- [ ] Dùng phản hồi Month 3 để bảo đảm định vị nói đúng nỗi đau thật, không chỉ nói đúng ý tác giả.

## Đầu vào / Phụ thuộc
FirstIdea, ProductPRD, phản hồi dogfood Month 3, README/onboarding từ tuần 13 và mọi artifact thật đã có trong repo. Tuần này phải dựa vào bằng chứng nội bộ trước khi nhìn ra đối thủ bên ngoài.

## Đầu ra / Artifact
- Bảng so sánh đối thủ ngắn gọn nhưng có ích.
- Tuyên ngôn định vị/pitch sử dụng được ngay.
- Một landing hoặc trang giới thiệu ngắn phục vụ chia sẻ sớm.

## Rủi ro & cạm bẫy
Rủi ro lớn nhất là viết định vị bằng những câu quá rộng hoặc quá tự khen. Tuần này phải nói bằng sự thật repo chứng minh được: phỏng vấn thay vì template trống, 4 quy tắc vàng, gating dựa trên artifact, và graceful degradation giữa harness cứng/mềm.

## Nghiệm thu
- [ ] Có câu trả lời rõ cho "vì sao dùng DesignEverything thay vì công cụ gần nhất".
- [ ] Mọi claim trong pitch/landing đều bám vào thứ đã làm được.
- [ ] Định vị nêu rõ cả đối tượng phù hợp lẫn trường hợp không phù hợp.
- [ ] Người đọc mới có thể hiểu sản phẩm mà không cần đọc toàn bộ `Design/`.

## Kết quả W14A — Smoke run thật đầu tiên (2026-07-10, post-v2)
Chạy trọn một phiên phỏng vấn thật trong Claude Code (model Fable 5, calibrate `deep`) trên dự án greenfield **yt-cli** (trình nghe nhạc YouTube không quảng cáo, shape `cli`), qua bộ đóng gói [adapter/claude-code/](../../../adapter/claude-code/):
- **Cơ chế:** 14 bước CAL0→C5 commit đúng một-bước-mỗi-lượt; critic-pass fire đúng 2 điểm (S3, C5); branch một chiều; gate `scope-locked` chặn/mở đúng; emit đúng taxonomy. Một lệch spec nhỏ: skill viết `docs/00-vision.md` giữa phỏng vấn (đã siết trong SKILL.md: `docs/` chỉ sinh từ emit).
- **Nội dung:** critic + S3 cắt đúng scope creep thật (người dùng mở đầu đòi CLI + mobile → mobile về Won't/giai-đoạn-2). Chất lượng quyết định kỹ thuật tốt (yt-dlp + mpv IPC, config theo chuẩn OS, SemVer).
- **Metric gốc:** soạn xong bộ docs nền móng trong **~1.5–2 giờ** (baseline nỗi đau: ~1 tuần).
- **Phát hiện quan trọng nhất:** docs 00–07 đủ "xây gì/vì sao" nhưng người mới vẫn không biết "bắt đầu từ đâu, thứ tự nào" → chốt [D28](../../DecisionLog.md): thêm file dẫn xuất `08-build-plan.md` (v3.0.0).
- **Giới hạn:** đây là self-run (tác giả là người được phỏng vấn), chưa phải external validation với người ngoài — phần đó của W14A vẫn mở.

## Follow-up sau review V3 (2026-07-13)

Review output yt-cli xác nhận 08-build-plan là cần thiết nhưng chưa đủ: gate mở khi docs tồn tại, M0 vẫn gồm nhiều quyết định môi trường/dependency, README sinh ra có thể sai shape/lệnh, và unit/golden chưa chứng minh newbie làm được. D29-D35 đã khoá hướng sửa: semantic validation, risk spike, task/evidence state, execution protocol và evaluation journey. Kế hoạch/contract: [V3-ExecutionExpansionPlan.md](../V3-ExecutionExpansionPlan.md) và ContractForAI/Core/v3-expansion. W14A chỉ được coi là external validation khi có pilot người ngoài tác giả theo B10a.
