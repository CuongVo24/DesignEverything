# DesignEverything

> DesignEverything là bộ **phương pháp tạo tài liệu nền móng cho dự án phần mềm**: một Lõi-text portable gồm kịch bản phỏng vấn, template tài liệu, taxonomy, state, gate policy và mỏ neo truy vết, được đóng gói qua các adapter gầy cho từng coding harness như Claude Code, Codex, Cursor hoặc các hệ dùng `AGENTS.md`.

DesignEverything không cố xây một agent mới. Dự án chạy trên lưng agent đã có sẵn, nhưng đưa cho chúng một phương pháp đủ chặt để biến câu trả lời đời thường của người mới thành thư mục tài liệu nền móng có cấu trúc, có lý do, có thể dùng làm đầu vào cho việc code thật.

Nguồn ý tưởng quan trọng nhất nằm ở [FirstIdea.md](FirstIdea.md). Cây [Design/](Design/) là phiên bản đã được chuẩn hóa từ brainstorm đó.

## Vấn Đề

Khi bắt đầu vibe code, rất nhiều người nhảy thẳng vào code. Họ có thể làm UI, gọi API, tạo database rất nhanh, nhưng lại bỏ qua phần khó và âm thầm quyết định chất lượng dự án: **thiết kế thư mục tài liệu nền móng trước khi build**.

Nỗi đau gốc của dự án này rất cụ thể:

- Soạn tài liệu nền móng thủ công có thể mất tới một tuần, kể cả với người đã có kinh nghiệm làm tech lead.
- Người mới thường không biết phải viết những file gì, viết đến mức nào là đủ, và vì sao từng file lại cần thiết.
- Nhiều người giỏi code vẫn không biết thiết kế một bộ tài liệu đủ chi tiết để team, công ty hoặc AI agent dùng lâu dài.
- Các công cụ spec-driven hiện có thường giả định người dùng đã biết mình muốn gì. Đây chính là điểm yếu lớn nhất với người bắt đầu từ số 0.

DesignEverything sinh ra để xử lý khoảng trống đó: **trước khi code, giúp người dùng nói rõ dự án là gì, cho ai, giải quyết nỗi đau nào, phạm vi MVP ra sao, dữ liệu gồm gì, flow chính thế nào, và nên chọn hướng kỹ thuật nào**.

## Sản Phẩm Là Gì

DesignEverything là sự kết hợp của hai phần:

| Phần | Vai trò | Nguyên tắc |
|---|---|---|
| **Lõi (Core)** | Phương pháp portable: kịch bản phỏng vấn, template doc, taxonomy, state schema, gate policy, anchor format | Viết một lần, dùng ở mọi harness |
| **Adapter** | Lớp phủ mỏng cho từng harness: Claude Code, `AGENTS.md`, Cursor, Codex, Cline... | Chỉ làm INJECT, GATE, EMIT |

Một câu ngắn gọn:

> **DesignEverything = Lõi-text portable + adapter native gầy theo từng harness, ép tài liệu trước code ở mức tốt nhất nền tảng cho phép.**

## Vì Sao Cần Thiết

Trong vibe coding, tốc độ sinh code đang tăng rất nhanh. Nhưng khi tốc độ code tăng, một vấn đề cũ trở nên nguy hiểm hơn: **dự án có thể chạy được trước khi người làm thật sự hiểu mình đang xây gì**.

Nếu thiếu tài liệu nền móng, dự án dễ gặp các lỗi sau:

- MVP phình ra vì không có `scope.md` rõ ràng.
- Agent tự đoán nghiệp vụ vì không có `vision.md`, `personas.md`, `flows.md`.
- Code và tài liệu lệch nhau vì không có mỏ neo truy vết.
- Người mới không học được cách tư duy sản phẩm, chỉ nhận về một đống file sinh tự động.
- Team sau này không biết quyết định ban đầu đến từ đâu.

DesignEverything không chỉ tạo file. Nó tạo một quy trình hỏi đúng câu, theo đúng thứ tự, rồi biến câu trả lời thô thành tài liệu có thể dùng được.

## Sức Mạnh Của DesignEverything

### 1. Phỏng vấn trước, không bắt người mới điền template

Người mới không biết nên điền gì vào một template trống. Vì vậy sản phẩm không bắt họ viết PRD ngay từ đầu. Agent sẽ hỏi từng câu đời thường:

- Dự án này là gì, kể như nói với bạn thân?
- Người dùng đang khổ vì chuyện gì?
- Ai sẽ dùng?
- Người dùng cần làm được những việc gì?
- Sản phẩm cần nhớ dữ liệu gì?
- Một lần dùng điển hình diễn ra như thế nào?
- Làm web hay mobile, có deadline và ngân sách gì?

Sau đó agent **dịch ngược** câu trả lời đời thường thành ngôn ngữ tài liệu chuẩn.

### 2. Mỗi câu hỏi đều neo vào một file cụ thể

Không có câu hỏi thừa. Mỗi câu trong kịch bản đều biết nó sẽ điền vào file nào:

```text
docs/
  00-vision.md
  01-personas.md
  02-scope.md
  03-data-model.md
  04-flows.md
  05-architecture.md
  06-constraints.md
  07-deployment.md hoặc 07-release.md (hoặc 07-distribution.md cho CLI)
  08-build-plan.md
  README.md
```

Điều này giúp người dùng thấy rõ: trả lời câu này để tạo phần nào của nền móng dự án.

### 3. Mỗi file giải thích "tại sao cần file này"

Điểm mạnh quan trọng không chỉ là sinh ra tài liệu, mà là giúp người dùng học nghề trong lúc tạo tài liệu. Mỗi file đầu ra phải có phần giải thích vì sao file đó tồn tại.

Ví dụ:

- `02-scope.md` giúp tránh nhảy vào tất cả tính năng cùng lúc.
- `03-data-model.md` giúp agent không tự bịa entity và quan hệ dữ liệu.
- `04-flows.md` giúp kiểm tra tính năng theo hành trình người dùng thật.
- `05-architecture.md` giúp quyết định kỹ thuật dựa trên nhu cầu, không dựa trên trend.

Đây là lợi thế khó copy hơn một tool sinh doc generic.

### 4. Phương pháp là sản phẩm thật

DesignEverything không thắng bằng giao diện, model riêng hay backend lớn. Lợi thế nằm ở phương pháp đã được mài qua dự án thật: tư duy `ContractForAI`, `TaskBrief`, chia tài liệu theo mục đích, ép rõ ràng giữa ý định, scope, dữ liệu, flow và kiến trúc.

Code chỉ là vỏ đóng gói. Phần có giá trị nhất là:

- Kịch bản phỏng vấn.
- Cách phân loại scope theo Must / Should / Could.
- Taxonomy đầu ra.
- Gate policy chặn nhảy vào code.
- Mỏ neo truy vết để chuẩn bị cho maintain tài liệu sau này.

### 5. Ép tài liệu trước code theo khả năng từng nền tảng

DesignEverything chấp nhận một sự thật kỹ thuật: muốn chạy mọi agent thì không thể ép cứng giống nhau ở mọi nơi.

Vì vậy sản phẩm dùng chiến lược **graceful degradation**:

- Với harness có hook như Claude Code: có thể ép cứng bằng `PreToolUse`, chặn `Write`, `Edit`, `Bash` nếu tài liệu chưa đủ.
- Với harness chỉ đọc rules như Codex, Cursor, Cline hoặc `AGENTS.md`: ép mềm bằng instruction, vẫn dùng cùng nội dung lõi.

Lời hứa của DesignEverything không phải "mọi nơi ép mạnh như nhau". Lời hứa là: **nội dung phương pháp giống nhau ở mọi nơi, còn mức enforcement sẽ tốt nhất theo khả năng của harness**.

### 6. Lõi béo, adapter gầy

Rủi ro lớn nhất của dự án là chết vì bảo trì quá nhiều nền tảng. Vì vậy kiến trúc bị khóa bằng nguyên tắc:

> **Lõi phải béo, adapter phải gầy.**

Adapter chỉ được làm ba việc:

| Việc | Ý nghĩa |
|---|---|
| **INJECT** | Đưa kịch bản phỏng vấn vào kênh chỉ thị của host |
| **GATE** | Chặn hoặc cảnh báo khi agent muốn code trước khi doc đủ |
| **EMIT** | Đảm bảo output rơi đúng cây tài liệu chuẩn |

Adapter không được tự chế câu hỏi, không đổi taxonomy, không bỏ qua gate policy.

### 7. Chuẩn bị sẵn đường maintain tài liệu

Tầm nhìn xa của DesignEverything không dừng ở scaffolding. Một sản phẩm lớn hơn là **maintain tài liệu khi code thay đổi**.

Muốn làm được chuyện đó, tài liệu không thể chỉ là free-text. Vì vậy DesignEverything gieo **mỏ neo truy vết** từ sớm:

```md
<!-- anchor: id=02-scope/feature-login  src=src/auth/login.ts::loginUser  rev=<git-blame-sha>  status=planned|live -->
```

Khi code thay đổi, hệ thống có thể gắn cờ tài liệu liên quan có khả năng đã cũ. Triết lý an toàn là:

> **Thà gắn cờ nghi ngờ, không âm thầm bảo chứng.**

## Cách Hoạt Động

Luồng cốt lõi:

1. Người dùng bắt đầu một dự án greenfield.
2. Adapter inject kịch bản phỏng vấn vào harness hiện tại.
3. Agent hỏi từng câu một, luôn có mặc định thông minh.
4. Người dùng trả lời bằng ngôn ngữ đời thường.
5. Agent dịch ngược thành nội dung chuẩn và xác nhận.
6. Agent sinh cây `docs/` theo taxonomy.
7. Gate policy ngăn hoặc cảnh báo nếu agent định code khi tài liệu chưa đủ.
8. Các tài liệu được gắn anchor để chuẩn bị cho drift flagging về sau.

## Cài đặt & Chạy nhanh (Quickstart)

Để cài đặt và chạy thử hệ thống DesignEverything trong vòng 5 phút:

1. **Cài đặt**: Chạy lệnh `npm ci` trong thư mục gốc.
2. **Biên dịch**: Chạy lệnh `npm run build` để dịch mã nguồn TypeScript.
3. **Cài thật vào một dự án mới (Claude Code path)**: Cài adapter (hooks + skill `/design` + lõi nội dung) vào dự án đích:
   ```bash
   node adapter/claude-code/install.mjs <đường-dẫn-dự-án-mới>
   ```
   Sau đó mở một phiên Claude Code **mới** trong dự án đích và gõ `/design`. Hook `PreToolUse` sẽ chặn cứng mọi thao tác sinh code cho tới khi phỏng vấn xong và `docs/` được emit.
4. **Chạy thử Demo giả lập (không cần Claude Code)**: Giả lập phỏng vấn và sinh tài liệu cho dự án HabitBuilder Mobile App bằng cách chạy:
   ```bash
   npx vitest run test/regression/run-dogfood.test.ts
   ```
5. **Hướng dẫn chi tiết**: Vui lòng tham khảo [docs/quickstart.md](docs/quickstart.md) để xem hướng dẫn onboarding chi tiết, danh sách checklist thiết lập môi trường và cách xử lý sự cố.
6. **Tuyến Rules-Only (AGENTS.md)**: Nếu bạn dùng các công cụ chỉ hỗ trợ rules (như Cursor/Cline), vui lòng sao chép nội dung cấu hình quy tắc tại [.agents/AGENTS.md](.agents/AGENTS.md) để hướng dẫn AI agent hỏi phỏng vấn và sinh tài liệu.

## Đối Tượng

DesignEverything ưu tiên:

- Người mới bắt đầu dự án từ số 0.
- Người vibe code nhưng chưa biết dựng tài liệu nền móng.
- Sinh viên, indie hacker, builder cá nhân.
- Team nhỏ muốn có quy trình spec-first nhẹ nhưng thực dụng.
- AI coding workflow cần context rõ ràng trước khi sinh code.

Không ưu tiên trong MVP:

- Dự án legacy lớn cần migrate tài liệu.
- Hệ thống enterprise cần governance phức tạp.
- Tự nuôi model, backend, UI, dashboard hoặc workflow server.

## Khác Gì So Với Công Cụ Khác

Các hướng như GitHub Spec Kit, Kiro, BMAD-METHOD, Taskmaster AI, cookiecutter hoặc Yeoman đều hữu ích. Nhưng nhiều công cụ vẫn bắt đầu từ giả định: người dùng đã biết mình muốn gì, chỉ cần công cụ biến nó thành spec hoặc task.

DesignEverything chọn khe hở khác:

> Người dùng chưa biết viết doc, chưa biết ưu tiên scope, chưa biết kiến trúc nào phù hợp. Vì vậy sản phẩm phải phỏng vấn, gợi ý mặc định, dịch ngược, giải thích lý do và ép đi chậm trước khi code.

## Trạng Thái Hiện Tại

Repo hiện đang ở giai đoạn thiết kế nền móng. Các phần chính đã có:

- Brainstorm gốc: [FirstIdea.md](FirstIdea.md)
- PRD sản phẩm: [Design/ProductPRD.md](Design/ProductPRD.md)
- Mục lục thiết kế: [Design/Guideline.md](Design/Guideline.md)
- Từ vựng chuẩn: [Design/Glossary.md](Design/Glossary.md)
- Hợp đồng Lõi và Adapter: [Design/Core/Contract.md](Design/Core/Contract.md)
- Mỏ neo truy vết: [Design/Core/AnchorFormat.md](Design/Core/AnchorFormat.md)
- Kịch bản phỏng vấn: [Design/Content/interview-script/README.md](Design/Content/interview-script/README.md)
- Taxonomy đầu ra: [Design/Content/taxonomy.md](Design/Content/taxonomy.md)
- Ma trận adapter: [Design/Adapters/ConformanceMatrix.md](Design/Adapters/ConformanceMatrix.md)
- Roadmap: [Design/RoadMap/MasterRoadMap.md](Design/RoadMap/MasterRoadMap.md)

## Cấu Trúc Repo

```text
.
├── FirstIdea.md
├── README.md
└── Design/
    ├── ProductPRD.md
    ├── Guideline.md
    ├── Glossary.md
    ├── DecisionLog.md
    ├── VibeCode.md
    ├── Core/
    │   ├── Contract.md
    │   ├── AnchorFormat.md
    │   ├── Versioning.md
    │   └── Schemas/
    ├── Content/
    │   ├── interview-script/
    │   ├── doc-templates/
    │   ├── taxonomy.md
    │   └── QualityRubric.md
    ├── Adapters/
    │   ├── claude-code.md
    │   ├── agents-md.md
    │   └── ConformanceMatrix.md
    ├── Conventions/
    └── RoadMap/
```

## Đọc Từ Đâu

Nếu muốn hiểu dự án theo đúng thứ tự:

1. [FirstIdea.md](FirstIdea.md): ý tưởng gốc, nỗi đau thật, quyết định đã chốt.
2. [Design/Guideline.md](Design/Guideline.md): bản đồ đọc toàn bộ thư mục `Design/`.
3. [Design/ProductPRD.md](Design/ProductPRD.md): sản phẩm là gì, cho ai, thắng bằng gì.
4. [Design/Core/Contract.md](Design/Core/Contract.md): ranh giới giữa Lõi và Adapter.
5. [Design/Content/interview-script/README.md](Design/Content/interview-script/README.md): phần sản phẩm thật.
6. [Design/RoadMap/MasterRoadMap.md](Design/RoadMap/MasterRoadMap.md): phạm vi và thứ tự triển khai.

## Lộ Trình

| Mốc | Phạm vi | Ước lượng |
|---|---|---|
| **Bản chạy được** | Claude Code: skill, hook gate, kịch bản lõi cho web, sinh docs end-to-end | Khoảng 1 tuần bán thời gian |
| **v1 dùng được** | Thêm mobile, template chau chuốt, phần "tại sao", adapter `AGENTS.md` | Khoảng 1 tháng |
| **Đáng chia sẻ** | Test trên 3-4 dự án thật, lặp nội dung, README và phân phối | Tổng 2-3 tháng |

Kỷ luật phạm vi: làm Claude Code + web trước, đo xem thời gian soạn doc từ một tuần giảm còn bao nhiêu, rồi mới mở rộng.

## Nguyên Tắc Sống Còn

- **Phỏng vấn, không sinh template trống.**
- **Hỏi từng câu một, có mặc định thông minh.**
- **Mỗi câu hỏi phải neo vào một ô tài liệu.**
- **Mỗi file phải giải thích vì sao nó cần thiết.**
- **Lõi béo, adapter gầy.**
- **Adapter theo harness, không theo model.**
- **Portable và enforce phải xuống bậc có kiểm soát.**
- **Thà gắn cờ nghi ngờ, không âm thầm bảo chứng.**

## Tầm Nhìn

DesignEverything bắt đầu như một công cụ scaffold tài liệu cho dự án mới. Nhưng nếu gieo mỏ neo truy vết đúng từ đầu, nó có thể tiến thành một lớp maintain tài liệu: phát hiện doc nào có thể đã lệch sau khi code đổi, gắn cờ trong PR hoặc CI, và sau này đề xuất bản sửa có người duyệt.

Nói ngắn gọn: mục tiêu không phải tạo thêm một generator. Mục tiêu là tạo **một phương pháp thiết kế dự án trước khi code**, đủ đơn giản cho người mới, đủ chặt cho AI agent, và đủ truy vết để sống cùng dự án lâu dài.

## Trạng thái truthfulness

Hiện repo sinh được docs nền móng và 08-build-plan. Nó **chưa** là lời hứa rằng một newbie có thể tự đi tới sản phẩm shipped: sau emit, runtime hiện vẫn thiếu semantic validation, active-task gate và evidence loop. Lane đã khoá để xử lý điều đó là [V3 Execution Expansion](Design/RoadMap/V3-ExecutionExpansionPlan.md), target 4.0.0; chỉ sau B10 evaluation mới được nâng claim.
