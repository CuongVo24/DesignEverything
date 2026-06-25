# Adapter — Claude Code (bậc A, reference implementation)

> Đây là adapter bậc A duy nhất trong giai đoạn đầu: có hook thật, ép cứng thật, và là bản tham chiếu để mọi adapter mềm bám theo.

## Tại sao cần file này
Claude Code là nơi duy nhất hiện tại chứng minh được lời hứa của sản phẩm ở mức cơ chế: chưa xong doc thì chưa được lao vào code. File này phải đủ chi tiết để một dev TypeScript đọc xong là triển khai được hook mà không phải tự đoán thêm hợp đồng.

## Mục tiêu và ranh giới
- Mục tiêu:
  - inject đúng kịch bản phỏng vấn từ lõi;
  - tiến state đúng một bước cho mỗi lượt người thật;
  - chặn hành động build/code theo gate-policy một cách deterministic;
  - emit đúng cây doc theo taxonomy và anchor-format.
- Không làm:
  - không tự bịa câu hỏi ngoài `script.yaml`;
  - không suy luận taxonomy trong adapter;
  - không chấm chất lượng câu trả lời bằng heuristic phức tạp;
  - không nhét logic Must/Should/Could vào hook. Phần đó đã nằm ở nội dung lõi.

## Stack triển khai bị khoá
- Runtime: Node.js LTS
- Ngôn ngữ: TypeScript `strict: true`
- Parse: `yaml` cho `script.yaml`, JSON chuẩn cho `progress.json`
- Validate: `zod`

Adapter này phải bám đúng [../Conventions/TechStack.md](../Conventions/TechStack.md).

## Input lõi mà adapter phải đọc
- `Design/Content/interview-script/script.yaml`
- `Design/Core/Schemas/state-schema.md` để bám shape `progress.json`
- `Design/Core/Schemas/gate-policy.md`
- `Design/Content/taxonomy.md`
- `Design/Core/AnchorFormat.md`

Ở mức code, không parse trực tiếp `.md` schema để lấy dữ liệu runtime. Runtime adapter đọc:
- `script.yaml` làm nguồn câu hỏi;
- một bản dữ liệu gate-policy máy-đọc-được nếu đã được chốt cùng lõi;
- `progress.json` trong workspace phiên hiện tại.

File `.md` là nơi chốt hợp đồng cho dev, không phải nguồn dữ liệu runtime để hook phân tích chuỗi ad hoc.

## Cấu trúc module khuyến nghị
- `core/loadScript.ts`
  - đọc `script.yaml`
  - validate bằng `zod`
- `core/loadGatePolicy.ts`
  - đọc gate-policy máy-đọc-được
  - validate danh sách gate
- `core/loadProgress.ts`
  - đọc/ghi `progress.json`
  - tự khởi tạo nếu file chưa tồn tại
- `core/advanceState.ts`
  - tính bước kế tiếp theo state-schema
- `core/evaluateGate.ts`
  - quyết định gate nào đang đóng / mở
- `adapters/claude/sessionStart.ts`
- `adapters/claude/userPromptSubmit.ts`
- `adapters/claude/preToolUse.ts`

Tách như vậy để logic chung nằm ở lõi dùng chung, còn Claude Code chỉ map event hook sang hàm lõi.

## INJECT — đưa kịch bản vào host

### Hình thức
- Đóng gói thành một `skill` hoặc slash command như `/design`.
- Nội dung inject phải gồm:
  - mục tiêu phiên hiện tại;
  - 4 quy tắc vàng;
  - câu hỏi hiện tại từ `progress.current_step`;
  - chỉ dẫn dịch ngược bằng `translate_back`;
  - nhắc rằng mỗi lượt chỉ hỏi đúng 1 câu.

### Dữ liệu inject tối thiểu
- `current_step.id`
- `current_step.ask`
- `current_step.default`
- `current_step.translate_back`
- `current_step.target_doc`
- `phase`
- `branch`

### Điều không được làm
- Không nhúng cứng toàn bộ transcript vào prompt system.
- Không nhét riêng logic web/mobile ngoài những gì `script.yaml` đã có.
- Không skip câu hỏi chỉ vì model “đoán được”.

## GATE — chặn sinh code (cứng)

### 1. `SessionStart`

#### Mục đích
Khởi tạo state tối thiểu để mọi hook sau có điểm tựa thống nhất.

#### Input
- workspace root
- metadata phiên từ Claude Code nếu có

#### Output
- một file `progress.json` hợp lệ theo schema `0.1.0` nếu chưa có
- hoặc giữ nguyên file cũ nếu file đã hợp lệ

#### Thuật toán
1. Xác định đường dẫn `progress.json` trong vùng làm việc của dự án.
2. Nếu file chưa tồn tại:
   - tạo state mặc định:
     - `version = "0.1.0"`
     - `phase = "interview"`
     - `branch = null`
     - `current_step = "S0"`
     - `answered = []`
     - `emitted_docs = []`
     - `gates_passed = []`
     - `last_user_turn_id = null`
     - `updated_at = now`
3. Nếu file đã tồn tại:
   - parse JSON;
   - validate với `zod`;
   - nếu hợp lệ thì giữ nguyên;
   - nếu không hợp lệ thì fail rõ ràng, yêu cầu sửa artifact thay vì tự “chữa cháy” âm thầm.

#### Ca biên bắt buộc xử lý
- File tồn tại nhưng sai schema: chặn adapter tiếp tục và báo lỗi rõ field sai.
- File tồn tại nhưng `current_step = null` và `phase != ready-to-build`: coi là state lỗi, không tự suy diễn.
- File cũ có version khác `0.1.0`: báo lệch version.

### 2. `UserPromptSubmit`

#### Mục đích
Chỉ khi có lượt người thật mới được tiến state, và mỗi lượt chỉ tối đa một bước.

#### Input
- `progress.json` hiện tại
- `script.yaml` đã validate
- `user_turn_id`
- nội dung message người dùng

#### Output
- `progress.json` cập nhật
- metadata phụ cho prompt tiếp theo nếu cần

#### Thuật toán
1. Nạp state hiện tại.
2. Nếu `user_turn_id == last_user_turn_id`:
   - không advance;
   - trả về state cũ.
3. Lấy `current_step`.
4. Nếu `current_step = null`:
   - không advance nữa;
   - chỉ cho phép đi tiếp theo pha hiện tại.
5. Ghi nhận rằng câu hiện tại đã được người thật trả lời và xác nhận.
6. Thêm `current_step` vào `answered`.
7. Gán `last_user_turn_id = user_turn_id`.
8. Tính bước kế tiếp:
   - nếu vừa xong `S6`, xác định `branch = web | mobile` từ câu trả lời đã dịch ngược/chốt ở nội dung phiên;
   - nếu nhánh là `web`, bước kế tiếp là `W1`;
   - nếu nhánh là `mobile`, bước kế tiếp là `M1`;
   - nếu vừa xong câu cuối của nhánh, chuyển `phase` sang `docs-emitted` hoặc `ready-to-build` theo artifact thực tế.
9. Cập nhật `updated_at`.

#### Điều kiện để được advance
Adapter không tự chấm “trả lời hay/chưa hay”. Nó chỉ cần bằng chứng rằng:
- đã có một lượt người thật mới;
- AI đã hỏi câu `current_step`;
- đã có xác nhận dịch ngược cho câu đó trong ngữ cảnh phiên.

Nếu chưa có xác nhận, hook không advance.

#### Ca biên bắt buộc xử lý
- Người dùng nhắn lan man không trả lời câu hiện tại: không advance.
- Người dùng đổi ý về nhánh sau khi đã qua `S6`: không tự rollback state; yêu cầu phiên sửa doc rõ ràng rồi mới chỉnh state có chủ đích.
- Một lượt người dùng cố trả lời nhiều câu cùng lúc: vẫn chỉ advance tối đa một bước.

### 3. `PreToolUse`

#### Mục đích
Đây là chỗ ép cứng “chưa đủ doc thì chưa code”.

#### Input
- event tool use từ Claude Code
- `progress.json`
- gate-policy đã validate
- danh sách artifact đang tồn tại trong cây doc

#### Output
- allow hoặc deny
- thông báo theo `gate.message`

#### Luật chặn
`PreToolUse` phải đọc từng gate trong policy:
- nếu `requires_docs` chưa đủ;
- và tool nằm trong `blocks`;
- thì chặn với đúng `message` của gate.

#### Phân biệt hành động nào phải chặn
Không phải mọi `Write`/`Edit`/`Bash` đều là “đi code”. Phải phân loại:

- Cho phép:
  - tạo/sửa file trong `Design/`
  - tạo/sửa cây `docs/` đầu ra
  - bash chỉ để đọc, kiểm tra, liệt kê file
- Chặn:
  - tạo/sửa file mã nguồn ngoài vùng tài liệu
  - bash nhằm build, scaffold code, cài package, chạy generator code

#### Heuristic tối thiểu cho `Bash`
Một lệnh bash bị coi là “đi code/build” nếu nó:
- chạy trình build/dev/test của app;
- scaffold project;
- cài dependency;
- ghi file mã nguồn ngoài vùng doc.

Một lệnh bash được coi là an toàn nếu nó chỉ:
- đọc file;
- liệt kê cây thư mục;
- kiểm tra tồn tại artifact;
- render/emit docs.

Nếu không phân loại chắc chắn được, chọn hướng chặn và trả message rõ lý do.

#### Cập nhật `gates_passed`
Sau mỗi lần kiểm tra gate:
- nếu toàn bộ `requires_docs` đã tồn tại, thêm `gate.id` vào `gates_passed`;
- danh sách này append-only trong phiên.

#### Tránh chặn nhầm bằng `Stop`
- Không dùng `Stop` như gate chính.
- Nếu Claude Code có hook `Stop`, chỉ dùng để nhắc nhẹ khi AI định kết thúc phiên build mà state chưa đủ.
- Không được chặn mọi lần AI tạm dừng để hỏi tiếp.

## EMIT — output đúng cây
- Tất cả output doc phải rơi đúng taxonomy.
- Cuối mỗi mục phải có anchor theo [../Core/AnchorFormat.md](../Core/AnchorFormat.md).
- Adapter không tự sáng tác tên file. Tên file lấy từ taxonomy lõi.

## Mẫu hành vi end-to-end tối thiểu
1. `SessionStart` tạo `progress.json` ở `S0`.
2. Skill inject câu `S0`.
3. Người dùng trả lời.
4. `UserPromptSubmit` advance sang `S1`.
5. Lặp đến `S6`.
6. Chốt nhánh `web` hoặc `mobile`.
7. Lặp câu nhánh đến hết.
8. Emit các doc bắt buộc.
9. `PreToolUse` mở gate khi `requires_docs` đã đủ.
10. Chỉ lúc đó mới cho thao tác code/build tiếp diễn.

## Test case bắt buộc trước khi coi là xong
- `SessionStart` tạo đúng state mới.
- `SessionStart` fail rõ khi `progress.json` hỏng.
- `UserPromptSubmit` không advance hai lần với cùng `last_user_turn_id`.
- `UserPromptSubmit` rẽ đúng nhánh sau `S6`.
- `PreToolUse` chặn `Write/Edit/Bash` khi thiếu `02-scope.md`.
- `PreToolUse` không chặn việc tiếp tục viết tài liệu trong `Design/` hoặc `docs/`.
- `PreToolUse` không dùng `Stop` để chặn nhầm lượt hỏi tiếp.

## Trạng thái
- Hợp đồng adapter Claude Code đã được đặc tả đủ-để-code.
- Chưa triển khai code trong batch này.
