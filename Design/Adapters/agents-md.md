# Adapter — AGENTS.md (bậc B, mềm)

> Đây là adapter phủ rộng nhiều harness nhất với chi phí thấp nhất, nhưng chỉ là enforcement mềm. File này phải nói rõ cách dùng, cách inject, và giới hạn của nó để không bán quá lời.

## Tại sao cần file này
Sau bản tham chiếu Claude Code, `AGENTS.md` là đường ngắn nhất để phủ Codex, Cursor, Cline và các harness đọc rules dạng markdown. Nó không ép cứng được, nhưng lại rất phù hợp để dogfood rộng và giữ thói quen “thiết kế trước, code sau” trên nhiều môi trường.

## Mục tiêu và ranh giới
- Mục tiêu:
  - inject đúng tinh thần phỏng vấn từ lõi;
  - truyền gate message sang dạng chỉ dẫn dễ hiểu;
  - giữ output doc thống nhất với taxonomy;
  - nói thật giới hạn enforcement.
- Không làm:
  - không giả vờ rằng `AGENTS.md` chặn được như hook;
  - không hardcode chi tiết từng dự án ngay trong file mẫu;
  - không thay lõi bằng một đống prose khó bảo trì.

## INJECT — nội dung phải sinh vào `AGENTS.md`

### Khối mở đầu tối thiểu
File `AGENTS.md` sinh ra phải chứa:
- mục tiêu của hệ thống;
- 4 quy tắc vàng;
- thứ tự ưu tiên: hỏi -> dịch ngược -> rót vào doc -> chỉ code khi gate mở;
- nhắc rằng `Design/Core/` là nguồn sự thật.

### Mẫu nội dung bắt buộc
`AGENTS.md` sinh ra nên có 5 phần theo thứ tự:
1. `Tại sao repo này dùng chế độ phỏng vấn trước`
2. `Nguồn sự thật phải đọc`
3. `Cách hỏi từng bước`
4. `Gate mềm trước khi code`
5. `Cách emit docs`

### Mẫu chỉ dẫn inject
Nội dung mẫu nên gần với cấu trúc sau:

```md
# AGENTS

## Tại sao cần file này
Repo này buộc agent đi theo hướng phỏng vấn trước khi code để tránh nhảy cóc vào triển khai khi scope và tài liệu còn mơ hồ.

## Nguồn sự thật phải đọc
- Design/VibeCode.md
- Design/Core/Contract.md
- Design/Content/interview-script/script.yaml
- Design/Content/taxonomy.md

## Cách làm việc
1. Hỏi đúng một câu tại một thời điểm theo `script.yaml`.
2. Nếu người dùng không rõ, dùng `default` như một đề xuất để xác nhận, không coi đó là sự thật tuyệt đối.
3. Luôn dịch ngược câu trả lời sang ngôn ngữ chuẩn rồi hỏi xác nhận.
4. Mỗi câu phải rót vào đúng file đích trong taxonomy.

## Gate mềm trước khi code
Không được chủ động sinh code khi các file tài liệu bắt buộc cho gate hiện tại chưa tồn tại.

## Emit
Khi viết doc, phải bám đúng taxonomy và gắn anchor `status=planned` theo chuẩn lõi.
```

Adapter thực tế có thể thay đổi câu chữ nhẹ theo harness, nhưng không được đổi nghĩa.

## GATE — enforcement mềm

### Cách map gate-policy sang rules text
Mỗi gate lõi phải được chuyển thành một chỉ dẫn rõ ràng, ví dụ:

- Gate `scope-locked`:
  - “Không bắt đầu tạo hoặc sửa mã nguồn ứng dụng khi chưa có `00-vision.md`, `01-personas.md`, và `02-scope.md`.”
  - “Nếu người dùng xin code sớm, hãy chuyển về hoàn tất tài liệu trước.”

### Câu lệnh mềm bắt buộc có
- “Trước khi viết code, tự kiểm tra các doc bắt buộc của gate hiện tại đã tồn tại chưa.”
- “Nếu chưa đủ doc, tiếp tục phỏng vấn hoặc hoàn thiện docs thay vì tạo source code.”
- “Không được tự bỏ qua gate chỉ vì đoán rằng scope đã rõ.”

### Cách nói đúng về giới hạn
Phải ghi rõ một câu theo tinh thần này:

> Trên harness chỉ đọc `AGENTS.md`, gate là chỉ dẫn mạnh chứ không phải chặn cứng bằng cơ chế. Nếu cần enforcement deterministic, dùng Claude Code adapter.

Không được viết mập mờ kiểu “bị cấm tuyệt đối” khi harness thực tế không có hook.

> **Lưu ý mô hình hai lớp ở bậc B.** Ở Claude Code, "mỗi lượt người thật chỉ tiến 1 bước" được hook `UserPromptSubmit` ép cứng (xem [../Core/Schemas/state-schema.md](../Core/Schemas/state-schema.md) §3). Trên harness mềm KHÔNG có bộ giới hạn nhịp đó — nhịp một-bước-mỗi-lượt chỉ là *chỉ dẫn best-effort* cho agent. Vẫn yêu cầu agent: hỏi một câu, chờ người dùng xác nhận dịch ngược, rồi mới rót vào doc và đi câu kế; nhưng nói thật rằng đây là kỷ luật khuyến nghị, không phải đảm bảo deterministic.

## CRITIC & CALIBRATE (mềm, từ v2)
Cùng nội dung như bậc A nhưng **chỉ là chỉ dẫn**, không đảm bảo cứng:
- **Calibrate:** đầu phiên hỏi người dùng muốn giải thích kỹ (người mới) hay đi nhanh (có kinh nghiệm), chỉnh độ chi tiết + độ gắt phản biện.
- **Critic:** sau khi chốt scope (S3) và sau câu kiến trúc của hình-hài, agent phải đóng vai phản biện — chỉ ra scope đang phình / phức tạp ẩn, rồi yêu cầu người dùng xác nhận ('Tôi đồng ý') hoặc điều chỉnh trước khi đi tiếp. Trên harness mềm đây là kỷ luật khuyến nghị, KHÔNG phải chặn cứng.

## ORCHESTRATE mềm — target 4.0.0, chưa code

Sau B9b, generator sẽ yêu cầu harness rules-only đọc active task, preflight, verify, evidence và repair theo core plan. Nó phải gọi đây là soft enforcement; nếu không có tool output, evidence chỉ là self-reported. Rules không được hứa chặn path hay tự chuyển milestone deterministic. Contract: V3-ExecutionExpansionPlan B9b.

## EMIT — output thống nhất
- Viết tài liệu đúng cây taxonomy.
- Mỗi file đều có `## Tại sao cần file này`.
- Cuối mỗi mục có anchor `status=planned`.
- Không tự tạo thêm file ngoài taxonomy trừ khi lõi đã cập nhật.

## Cách sinh mẫu `AGENTS.md` từ lõi
- Output mẫu sinh tự động được lưu trữ tại [Design/Adapters/generated/AGENTS.sample.md](generated/AGENTS.sample.md) (Cấm chỉnh sửa thủ công tệp này).
- Phần bất biến lấy từ:
  - [../Core/Contract.md](../Core/Contract.md)
  - [../Content/interview-script/script.yaml](../Content/interview-script/script.yaml)
  - [../Content/taxonomy.md](../Content/taxonomy.md)
  - [../Core/Schemas/gate-policy.md](../Core/Schemas/gate-policy.md)
- Phần thay đổi theo dự án chỉ nên là:
  - đường dẫn repo thực tế nếu cần;
  - tên command hoặc workflow cụ thể của harness;
  - nhắc nhở đặc thù nếu harness có file rules khác như `.cursorrules`.

## Mapping sang các harness cùng họ
- Codex / Codex desktop: ưu tiên `AGENTS.md`
- Cursor: có thể mirror cùng nội dung sang `.cursorrules` hoặc `.mdc`
- Cline / Continue / các harness đọc repo rules: dùng cùng lõi văn bản, chỉ đổi lớp vỏ

Một adapter mềm nên được sinh từ cùng một nguồn template, không copy-paste rồi drift.

## Tiêu chí nghiệm thu cho adapter mềm
- Agent khi vào repo sẽ đọc được lý do phải phỏng vấn trước.
- Agent được hướng dẫn hỏi từng câu một thay vì bắn cả checklist.
- Agent được nhắc gate trước khi code.
- Output doc rơi đúng taxonomy.
- File rules có nói thật giới hạn enforcement.

## Trạng thái
- Bộ sinh generator `generateAgentsMd` đã hoàn thành và được bảo vệ drift tự động bằng bài test artifact drift guard.
- Việc chạy kiểm thử thực tế (smoke run) trên các harness ngoài (Codex/Cursor) tạm hoãn (⏳ defer) sang Month 3.
