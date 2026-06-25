# DesignEverything — Ghi chú ý tưởng đầu tiên

> Tổng hợp buổi brainstorm đầu tiên. Mục đích: lưu lại để nghiên cứu tiếp khi rảnh.
> Ngày: 2026-06-25.

---

## 1. Vấn đề gốc (nỗi đau thật)

Khi bắt đầu vibe code, mọi người **nhảy thẳng vào code** mà quên thiết kế **thư mục tài liệu nền móng** cho dự án.
- Bản thân (tech lead univillage) mất **1 tuần chỉ để soạn tài liệu** — rất lâu, tốn công, và có thể vẫn chưa tối ưu.
- ReportSupporter đang dần cải thiện khả năng viết tài liệu nhưng chưa dám nhận là hoàn thiện.
- Quan sát ở HCMUS: nhiều người giỏi nhưng **không biết thiết kế thư mục tài liệu chi tiết** — thứ mà công ty chắc chắn cần.

**DesignEverything ra đời để giải quyết việc này.**

---

## 2. Thị trường — đã có, nhưng chưa ai "thắng" rõ ràng

Phong trào liên quan: **spec-driven development** (viết đặc tả/tài liệu trước khi code). Đối thủ/tham khảo:
- **GitHub Spec Kit** — open-source, lệnh `/specify` → `/plan` → `/tasks`. Gần ý tưởng nhất.
- **Kiro (AWS)** — IDE sinh `requirements.md` / `design.md` / `tasks.md` từ một câu mô tả.
- **BMAD-METHOD** — framework agentic sinh PRD + tài liệu kiến trúc theo vai trò.
- **Taskmaster AI** — đọc PRD, phân rã thành task.
- Nhẹ hơn: cookiecutter / Yeoman (scaffold thư mục), `CLAUDE.md` / `.cursorrules` (context engineering).

**Kết luận:** không phải đại dương xanh, nhưng chưa bão hòa. Chưa có "cái mặc định" ai cũng dùng → cửa còn mở.

**Điểm yếu chung của đối thủ:** vẫn giả định người dùng **đã biết mình muốn gì**. Đây là khe hở để khai thác (xem mục 4).

---

## 3. Lợi thế thật KHÔNG nằm ở công cụ — nằm ở phương pháp

- Repo ReportSupporter đã có sẵn cấu trúc tài liệu rõ ràng: `Design/ContractForAI/...`, `TaskBrief/...`, chia theo month/week, có contract cho AI, có task brief.
- Đây là thứ mất 2 dự án để mài ra → **chính nó là sản phẩm.**
- Tool của đối thủ sinh doc *generic*, nhạt. Thứ khó copy là **phương pháp đã thực chiến, có quan điểm rõ ràng (opinionated).** Công cụ chỉ là vỏ đóng gói phương pháp.

---

## 4. Hai quyết định ĐÃ CHỐT

1. **Đối tượng & bối cảnh:** dự án **mới hoàn toàn từ số 0** (greenfield) + ưu tiên **người hoàn toàn không biết viết doc** (để thu hút đông người dùng).
   - Hệ quả: cốt lõi sản phẩm **bắt buộc là PHỎNG VẤN, không phải SINH.** Người mới không biết điền gì vào template trống → agent phải hỏi câu đời thường rồi tự dịch sang ngôn ngữ chuẩn.
   - Insight bán hàng: mỗi file sinh ra kèm giải thích **"tại sao cần file này"** → người dùng vừa có sản phẩm vừa học nghề. Khó copy.
   - Rủi ro: người mới **không phân biệt được doc tốt/tệ** → toàn bộ giá trị dồn vào **chất lượng phương pháp gốc** (không có "người dùng tự sửa" để cứu).

2. **Hình hài kỹ thuật:** **plugin native từng agent, dùng chung một lõi.**
   - Đổi lại: trải nghiệm tốt nhất + ép mạnh nhất mỗi nơi.
   - Cái giá: rủi ro **chết vì bảo trì N nền tảng** → kỷ luật sống còn: **lõi phải béo, adapter phải gầy.**

---

## 5. KHÔNG build agent — chỉ build lớp phương pháp

DesignEverything chạy **trên lưng** agent có sẵn (Claude Code, Codex, Cursor, Antigravity, DeepSeek/GLM...). "Kịch bản phỏng vấn" **chính là sản phẩm** — nó là system prompt + luồng câu hỏi có cấu trúc để agent chủ nhà thực thi. Không nuôi model, chỉ viết kịch bản đạo diễn.

---

## 6. Định lý cốt lõi: Portable ⟷ Enforce kéo nhau

- Muốn **chạy mọi agent** → mẫu số chung chỉ là "agent đọc được file text" → **chỉ ép được mức mềm.**
- Muốn **ép cứng** (chặn nhảy vào code) → chỉ Claude Code có hook → **không portable.**
- Lối thoát: hứa **nội dung như nhau ở mọi nơi**, và **ép tốt nhất mà nền tảng cho phép** (graceful degradation), KHÔNG hứa ép bằng nhau.

### Hai mức "ép"
- **Mềm (prompt / skill / rules):** chỉ *yêu cầu* AI hỏi. AI có thể bỏ câu, gộp câu, tự bịa câu trả lời rồi phóng vào code. Không bảo đảm.
- **Cứng (hook):** lệnh do **harness chạy, không phải LLM** → xác định (deterministic). Cơ chế Claude Code: `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `SessionStart`...

### Hook ép được gì / không ép được gì
- ✅ Ép **cổng (gating) dựa trên artifact:** `PreToolUse` chặn `Write`/`Edit`/`Bash` nếu `docs/02-scope.md` chưa tồn tại → "phỏng vấn xong đã". Giải quyết đúng nỗi đau gốc (cấm nhảy cóc vào code).
- ❌ KHÔNG đọc được "ý định" hay chất lượng từng câu hỏi. Chỉ thấy **file có chưa, state đủ chưa.** → Enforce qua **artifact + state machine**, không qua từng câu thoại.

### Mẹo buộc câu trả lời là của NGƯỜI THẬT
Dùng `UserPromptSubmit` (chỉ fire khi có tin nhắn người thật) → cho state machine **chỉ tiến 1 bước mỗi lượt người dùng thật** → AI không tự bịa cả 7 câu trong một lượt.

### Cạm bẫy phải tránh
Đừng để `Stop` hook chặn **mọi** lần AI dừng — vì AI hỏi xong rồi nhường lượt cũng là "stop" hợp lệ. Chỉ chặn khi AI định **chuyển sang build / kết thúc phiên** mà state chưa đủ.

---

## 7. Adapter theo HARNESS, không theo MODEL (đính chính quan trọng)

- DeepSeek, GLM **là model, không phải agent.** Chúng chạy *bên trong* một harness (Cursor, Cline, Continue, Codex CLI, app riêng). Hook/rules nằm ở **harness**.
- → **Không cần viết "adapter DeepSeek".** Dùng GLM qua Cursor thì adapter-Cursor đã phủ luôn. Trục cần phủ rút lại còn một nắm harness:
  `Claude Code · Cursor · Codex CLI · Cline · Antigravity · Windsurf · Continue`
- Nhiều cái hội tụ về **`AGENTS.md`** (chuẩn rules-file chung đang nổi) → một adapter `AGENTS.md` phủ mềm nhiều harness cùng lúc.

---

## 8. Hợp đồng Lõi ↔ Adapter (giữ adapter luôn gầy)

**LÕI (portable, viết một lần):**
- `interview-script` (S0–S6 + nhánh W/M) — định dạng trung tính (YAML/markdown).
- `doc-templates` + `taxonomy` (cây thư mục đầu ra) + phần "tại sao cần file này".
- `state-schema` (`progress.json`) + `gate-policy` (khai báo: chưa có file X thì cấm sinh code).

**ADAPTER chỉ làm đúng 3 việc:**

| Việc | Ý nghĩa | Claude Code | Harness chỉ-đọc-rules |
|---|---|---|---|
| **INJECT** | Đưa kịch bản vào kênh chỉ thị của host | skill / slash command | viết vào `AGENTS.md` / `.cursorrules` |
| **GATE** | Chặn sinh code khi doc chưa xong | hook `PreToolUse` (cứng) | câu lệnh trong rules (mềm) |
| **EMIT** | Output rơi đúng cây doc chuẩn | giống nhau mọi nơi | giống nhau mọi nơi |

→ INJECT/EMIT gần như giống nhau khắp nơi. **Chỉ GATE là khác** và xuống bậc theo năng lực harness. Đó là toàn bộ độ phức tạp phải nuôi.

### Bậc enforcement
- **Bậc A — ép cứng:** harness có hook (Claude Code chắc chắn). "Không xong doc, không cho code" là thật.
- **Bậc B — ép mềm:** harness chỉ đọc rules (Cursor, Codex, Antigravity, + model TQ chạy trong đó). Khuyến nghị mạnh, không bảo đảm tuyệt đối.

---

## 9. Kịch bản phỏng vấn (LÕI)

### 4 quy tắc vàng (cách agent PHẢI cư xử)
1. **Hỏi từng câu một** — không bắn 5 câu cùng lúc (người mới ngợp).
2. **Luôn có "mặc định thông minh"** — mỗi câu kèm lựa chọn phổ biến nhất; "không biết → chọn giúp" là đi tiếp được.
3. **Dịch ngược** — người dùng trả lời đời thường, agent tóm lại bằng ngôn ngữ chuẩn rồi xác nhận.
4. **Mỗi câu neo vào 1 ô tài liệu** — không hỏi câu nào mà không biết nó điền vào đâu.

### Cấu trúc: 1 Khung Lõi chung + Nhánh rẽ theo nền tảng
Web & mobile giống nhau ~70% (vấn đề, người dùng, tính năng, dữ liệu), chỉ ~30% khác → KHÔNG viết 2 kịch bản rời.

### KHUNG LÕI — S0 → S6 (dùng chung)

| # | Câu hỏi đời thường | Nếu "không biết" → mặc định | Điền vào doc |
|---|---|---|---|
| **S0** | Mô tả dự án trong **1 câu**, như kể cho bạn thân. | (bắt buộc — mỏ neo) | `vision.md` — elevator pitch |
| **S1** | Người ta đang **khổ vì chuyện gì**? Hiện xoay xở ra sao? | Suy từ S0, hỏi xác nhận | `problem.md` |
| **S2** | **Ai** sẽ dùng? Kể 1–2 người cụ thể và việc họ muốn làm xong. | "Người dùng phổ thông" + 1 admin | `personas.md` |
| **S3** | Liệt kê việc người dùng **làm được** (kể lộn xộn) → agent xếp **Phải có / Nên có / Để sau** | Agent đề xuất bộ MVP tối thiểu | `scope.md` (MoSCoW) |
| **S4** | Sản phẩm cần **nhớ những gì**? (người dùng, bài viết, đơn hàng...) | Suy entity từ S3 | `data-model.md` |
| **S5** | Kể **một lần dùng điển hình** từ mở app đến xong việc. | Dựng flow từ tính năng "Phải có" #1 | `flows.md` |
| **S6** | Làm **một mình/nhóm**? **deadline**? **ngân sách**? Và **web hay app**? | Solo / không deadline cứng / free-tier / → rẽ nhánh | `constraints.md` + chọn nhánh |

> **S3 là câu khó & quan trọng nhất.** Để người dùng kể bừa, agent là người phân loại Must/Should/Could. Người mới không tự ưu tiên được — đó là việc của agent.

### NHÁNH WEB — W1 → W5

| # | Câu hỏi | Mặc định | Điền vào doc |
|---|---|---|---|
| **W1** | Người lạ trên Google có cần **tìm thấy** nội dung không? Hay chủ yếu dùng sau đăng nhập? | Cần SEO → SSR/SSG (Next.js); chỉ sau login → SPA | `architecture.md` (rendering) |
| **W2** | Dùng chủ yếu trên **máy tính, điện thoại, hay cả hai**? | Cả hai → responsive, mobile-first | `architecture.md` |
| **W3** | Muốn người khác **vào bằng link** lúc nào? Cần tên miền riêng? | Vercel/Netlify free + subdomain | `deployment.md` |
| **W4** | Cần **tài khoản**? Đăng nhập kiểu gì — email hay Google/Facebook? | OAuth Google + email/password | `auth.md` |
| **W5** | Có chỗ cần **cập nhật tức thì** (chat, thông báo live)? Cần **trang admin** riêng? | Không realtime; có admin nếu S2 có vai admin | `architecture.md` |

### NHÁNH MOBILE — M1 → M5

| # | Câu hỏi | Mặc định | Điền vào doc |
|---|---|---|---|
| **M1** | Chạy trên **iPhone, Android, hay cả hai**? | Cả hai → cross-platform (React Native / Flutter) | `architecture.md` (nền tảng) |
| **M2** | **Mất mạng** thì app còn dùng được phần nào không? | Không → online-first; Có → offline-first + sync (đắt hơn, cảnh báo sớm) | `architecture.md` (offline/sync) |
| **M3** | Cần **camera, GPS, danh bạ, micro, ảnh** trong máy? | Liệt kê quyền cần xin → ảnh hưởng store review | `permissions.md` |
| **M4** | Cần **thông báo đẩy (push)** để kéo người quay lại? | Có → FCM (Firebase) | `architecture.md` |
| **M5** | **Kiếm tiền** kiểu gì? Phát hành **store thật hay bản thử**? | Free trước; bán → in-app purchase (store thu 15–30%); phát hành → TestFlight/Internal test trước | `monetization.md` + `release.md` |

> **2 bẫy mobile người mới luôn dính** (kịch bản phải chủ động bới ra sớm): (a) offline/sync M2 đội chi phí gấp đôi; (b) quy trình lên store M5 (review, ký app, phân phối) — không phải "code xong là có app".

### Cây thư mục đầu ra (bản tối giản cho người mới)
```
docs/
  00-vision.md          ← S0,S1
  01-personas.md        ← S2
  02-scope.md           ← S3 (Must/Should/Could)
  03-data-model.md      ← S4
  04-flows.md           ← S5
  05-architecture.md    ← S6 + nhánh
  06-constraints.md     ← S6
  07-[deployment|release].md  ← W3 / M5
  README.md             ← mục lục + "đọc theo thứ tự này"
```
Mỗi file kèm đoạn **"Tại sao cần file này"** (đúng insight HCMUS). Tổng ~15–16 câu — đủ dựng nền móng, chưa làm người mới bỏ cuộc.

---

## 10. Thứ tự ra mắt đề xuất
1. **Claude Code trước** — cái duy nhất chứng minh tầm nhìn đầy đủ (ép cứng); đang ngồi sẵn trong nó. Đây là **reference implementation** để chốt hợp đồng Lõi↔Adapter.
2. **Adapter `AGENTS.md`** — một phát phủ mềm Codex + Cursor + nhiều harness (kèm DeepSeek/GLM chạy trong chúng).
3. Sau đó mới tính adapter native riêng (Cursor `.mdc`, Antigravity...).

→ Hai bước đầu cho "chạy mọi agent" ở mức dùng được mà chỉ viết 2 adapter.

---

## 11. Độ phức tạp & ước lượng thời gian

**Đơn giản hơn nhiều về kỹ thuật** so với ReportSupporter/univillage: không UI, không backend, không DB, không auth, không deploy hạ tầng. Code surface nhỏ (adapter chỉ INJECT/GATE/EMIT). Phần khó dịch sang **chất lượng nội dung**, không phải khối lượng code.

Cái "ăn" thời gian: (1) mài kịch bản phỏng vấn cho doc thật sự dùng được; (2) logic GATE với ca biên; (3) test thật trên từng harness.

| Mốc | Phạm vi | Thời gian (bán thời gian, 1 mình) |
|---|---|---|
| **Bản chạy được** | Claude Code: skill + hook gate + kịch bản lõi cho **1 hướng (web)**, sinh cây doc end-to-end | ~1 tuần |
| **v1 dùng được** | Thêm nhánh mobile, template chau chuốt, phần "tại sao", + adapter `AGENTS.md` | ~1 tháng |
| **Đáng chia sẻ** | Test trên 3–4 dự án thật, lặp nội dung, README/phân phối | tổng ~2–3 tháng |

**Cảnh báo phạm vi:** loại dự án "demo chạy 1 tuần nhưng mài phương pháp phình vô hạn". Kỷ luật phạm vi cứu bạn: chốt MVP (Claude Code + web), thả lên dự án thật, đo xem rút "1 tuần soạn doc" còn bao lâu — *rồi mới* mở rộng.

---

## 12. Tầm nhìn xa: phát triển thành tool MAINTAIN tài liệu

**Khó hơn một bậc — khác LỚP bài toán, không chỉ khác khối lượng.** Scaffolding = ghi-một-lần, không trạng thái. Maintain = liên tục, có trạng thái, hai chiều (bài toán khó nhất ngành về tài liệu).

### 3 thứ làm nó khó hơn
1. **Drift (lệch pha):** code đổi → doc cũ. Phát hiện "doc nào giờ đã sai" là lõi khó.
2. **Chế độ hỏng nguy hiểm hơn:** maintain báo "vẫn ổn" trong khi âm thầm sai → phá hủy lòng tin. Nguyên tắc: **thà gắn cờ nghi ngờ, không âm thầm bảo chứng.**
3. **Cần trigger ngoài phiên tương tác** (commit/PR/CI) → phá vỡ mô hình "plugin thuần", kéo lại thành phần **CLI/bot**.

### Insight then chốt: độ khó maintain quyết định TỪ lúc scaffold
- Doc free-text thuần → maintain gần như bất khả (phải suy lại toàn bộ mapping).
- Doc mang **mỏ neo truy vết (traceability)** tới code (file/symbol) → maintain chỉ việc kiểm mấy mỏ neo có đổi không.
- `ContractForAI` của bạn **đã là artifact truy vết** → đầu đề-pa sẵn có.

### Đường lên dốc: tách "gắn cờ" và "tự sửa"
| Nấc | Làm gì | Rủi ro | Độ khó |
|---|---|---|---|
| **Drift Flagging** | "Code ở mỏ neo X đổi sau lần sửa doc Y → gắn cờ doc Y có thể cũ." Chỉ báo, không sửa. | Thấp | ≈ ngang scaffolding (checksum/timestamp + anchor) |
| **Drift Fixing** | LLM đọc diff + doc → đề xuất bản sửa → người duyệt. | Cao | Cao hơn hẳn (hiểu ngữ nghĩa diff, tốn token) |

→ Làm **Flagging trước** (rẻ, an toàn, real value). Fixing để sau.

### Mặt chiến lược
Maintain biến sản phẩm từ "init một lần" → "đồng hành liên tục", giá trị lặp lại, gắn CI/PR — **thường là cái lớn & bền hơn** scaffolding. Đổi lại kéo theo hạ tầng (git/CI hook, có thể cần server/bot).

---

## 13. Việc cần quyết / nghiên cứu tiếp (open questions)

- [ ] **Quyết NGAY dù maintain còn xa:** thiết kế **format anchor truy vết** cho doc ở phase scaffolding (quyết định rẻ hôm nay, khóa độ khó maintain sau này).
- [ ] Chốt schema file `interview-script` trung tính (mỗi câu: id, câu hỏi, mặc định, nhánh, ô-doc-đích, điều kiện gate).
- [ ] Soi sâu logic S3 (cách agent quyết Must/Should/Could).
- [ ] Viết thử bộ hook Claude Code (`PreToolUse` + `progress.json` + gate) làm reference.
- [ ] Chốt phạm vi MVP 1 tuần thật cụ thể (file nào, hook làm gì, kịch bản web rút mấy câu).
- [ ] Nghiên cứu kỹ đối thủ Spec Kit & Kiro (xem chúng làm dở chỗ "giả định người dùng đã biết mình muốn gì").
- [ ] Mở rộng taxonomy từ bản tối giản → bản "giống công ty" (ADR, test plan, ContractForAI).

---

## TL;DR
**DesignEverything = một bộ Lõi-text portable (kịch bản phỏng vấn + template doc + taxonomy + lý do) + các adapter native gầy theo từng harness, ép enforcement xuống bậc theo nền tảng, ra mắt từ Claude Code.** Không build agent. Đối tượng: người mới hoàn toàn, dự án từ số 0. Lợi thế cạnh tranh = phương pháp đã thực chiến (ContractForAI/TaskBrief), không phải code. Kỹ thuật nhẹ hơn app/web; cái khó là chất lượng nội dung. Tầm nhìn xa (maintain tài liệu) khó hơn một bậc nhưng tractable nếu gieo mỏ neo truy vết từ đầu.
