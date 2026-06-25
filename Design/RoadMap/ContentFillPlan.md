# Content Fill Plan — Kế hoạch điền nội dung theo Batch

> Mục đích: chia việc "điền hết nội dung vào `Design/`" thành các **batch độc lập**, mỗi batch có prompt copy-paste để giao cho một agent khác. Mỗi agent khởi động lạnh → batch phải tự đứng được.

## Cách dùng file này
1. Làm **đúng thứ tự batch** (có phụ thuộc). Đừng nhảy cóc — vi phạm chính cái gate sản phẩm này bán ra.
2. Mỗi batch: copy nguyên khối **"📋 PROMPT"** dán cho agent mới.
3. Sau mỗi batch: chấm theo [../Content/QualityRubric.md](../Content/QualityRubric.md), commit theo [../Conventions/Coding & Git Standard.md](../Conventions/Coding%20&%20Git%20Standard.md), rồi mới sang batch sau.

## Tinh thần BẮT BUỘC giữ xuyên suốt (trích FirstIdea + VibeCode)
- **Cốt lõi là PHỎNG VẤN, không SINH** — agent hỏi câu đời thường, tự dịch sang ngôn ngữ chuẩn. (FirstIdea §4)
- **4 quy tắc vàng**: hỏi từng câu một · luôn có mặc định thông minh · dịch ngược · mỗi câu neo vào 1 ô doc. (FirstIdea §9)
- **Mỗi file kèm "Tại sao cần file này"** — vừa có sản phẩm vừa học nghề. (FirstIdea §4, insight HCMUS)
- **Lõi béo, adapter gầy** · **Portable ⟷ Enforce kéo nhau** → graceful degradation. (FirstIdea §6, §8)
- **Gieo mỏ neo truy vết từ scaffolding** (`status=planned`). (FirstIdea §13, AnchorFormat)
- **Single Source of Truth = `Core/`**; không hardcode câu hỏi vào code. (VibeCode)

## Bản đồ phụ thuộc
```
B1 (Schemas lock) ──┬──► B2 (S0–S6) ──► B3 (Web) ──► B4 (Mobile) ─┐
                    │                                              ├──► B6 (script.yaml) ──► B8 (Adapters)
                    └──────────────────► B5 (doc-templates) ──────┘            │
                                                                                ▼
                                                       B7 (Golden example) ──► B9 (QA pass)
```
Thứ tự chạy: **B1 → B2 → B3 → B4 → B5 → B6 → B7 → B8 → B9**.

---

## BATCH 1 — Khoá Schemas Lõi

**Mục tiêu:** biến 3 schema từ DRAFT thành bản khoá (mọi field định nghĩa rõ, không còn "cần chốt").
**Phụ thuộc:** không (làm đầu tiên).
**Đọc trước:** `VibeCode.md`, `Glossary.md`, `Core/Contract.md`, `Core/Versioning.md`, `Core/Schemas/*`, `Core/AnchorFormat.md`.
**File sửa:** `Core/Schemas/interview-script.md`, `Core/Schemas/state-schema.md`, `Core/Schemas/gate-policy.md`.

**Việc chi tiết:**
- `interview-script`: chốt danh sách field cuối cùng (id, ask, default, target_doc, branch, gate, translate_back, depends_on) — định nghĩa kiểu, bắt buộc/optional, ràng buộc (id vĩnh viễn, default=null nghĩa là bắt buộc). Thêm phần "luật validate" để Batch 6 + test bám theo.
- `state-schema`: chốt mọi field của `progress.json`, quy tắc chuyển bước (chỉ tiến 1 bước mỗi lượt người thật qua `UserPromptSubmit`), bất biến.
- `gate-policy`: chốt cấu trúc gate (id, requires_docs, blocks, message), cách map sang bậc A/B, và cạm bẫy `Stop` hook.
- Đánh dấu `version: 0.1.0` ổn định; thêm dòng vào changelog mỗi file. Ghi quyết định vào `DecisionLog.md` nếu phát sinh.

**Nghiệm thu:** không còn chữ "DRAFT/cần chốt"; 3 file đủ để vừa viết `script.yaml` vừa viết validator mà không phải đoán.

**📋 PROMPT:**
```text
Bạn làm việc trên dự án DesignEverything. ĐỌC THEO THỨ TỰ rồi tóm tắt lại cho tôi TRƯỚC KHI sửa:
Design/VibeCode.md → Design/Glossary.md → Design/Core/Contract.md →
Design/Core/Versioning.md → Design/Core/Schemas/* → Design/Core/AnchorFormat.md.
NHIỆM VỤ (Batch 1 — Khoá Schemas Lõi): biến 3 file Core/Schemas/* từ DRAFT thành bản khoá:
định nghĩa rõ mọi field (kiểu, bắt buộc/optional, ràng buộc), thêm "luật validate", giữ
version 0.1.0 + changelog. interview-script field: id, ask, default, target_doc, branch,
gate, translate_back, depends_on (id vĩnh viễn; default=null = bắt buộc). state-schema: chốt
progress.json + quy tắc tiến 1 bước/lượt người thật. gate-policy: id/requires_docs/blocks/
message + map bậc A/B + cạm bẫy Stop hook.
RÀNG BUỘC: không hardcode nội dung câu hỏi vào schema (chỉ định hình DẠNG). Giữ "lõi béo
adapter gầy". Mỗi file vẫn có "## Tại sao cần file này". Ghi quyết định mới vào Design/
DecisionLog.md. KHÔNG viết code, KHÔNG đụng adapter. Xong thì liệt kê file đã sửa.
```

---

## BATCH 2 — Kịch bản phỏng vấn KHUNG LÕI (S0–S6)

**Mục tiêu:** viết đầy đủ nội dung S0–S6 (bản người-đọc) trong `Content/interview-script/`, đào sâu S3.
**Phụ thuộc:** B1.
**Đọc trước:** `VibeCode.md`, `Glossary.md`, `ProductPRD.md`, `Core/Schemas/interview-script.md`, `Content/taxonomy.md`, `Content/QualityRubric.md`, và **FirstIdea.md §9** (bảng S0–S6 gốc).
**File tạo/sửa:** mở rộng `Content/interview-script/README.md`; tạo `Content/interview-script/S0-S6-core.md`.

**Việc chi tiết (cho TỪNG câu S0→S6):**
- `ask`: câu hỏi đời thường, như kể cho bạn thân — KHÔNG thuật ngữ.
- `default` ("mặc định thông minh"): lựa chọn phổ biến nhất khi người dùng nói "không biết".
- `translate_back`: agent tóm câu trả lời thành ngôn ngữ chuẩn rồi xác nhận — viết MẪU câu dịch ngược.
- `target_doc`: ô tài liệu câu này điền vào (bám taxonomy).
- `gate` (nếu có): nối với gate-policy.
- **Ví dụ minh hoạ**: 1 câu trả lời đời thường mẫu + bản dịch ngược tương ứng.
- **Bẫy thường gặp** của người mới ở câu đó + cách agent gỡ.

**Đặc biệt S3 (câu khó & quan trọng nhất — FirstIdea §9):** viết hẳn một mục "Logic phân loại Must/Should/Could": agent nhận list lộn xộn → hỏi gì thêm → quy tắc quyết Must (tập nhỏ nhất chạy được) / Should / Could / Won't → cách trình bày lại cho người mới hiểu. Đây là nơi giá trị sản phẩm dồn vào.

**Nghiệm thu:** chấm theo QualityRubric mục A + C; mỗi câu đủ 5 field + ví dụ + bẫy; S3 có logic phân loại rõ ràng.

**📋 PROMPT:**
```text
Dự án DesignEverything. ĐỌC THEO THỨ TỰ rồi tóm tắt trước khi viết:
Design/VibeCode.md → Design/Glossary.md → Design/ProductPRD.md →
Design/Core/Schemas/interview-script.md → Design/Content/taxonomy.md →
Design/Content/QualityRubric.md → FirstIdea.md (đọc kỹ §9 bảng S0–S6).
NHIỆM VỤ (Batch 2 — KHUNG LÕI S0–S6): viết đầy đủ nội dung phỏng vấn S0→S6 (bản người-đọc)
vào Design/Content/interview-script/S0-S6-core.md. Với TỪNG câu: ask (đời thường, không
thuật ngữ) · default thông minh · translate_back (kèm câu mẫu) · target_doc · gate (nếu có) ·
1 ví dụ trả lời đời thường + bản dịch ngược · bẫy người mới + cách gỡ.
ĐẶC BIỆT S3: viết hẳn mục "Logic phân loại Must/Should/Could" — agent là người phân loại,
người mới không tự ưu tiên được; Must = tập nhỏ nhất chạy được.
GIỮ TINH THẦN: cốt lõi là PHỎNG VẤN không SINH; 4 quy tắc vàng; mỗi câu neo vào đúng 1 ô doc.
Chấm theo QualityRubric mục A+C. KHÔNG viết code, KHÔNG viết YAML (để Batch 6). Liệt kê file đã sửa.
```

---

## BATCH 3 — Nhánh WEB (W1–W5)

**Mục tiêu:** viết đầy đủ nội dung nhánh web.
**Phụ thuộc:** B2 (rẽ nhánh sau S6).
**Đọc trước:** như B2 + `Content/interview-script/S0-S6-core.md`, FirstIdea.md §9 (bảng W1–W5).
**File tạo:** `Content/interview-script/W-web.md`.

**Việc chi tiết:** với W1→W5 làm đủ cấu trúc như B2 (ask/default/translate_back/target_doc/ví dụ/bẫy). Bám đúng mặc định FirstIdea: SEO→SSR/SSG (Next.js); responsive mobile-first; Vercel/Netlify free; OAuth Google + email/password; realtime/admin tuỳ S2. Mỗi quyết định kiến trúc phải **nối ngược về nhu cầu người dùng**, không chọn vì "hot" (QualityRubric B `05-architecture`).

**Nghiệm thu:** QualityRubric A; mọi default khớp FirstIdea; mỗi câu giải thích "vì sao default này".

**📋 PROMPT:**
```text
Dự án DesignEverything. ĐỌC: Design/VibeCode.md → Glossary.md → ProductPRD.md →
Core/Schemas/interview-script.md → Content/taxonomy.md → Content/QualityRubric.md →
Content/interview-script/S0-S6-core.md → FirstIdea.md (§9 bảng W1–W5). Tóm tắt trước khi viết.
NHIỆM VỤ (Batch 3 — Nhánh WEB W1–W5): tạo Design/Content/interview-script/W-web.md, mỗi câu
đủ ask/default/translate_back/target_doc + ví dụ + bẫy, giống cấu trúc S0-S6-core.md.
Bám default FirstIdea: SEO→SSR/SSG(Next.js); responsive mobile-first; Vercel/Netlify free;
OAuth Google+email/password; realtime/admin tuỳ S2. Mỗi quyết định kiến trúc PHẢI nối về nhu
cầu, không "vì hot". KHÔNG code, KHÔNG YAML. Chấm QualityRubric A. Liệt kê file đã sửa.
```

---

## BATCH 4 — Nhánh MOBILE (M1–M5)

**Mục tiêu:** viết đầy đủ nội dung nhánh mobile, **chủ động bới 2 bẫy** offline/sync (M2) và lên store (M5).
**Phụ thuộc:** B2.
**Đọc trước:** như B3 nhưng FirstIdea.md §9 (bảng M1–M5 + ghi chú 2 bẫy).
**File tạo:** `Content/interview-script/M-mobile.md`.

**Việc chi tiết:** M1→M5 đủ cấu trúc. Default FirstIdea: cross-platform (RN/Flutter); online-first trừ khi cần offline; liệt kê quyền ảnh hưởng store review; FCM cho push; IAP + TestFlight/Internal test. **M2 và M5 phải có cảnh báo chi phí/quy trình rõ ràng** (QualityRubric D) — đây là nơi người mới hay vỡ mộng "code xong là có app".

**Nghiệm thu:** QualityRubric A + D; M2 cảnh báo đội chi phí gấp đôi *trước khi* chốt; M5 nêu rõ review/ký app/phân phối.

**📋 PROMPT:**
```text
Dự án DesignEverything. ĐỌC: Design/VibeCode.md → Glossary.md → ProductPRD.md →
Core/Schemas/interview-script.md → Content/taxonomy.md → Content/QualityRubric.md →
Content/interview-script/S0-S6-core.md → FirstIdea.md (§9 bảng M1–M5 + 2 bẫy). Tóm tắt trước.
NHIỆM VỤ (Batch 4 — Nhánh MOBILE M1–M5): tạo Design/Content/interview-script/M-mobile.md, mỗi
câu đủ ask/default/translate_back/target_doc + ví dụ + bẫy. Default FirstIdea: cross-platform
(RN/Flutter); online-first; quyền→store review; FCM push; IAP+TestFlight/Internal test.
BẮT BUỘC: M2 cảnh báo offline/sync đội chi phí gấp đôi TRƯỚC khi chốt; M5 nêu rõ review/ký
app/phân phối (chống ảo tưởng "code xong là có app"). KHÔNG code, KHÔNG YAML. Chấm
QualityRubric A+D. Liệt kê file đã sửa.
```

---

## BATCH 5 — Doc-templates (8 mẫu file đầu ra)

**Mục tiêu:** viết 8 template trong `Content/doc-templates/` — khung của file mà sản phẩm SINH RA cho người dùng.
**Phụ thuộc:** B2 (biết câu nào điền vào đâu). Có thể chạy song song B3/B4 nếu cần, nhưng nên sau B2.
**Đọc trước:** `VibeCode.md`, `Content/taxonomy.md`, `Content/doc-templates/README.md`, `Content/QualityRubric.md`, `Core/AnchorFormat.md`, `Content/interview-script/S0-S6-core.md`.
**File tạo:** `00-vision`, `01-personas`, `02-scope`, `03-data-model`, `04-flows`, `05-architecture`, `06-constraints`, `07-deployment`/`07-release`, `README` (template mục lục đầu ra). Đặt trong `Content/doc-templates/`.

**Việc chi tiết mỗi template:**
- Mở đầu bằng `## Tại sao cần file này` (1–2 câu, ngôn ngữ người mới).
- Khung heading + chỗ chèn `{{nội dung đã dịch ngược}}` (placeholder rõ ràng để engine đổ vào).
- Cuối mỗi mục: mỏ neo theo AnchorFormat (`status=planned`).
- Ngắn vừa đủ; bám đúng câu phỏng vấn rót vào (taxonomy map).

**Nghiệm thu:** QualityRubric A; mỗi template có "tại sao", placeholder rõ, anchor mẫu; khớp taxonomy.

**📋 PROMPT:**
```text
Dự án DesignEverything. ĐỌC: Design/VibeCode.md → Content/taxonomy.md →
Content/doc-templates/README.md → Content/QualityRubric.md → Core/AnchorFormat.md →
Content/interview-script/S0-S6-core.md. Tóm tắt trước khi viết.
NHIỆM VỤ (Batch 5 — doc-templates): viết các template file ĐẦU RA trong
Design/Content/doc-templates/ : 00-vision, 01-personas, 02-scope, 03-data-model, 04-flows,
05-architecture, 06-constraints, 07-deployment, 07-release, README. Mỗi template: mở đầu
"## Tại sao cần file này" (đời thường) + khung heading + placeholder {{...}} để engine đổ nội
dung đã dịch ngược + mỏ neo AnchorFormat (status=planned) ở cuối mục. Khớp taxonomy map.
Ngắn vừa đủ. KHÔNG code. Chấm QualityRubric A. Liệt kê file đã tạo.
```

---

## BATCH 6 — `script.yaml` (bản máy đọc đầy đủ)

**Mục tiêu:** "đổ" toàn bộ nội dung S0–S6 + W + M sang một file YAML máy-đọc-được, đúng schema.
**Phụ thuộc:** B1 (schema) + B2 + B3 + B4 (nội dung).
**Đọc trước:** `VibeCode.md`, `Core/Schemas/interview-script.md` (luật field + validate), cả 3 file nội dung `Content/interview-script/*.md`.
**File tạo:** `Content/interview-script/script.yaml`.

**Việc chi tiết:** mỗi câu (S0–S6, W1–W5, M1–M5) thành 1 entry YAML đủ MỌI field schema yêu cầu, đúng kiểu. Đảm bảo: id duy nhất, branch đúng (core/web/mobile), gate trỏ gate có thật, target_doc tồn tại trong taxonomy. Thêm `version: 0.1.0`. Bản YAML phải KHỚP bản markdown (markdown là nơi bàn, yaml là nơi chốt).

**Nghiệm thu:** validate được theo luật trong schema; mọi target_doc/gate/branch hợp lệ; không lệch nội dung so với bản markdown.

**📋 PROMPT:**
```text
Dự án DesignEverything. ĐỌC: Design/VibeCode.md → Core/Schemas/interview-script.md (luật field
+ validate) → Content/interview-script/S0-S6-core.md, W-web.md, M-mobile.md. Tóm tắt trước.
NHIỆM VỤ (Batch 6 — script.yaml): tạo Design/Content/interview-script/script.yaml — đổ TOÀN BỘ
câu S0–S6 + W1–W5 + M1–M5 thành entry YAML đúng schema, đủ mọi field, đúng kiểu. version 0.1.0.
KIỂM: id duy nhất; branch ∈ {core,web,mobile}; gate trỏ gate có thật (gate-policy); target_doc
tồn tại trong taxonomy. Bản YAML phải KHỚP 3 file markdown nguồn — nếu lệch, dừng và báo chỗ
lệch thay vì tự quyết. KHÔNG viết code đọc YAML (để Batch 8). Liệt kê file đã tạo + báo kết quả tự-validate.
```

---

## BATCH 7 — Golden Example (cây docs/ mẫu hoàn chỉnh)

**Mục tiêu:** chạy tay trọn kịch bản cho 1 dự án giả → ra **trọn cây `docs/`** mẫu. Vừa demo, vừa fixture regression, vừa kiểm rubric.
**Phụ thuộc:** B5 (templates) + B6 (script).
**Đọc trước:** `VibeCode.md`, `script.yaml`, toàn bộ `doc-templates/`, `taxonomy.md`, `QualityRubric.md`.
**File tạo:** `Content/golden-example/` — gồm `_interview-transcript.md` (hỏi–đáp giả lập) + cây `docs/` đầy đủ.

**Việc chi tiết:** chọn 1 dự án giả cụ thể (gợi ý: "app chia tiền nhóm bạn ở trọ" — đủ nhỏ, có cả user/data/flow, hợp nhánh mobile). Viết transcript hỏi–đáp **theo đúng 4 quy tắc vàng** (từng câu một, có default, dịch ngược, neo doc). Rồi sinh trọn `docs/` bằng cách rót transcript qua templates. Mỗi file có anchor `status=planned` trỏ file dự kiến. Chấm cả cây theo QualityRubric.

**Nghiệm thu:** cây docs/ đầy đủ, mọi file pass QualityRubric A (+ phần áp dụng B/C/D); transcript thể hiện rõ dịch ngược & smart default; đây là chuẩn vàng để dogfooding sau này tái tạo.

**📋 PROMPT:**
```text
Dự án DesignEverything. ĐỌC: Design/VibeCode.md → Content/interview-script/script.yaml →
toàn bộ Content/doc-templates/ → Content/taxonomy.md → Content/QualityRubric.md. Tóm tắt trước.
NHIỆM VỤ (Batch 7 — Golden Example): trong Design/Content/golden-example/ tạo:
(1) _interview-transcript.md — hỏi–đáp giả lập cho 1 dự án giả cụ thể (gợi ý "app chia tiền
nhóm ở trọ"), tuân 4 quy tắc vàng: từng câu một, có default, DỊCH NGƯỢC, neo doc;
(2) cây docs/ đầy đủ, sinh bằng cách rót transcript qua doc-templates, mỗi file có "## Tại sao
cần file này" + anchor status=planned. Chấm cả cây theo QualityRubric (A + B/C/D nếu áp dụng) và
báo điểm từng file. Đây là CHUẨN VÀNG — chất lượng phải cao nhất. KHÔNG code. Liệt kê file đã tạo.
```

---

## BATCH 8 — Adapter chi tiết (Claude Code hook + AGENTS.md)

**Mục tiêu:** viết đặc tả chi tiết adapter Claude Code (reference, bậc A) và AGENTS.md (bậc B), tới mức đủ để code.
**Phụ thuộc:** B1 (schemas) + B6 (script) + TechStack.
**Đọc trước:** `VibeCode.md`, `Core/Contract.md`, `Core/Schemas/*`, `Conventions/TechStack.md`, `Adapters/ConformanceMatrix.md`, `Adapters/claude-code.md`, `Adapters/agents-md.md`.
**File sửa:** `Adapters/claude-code.md`, `Adapters/agents-md.md`; cập nhật `Adapters/ConformanceMatrix.md`.

**Việc chi tiết:**
- `claude-code.md`: đặc tả từng hook cần viết (`SessionStart` khởi tạo progress.json; `UserPromptSubmit` tiến 1 bước; `PreToolUse` đọc gate-policy chặn Write/Edit/Bash) — input/output, ca biên, **tránh Stop hook chặn nhầm**. Mô tả skill INJECT. Bám Node/TS + cách đọc script.yaml/zod.
- `agents-md.md`: mẫu nội dung `AGENTS.md` sinh ra (INJECT mềm) + câu lệnh GATE mềm + ghi rõ giới hạn "không ép cứng".
- Cập nhật ConformanceMatrix trạng thái.

**Nghiệm thu:** một dev đọc xong code được hook mà không phải đoán; nêu rõ ranh giới bậc A vs B (graceful degradation).

**📋 PROMPT:**
```text
Dự án DesignEverything. ĐỌC: Design/VibeCode.md → Core/Contract.md → Core/Schemas/* →
Conventions/TechStack.md → Adapters/ConformanceMatrix.md → Adapters/claude-code.md →
Adapters/agents-md.md. Tóm tắt trước.
NHIỆM VỤ (Batch 8 — Adapter chi tiết): đặc tả tới mức đủ-để-code (CHƯA code).
claude-code.md: từng hook (SessionStart init progress.json; UserPromptSubmit tiến 1 bước;
PreToolUse đọc gate-policy chặn Write/Edit/Bash) với input/output + ca biên + TRÁNH Stop hook
chặn nhầm; skill INJECT; bám Node/TS + đọc script.yaml qua zod.
agents-md.md: mẫu AGENTS.md (INJECT mềm) + câu lệnh GATE mềm + ghi rõ "không ép cứng".
Cập nhật ConformanceMatrix. Giữ "lõi béo adapter gầy" — không nhồi logic phỏng vấn vào adapter.
KHÔNG viết code thật. Liệt kê file đã sửa.
```

---

## BATCH 9 — QA pass (nhất quán & truy vết toàn bộ)

**Mục tiêu:** rà soát toàn bộ `Design/` cho nhất quán trước khi coi là "đầy đủ nội dung".
**Phụ thuộc:** tất cả batch trên.
**Đọc trước:** toàn bộ `Design/`.
**File sửa:** bất kỳ file lệch + cập nhật `DecisionLog.md`, `Versioning.md` changelog nếu cần.

**Checklist rà:**
- Từ vựng: mọi file dùng đúng tên trong `Glossary.md` (không gọi lẫn lộn).
- Truy vết: mọi `target_doc` trong script ↔ có template ↔ có trong taxonomy ↔ xuất hiện ở golden example.
- Gate: mọi `gate` trong script trỏ gate có thật trong gate-policy.
- Anchor: mọi output mẫu (golden) mang anchor đúng format.
- Reading order trong `VibeCode.md` & `Guideline.md` khớp danh sách file thực tế.
- Không còn TODO/DRAFT sót; mỗi file có "Tại sao cần file này".
- Chấm lại golden example theo QualityRubric, ghi điểm.

**Nghiệm thu:** một báo cáo "đã nhất quán" liệt kê các lệch đã sửa; `Design/` sẵn sàng cho giai đoạn viết code.

**📋 PROMPT:**
```text
Dự án DesignEverything. ĐỌC toàn bộ thư mục Design/ + FirstIdea.md. Tóm tắt cấu trúc trước.
NHIỆM VỤ (Batch 9 — QA pass): rà nhất quán toàn bộ Design/ và SỬA chỗ lệch:
(1) từ vựng khớp Glossary; (2) chuỗi truy vết target_doc ↔ template ↔ taxonomy ↔ golden
example đầy đủ; (3) mọi gate trong script trỏ gate có thật; (4) anchor đúng format ở mọi output
mẫu; (5) reading order trong VibeCode & Guideline khớp file thực tế; (6) không còn TODO/DRAFT
sót, mỗi file có "## Tại sao cần file này"; (7) chấm lại golden example theo QualityRubric.
Ghi quyết định/đổi version vào DecisionLog + Versioning changelog nếu cần. Xuất BÁO CÁO liệt kê
mọi lệch đã sửa. KHÔNG viết code.
```

---

## Quy ước chung cho mọi batch
- **Commit** sau mỗi batch: `docs(content): batch <N> - <mô tả>` (xem Coding & Git Standard).
- **Một batch không xong thì không sang batch sau** (tránh nợ chồng nợ).
- Agent **luôn đọc `VibeCode.md` đầu tiên** — nếu định nhảy vào code khi nội dung/lõi chưa khoá → vi phạm, dừng.
- Phát sinh quyết định mới → ghi `DecisionLog.md`. Đổi schema → bump `Versioning.md`.
