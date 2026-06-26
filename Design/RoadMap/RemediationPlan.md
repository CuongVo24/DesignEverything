# Remediation Plan — Vá lỗ hổng thiết kế trước khi code

> Mục đích: gom mọi lỗ hổng/thiếu sót còn lại của `Design/` thành các **fix-batch độc lập**, mỗi batch có prompt copy-paste để giao cho một agent khởi động lạnh. Làm xong toàn bộ thì `Design/` mới thật sự "đủ-để-code Month 1" mà không phải sửa hợp đồng giữa chừng.
>
> Bối cảnh: rà soát toàn `Design/` (đối chiếu README + FirstIdea là source of truth). Kết quả: phần lớn đã khoá tốt; còn **1 lỗ hổng thiết kế thật (FB1)** + vài việc đồng bộ. Lưu ý: golden example đã được đổi tên thành `golden-example-mobile/` và mọi tham chiếu đã nhất quán — KHÔNG cần sửa nữa.

## Tại sao cần file này
Lõi (`Core/`) là public API mà adapter phụ thuộc. Sửa hợp đồng *sau khi* đã viết hook = bump version + đụng code đã viết. Rẻ hơn nhiều nếu chốt mọi mơ hồ hợp đồng **ngay bây giờ**, khi chưa có dòng code adapter nào.

## Tinh thần bắt buộc giữ xuyên suốt (trích VibeCode + FirstIdea)
- **Single Source of Truth = `Core/`**; sửa `.md` lõi trước, không hardcode vào code.
- **Lõi béo, adapter gầy**; adapter chỉ INJECT/GATE/EMIT.
- **Hook KHÔNG đọc được ý định, chỉ thấy artifact + state** (FirstIdea §6) — đây là kim chỉ nam của FB1.
- **Thà gắn cờ nghi ngờ, không âm thầm bảo chứng.**
- Đổi schema → ghi changelog + `DecisionLog.md`. Vì 0.1.0 **chưa phát hành và chưa có code tiêu thụ**, ưu tiên *amend tại chỗ* 0.1.0 + ghi rõ lý do, KHÔNG bump trừ khi đổi phá tương thích thật.

## Thứ tự chạy (có phụ thuộc)
```
FB1 (Determinism boundary) ──► FB2 (gate-policy.yaml) ──► FB3 (RoadMap sync) ──► FB4 (QA sweep) ──► FB5 (ContractForAI Month 1)
```
Chạy tuần tự. FB1 và FB2 cùng đụng `Adapters/claude-code.md` nhưng **khác mục**: FB1 sở hữu mục `UserPromptSubmit` + chọn nhánh; FB2 chỉ sửa mục "Input lõi" (dòng ~37) + module loader. Làm FB1 trước, FB2 sau để tránh xung đột. **FB5 phải sau FB4** vì contract tham chiếu schema/spec đã khoá — viết sớm sẽ phải viết lại.

## Lưu ý môi trường (đọc trước khi sửa)
Trong lúc rà, một proxy đã từng trả về **ảnh chụp cây thư mục cũ** (hiện `golden-example/` đã là `golden-example-mobile/`). Vì vậy mỗi agent: nếu thấy đường dẫn/đặt tên nghi ngờ, **đối chiếu bằng `git ls-files` hoặc `git show HEAD:<file>`** thay vì tin tuyệt đối tool đọc file. Working tree là chân lý.

---

## FB1 — Khoá ranh giới Deterministic-hook ↔ Semantic-LLM (CRITICAL)

**Vấn đề (lỗ hổng thật):** Spec hiện giao cho `UserPromptSubmit` (hook deterministic) hai việc mà nó **không làm được** chỉ với input nó có (`progress.json` + `script.yaml` + `user_turn_id` + text thô):
1. **Chọn nhánh sau S6** — `claude-code.md:154` và `state-schema.md:52` nói hook "xác định `branch = web|mobile` từ câu trả lời". Nhưng câu S6 trả lời đời thường → hook không phân loại web/mobile xác định được. Mâu thuẫn trực tiếp với `gate-policy.md` §1 ("hook KHÔNG đọc được ý định").
2. **Điều kiện advance** — `claude-code.md:164` đòi "đã có xác nhận dịch ngược cho câu đó"; `state-schema.md:50` đòi "câu trả lời hợp lệ cho current_step". Cả hai là phán đoán ngữ nghĩa mà hook không quan sát được (UserPromptSubmit fire *trước* khi AI trả lời, chỉ thấy text người dùng).

**Quyết định kiến trúc cần encode (mô hình 2 lớp):**

- **Lớp ngữ nghĩa (skill/LLM, phía INJECT)** — sở hữu hội thoại và là **actor DUY NHẤT diễn giải ý nghĩa**. Sau khi hỏi câu hiện tại và người dùng xác nhận `translate_back`, skill thực hiện một "commit step" có cấu trúc, ghi vào `progress.json`: append `current_step` vào `answered`; nếu `current_step == S6` thì set `branch` từ câu trả lời đã chốt; tính `current_step` kế tiếp; cập nhật `last_user_turn_id` + `updated_at`.
- **Lớp deterministic (hooks, phía GATE)** — KHÔNG bao giờ diễn giải ý nghĩa. Chỉ ép đúng 2 đảm bảo cứng:
  - `PreToolUse`: gate dựa **artifact** (requires_docs có tồn tại không?). Đây là khoá "chưa xong doc, chưa code" thật sự — độc lập hoàn toàn với ngữ nghĩa.
  - `UserPromptSubmit`: **bộ giới hạn nhịp chống nhảy cóc**. Nó KHÔNG advance state. Mỗi lượt người thật, tối đa **một** phần tử mới được phép thêm vào `answered` so với lượt người thật trước. Nếu skill (hoặc model lỗi) cố thêm >1 bước trong cùng một cửa sổ lượt-người-thật → hook từ chối/gắn cờ. Cơ chế: so độ dài `answered` hiện tại với mốc đã chốt ở lượt trước (cần một field neo, xem dưới).
- **Tuyên bố enforcement trung thực:** đảm bảo CỨNG = (1) artifact-gate + (2) một-bước-mỗi-lượt-người-thật. Hook **không** validate ngữ nghĩa câu trả lời hay lựa chọn nhánh — đó là việc của skill, được rào bằng giới hạn nhịp để model không bịa cả 7 câu trong một lượt. Giữ đúng FirstIdea §6.

**File sửa:**
- `Core/Schemas/state-schema.md` — viết lại §3, §4 (quy tắc chuyển bước), §5 (bất biến): **gán rõ actor nào mutate field nào** (skill commit vs hook rate-limit). Cân nhắc thêm 1 field tối thiểu để hook kiểm nhịp được mà không cần đọc ý định, ví dụ `answered_count_at_last_turn: number` hoặc `last_committed_turn_id`. Giữ field tối thiểu — đừng thêm `step_state: asked|confirmed` nếu commit là atomic. Ghi changelog (amend 0.1.0).
- `Adapters/claude-code.md` — viết lại mục `UserPromptSubmit` ("Thuật toán" + "Điều kiện để được advance" + ca biên) để phản ánh: **hook không advance, hook giới hạn nhịp**; **skill commit**. Sửa phần chọn nhánh (dòng ~154): branch do skill set, hook chỉ validate `branch ∈ {web,mobile}` và chỉ được set đúng một lần sau S6. (KHÔNG đụng dòng ~37 — để FB2.)
- `Adapters/agents-md.md` — bậc B không có hook: rules/skill hướng dẫn cùng hành vi commit, nhưng nói rõ **không có đảm bảo giới hạn nhịp cứng** (mềm). Bổ sung/ră soát câu tuyên bố giới hạn.
- `Core/Contract.md` §3 + `ProductPRD.md` §5 — rà wording enforcement cho khớp tuyên bố trung thực mới (đảm bảo cứng = gate + rate-limit, không phải "validate từng câu"). Sửa nhẹ, đừng viết lại.
- `DecisionLog.md` — thêm **D14**: chốt mô hình 2 lớp + lý do (hook không đọc ý định; skill là actor ngữ nghĩa; đảm bảo cứng thu hẹp trung thực).
- `Core/Schemas/interview-script.md` — (tuỳ chọn) thêm 1 dòng ghi chú S6 là điểm quyết nhánh, NẾU thấy cần; không bắt buộc.

**Nghiệm thu:** một dev đọc xong biết chính xác actor nào ghi field nào; không còn chỗ nào bắt hook "đoán" web/mobile hay "chấm" câu trả lời; tuyên bố enforcement nhất quán giữa `claude-code.md`, `gate-policy.md`, `Contract.md`, `ProductPRD.md`; có D14.

**📋 PROMPT:**
```text
Dự án DesignEverything. ĐỌC THEO THỨ TỰ rồi tóm tắt trước khi sửa:
Design/VibeCode.md → Design/Core/Contract.md → Design/Core/Schemas/state-schema.md →
Design/Core/Schemas/gate-policy.md → Design/Adapters/claude-code.md → Design/Adapters/agents-md.md →
FirstIdea.md (đọc kỹ §6).
NHIỆM VỤ (FB1 — Khoá ranh giới deterministic-hook ↔ semantic-LLM). Lỗ hổng: spec đang bắt
UserPromptSubmit (hook deterministic) tự CHỌN NHÁNH web/mobile sau S6 và tự CHẤM "câu trả lời hợp lệ"
— hai việc hook không làm được (FirstIdea §6: hook không đọc được ý định).
CHỐT MÔ HÌNH 2 LỚP và encode vào tài liệu lõi:
(1) Lớp ngữ nghĩa = skill/LLM: actor DUY NHẤT diễn giải ý nghĩa. Sau khi user xác nhận translate_back,
skill "commit step": append current_step vào answered; nếu là S6 thì set branch; tính current_step kế;
cập nhật last_user_turn_id + updated_at.
(2) Lớp deterministic = hooks, không diễn giải ý nghĩa: PreToolUse = gate dựa artifact; UserPromptSubmit
= giới hạn nhịp (tối đa 1 bước mới mỗi lượt người thật, so độ dài answered với mốc lượt trước — có thể
cần thêm 1 field tối thiểu vào state-schema). Hook KHÔNG advance, KHÔNG chấm ngữ nghĩa.
(3) Tuyên bố enforcement trung thực: đảm bảo cứng = artifact-gate + một-bước-mỗi-lượt; KHÔNG hứa hook
validate từng câu.
FILE SỬA: state-schema.md (§3/§4/§5 + có thể thêm field neo nhịp, amend changelog 0.1.0);
claude-code.md (viết lại mục UserPromptSubmit + chọn nhánh; KHÔNG đụng mục "Input lõi" dòng ~37);
agents-md.md (bậc B: cùng hành vi nhưng mềm, nói rõ không có rate-limit cứng); Contract.md §3 +
ProductPRD.md §5 (rà wording enforcement cho khớp); DecisionLog.md thêm D14.
RÀNG BUỘC: không bump version (0.1.0 chưa phát hành, chưa có code) — amend tại chỗ + changelog + D14.
Lõi béo adapter gầy. KHÔNG viết code. Xong thì liệt kê file đã sửa + tóm tắt mô hình 2 lớp đã chốt.
```

---

## FB2 — Tách `gate-policy.yaml` máy-đọc-được

**Vấn đề:** Runtime adapter cần dữ liệu gate **máy-đọc-được**, nhưng hiện gate chỉ tồn tại dạng ví dụ YAML *bên trong* `Core/Schemas/gate-policy.md` (mục 2). `claude-code.md:37` còn ghi điều kiện treo "*nếu đã được chốt cùng lõi*" → chưa có file thật. Không có file này thì hook phải parse markdown runtime (vi phạm chính nguyên tắc trong `claude-code.md`).

**Phụ thuộc:** FB1 (để chỉnh `claude-code.md` không xung đột mục).

**File tạo/sửa:**
- TẠO file dữ liệu gate máy-đọc-được (đề xuất `Design/Content/interview-script/gate-policy.yaml`, đặt cạnh `script.yaml` cho runtime; hoặc `Design/Core/gate-policy.yaml` nếu muốn gần lõi — chọn 1, ghi lý do vào DecisionLog). Nội dung = đúng gate `scope-locked` trong schema (id, requires_docs, blocks, message), `version: 0.1.0`. Phải KHỚP 100% ví dụ trong `gate-policy.md`.
- `Adapters/claude-code.md` — sửa mục "Input lõi" (dòng ~37): bỏ "nếu đã được chốt", trỏ thẳng tới file `gate-policy.yaml` vừa tạo; xác nhận `core/loadGatePolicy.ts` đọc file này.
- `Core/Schemas/gate-policy.md` — thêm 1 dòng: "Bản dữ liệu khoá ở `<đường-dẫn>`; file `.md` này là hợp đồng/định nghĩa, file `.yaml` là dữ liệu runtime."
- `Conventions/TestStrategy.md` — tầng 1 thêm: validate `gate-policy.yaml` khớp schema + mọi `requires_docs` có trong taxonomy.
- `DecisionLog.md` — D15: chốt vị trí + định dạng file gate runtime.

**Nghiệm thu:** có `gate-policy.yaml` validate được theo schema, khớp ví dụ; không còn điều kiện treo "nếu đã chốt"; loader trỏ đúng file thật.

**📋 PROMPT:**
```text
Dự án DesignEverything. ĐỌC: Design/VibeCode.md → Design/Core/Schemas/gate-policy.md →
Design/Content/interview-script/script.yaml → Design/Adapters/claude-code.md →
Design/Content/taxonomy.md. Tóm tắt trước.
NHIỆM VỤ (FB2 — tách gate-policy.yaml máy-đọc-được): hiện gate chỉ nằm dạng ví dụ TRONG gate-policy.md;
runtime cần file dữ liệu thật. (1) TẠO gate-policy.yaml (đề xuất cạnh script.yaml trong
Design/Content/interview-script/; nếu chọn chỗ khác thì ghi lý do) gồm gate scope-locked đúng schema
(id/requires_docs/blocks/message) + version 0.1.0, KHỚP 100% ví dụ trong gate-policy.md.
(2) Sửa claude-code.md mục "Input lõi" (dòng ~37): bỏ "nếu đã được chốt cùng lõi", trỏ thẳng file vừa tạo.
(3) Thêm dòng trong gate-policy.md phân biệt .md (hợp đồng) vs .yaml (dữ liệu runtime).
(4) TestStrategy.md tầng 1: thêm luật validate gate-policy.yaml. (5) DecisionLog D15 chốt vị trí+định dạng.
KIỂM: mọi requires_docs tồn tại trong taxonomy; mọi gate được script.yaml tham chiếu có trong file này.
KHÔNG viết code. Liệt kê file đã sửa.
```

---

## FB3 — Đồng bộ RoadMap (timeline, phân pha, liên kết treo)

**Các điểm cần sửa:**
1. **Mâu thuẫn timeline** — `MasterRoadMap.md` bảng "Mốc" ghi *Bản chạy được ~1 tuần / v1 ~1 tháng* (bê từ FirstIdea) NHƯNG kế hoạch 16 tuần lại phân *Bản chạy được = cả Month 1 (4 tuần)*, v1 = hết Month 2. Thêm 1 đoạn hoà giải: ước lượng FirstIdea là lý tưởng/optimistic; kế hoạch 16 tuần là lịch calendar bán-thời-gian đã đệm dogfood + phân phối. Hoặc chú thích trực tiếp trong bảng. KHÔNG xoá ước lượng gốc (chứng tích), chỉ làm rõ quan hệ.
2. **Phân pha** — nói rõ ở đầu MasterRoadMap: **Phase 0 = ContentFillPlan (B1–B9, đã xong)** → **Phase 1–4 = 16 tuần code**. Đánh dấu ContentFillPlan đã hoàn tất (theo git log batch 9). Hiện quan hệ này chỉ ngầm hiểu; Week-01 ghi phụ thuộc "Batch 1–9" mà MasterRoadMap chưa tuyên bố pha.
3. **TestStrategy mồ côi** — các tuần nặng test (Week-02 unit test, Week-03 hook test, Week-08 regression) chưa trỏ `Conventions/TestStrategy.md`. Thêm link vào ít nhất Week-02 và Week-08 (và Week-03 nếu hợp).
4. **Open questions ↔ tuần** — vài "Việc cần quyết" trong MasterRoadMap đã được giao cho tuần cụ thể (vd "chọn golden web" = Week-01; "dạng gate-policy máy-đọc-được" = FB2/Week-02). Cross-link hoặc đánh dấu cái nào đã có chỗ xử lý, để danh sách chỉ còn cái thật sự treo (cấu trúc package, baseline đo "1 tuần").

**File sửa:** `RoadMap/MasterRoadMap.md`, `RoadMap/Month1/Week-02.md`, `RoadMap/Month1/Week-03.md`, `RoadMap/Month2/Week-08.md`.

**Nghiệm thu:** đọc MasterRoadMap không còn thấy hai ước lượng đá nhau mà không giải thích; biết rõ ContentFillPlan là pha đã xong; tuần test trỏ TestStrategy; open questions phân biệt "đã giao" vs "còn treo".

**📋 PROMPT:**
```text
Dự án DesignEverything. ĐỌC: Design/VibeCode.md → Design/RoadMap/MasterRoadMap.md →
Design/RoadMap/ContentFillPlan.md → Design/RoadMap/Month1/Week-02.md, Week-03.md →
Design/RoadMap/Month2/Week-08.md → Design/Conventions/TestStrategy.md → FirstIdea.md §11. Tóm tắt trước.
NHIỆM VỤ (FB3 — đồng bộ RoadMap): (1) Hoà giải mâu thuẫn timeline trong MasterRoadMap: bảng ghi
"Bản chạy được ~1 tuần" nhưng plan phân nó cho cả Month 1 (4 tuần). Thêm đoạn làm rõ ước lượng FirstIdea
là optimistic, 16 tuần là calendar bán-thời-gian có đệm — KHÔNG xoá số gốc. (2) Tuyên bố phân pha ở đầu:
Phase 0 = ContentFillPlan B1–B9 (ĐÃ XONG) → Phase 1–4 = 16 tuần code; đánh dấu ContentFillPlan hoàn tất.
(3) Thêm link Conventions/TestStrategy.md vào Week-02 và Week-08 (và Week-03 nếu hợp). (4) Cross-link
open questions của MasterRoadMap với tuần đã tiếp nhận; chỉ giữ treo cái thật sự chưa có chỗ.
KHÔNG viết code. Liệt kê file đã sửa.
```

---

## FB4 — QA sweep cuối (nhất quán toàn `Design/`)

**Phụ thuộc:** FB1 + FB2 + FB3.

**Checklist rà:**
- Mọi thay đổi của FB1–FB3 nhất quán chéo: wording enforcement giống nhau ở `gate-policy.md`, `claude-code.md`, `agents-md.md`, `Contract.md`, `ProductPRD.md`, `VibeCode.md`.
- `state-schema.md` (sau FB1) khớp với mô tả `UserPromptSubmit` trong `claude-code.md` từng bước.
- Mọi `target_doc`/`gate`/`branch` trong `script.yaml` vẫn hợp lệ; mọi gate trỏ gate có thật trong `gate-policy.yaml` mới.
- Từ vựng khớp `Glossary.md`; reading order trong `VibeCode.md` + `Guideline.md` khớp file thực tế (đặc biệt nếu FB2 thêm file mới).
- **Xác nhận golden naming đã nhất quán**: thư mục là `golden-example-mobile/`, mọi tham chiếu trỏ `-mobile` hoặc `-web` (golden web là việc build ở Week-01, cố ý chưa tạo — chỉ kiểm tên, không tạo).
- `DecisionLog.md` có D14 (FB1) + D15 (FB2); `Versioning.md` changelog phản ánh amend nếu có.
- Không còn liên kết treo, không còn placeholder kiểu nháp; mỗi file vẫn có "## Tại sao cần file này".

**Nghiệm thu:** một báo cáo "đã nhất quán" liệt kê mọi lệch đã sửa; `Design/` sẵn sàng vào Month 1 Tuần 1 mà không còn mơ hồ hợp đồng.

**📋 PROMPT:**
```text
Dự án DesignEverything. ĐỌC toàn bộ Design/ + FirstIdea.md (dùng git ls-files để lấy cây thật,
đừng tin cache). Tóm tắt cấu trúc trước.
NHIỆM VỤ (FB4 — QA sweep cuối sau FB1–FB3): rà nhất quán và SỬA chỗ lệch:
(1) wording enforcement đồng nhất giữa gate-policy.md/claude-code.md/agents-md.md/Contract.md/ProductPRD.md/
VibeCode.md; (2) state-schema (sau FB1) khớp từng bước với UserPromptSubmit trong claude-code.md;
(3) mọi target_doc/gate/branch trong script.yaml hợp lệ; gate trỏ gate-policy.yaml mới; (4) từ vựng khớp
Glossary; reading order VibeCode + Guideline khớp file thực tế (kể cả file FB2 thêm); (5) XÁC NHẬN golden
naming nhất quán: thư mục golden-example-mobile/, refs trỏ -mobile/-web (KHÔNG tạo golden web — để Week-01);
(6) DecisionLog có D14+D15, Versioning changelog đúng; (7) không liên kết treo, mỗi file còn "## Tại sao cần
file này". XUẤT BÁO CÁO liệt kê mọi lệch đã sửa. KHÔNG viết code.
```

---

## FB5 — Dựng lane ContractForAI + viết contract Month 1

**Vì sao:** Agent code chính của dự án là model yếu (Gemini Flash, harness yếu hơn Claude/Codex). Một "Week" là đơn vị quá to cho nó — sẽ trôi scope, bịa interface, bỏ ràng buộc. Cần lớp **ContractForAI**: mỗi micro-task có kết quả mong đợi rõ, danh sách file, lệnh verify, status gate. Manager (model mạnh) viết contract; executor làm theo. Đây là cơ chế chất lượng — và là dogfooding (DesignEverything là sản phẩm ép spec-trước-code).

**Quyết định phạm vi (đã chốt):** **chỉ Month 1**, **một lớp** (ContractForAI thôi — Week file đã đóng vai TaskBrief, không tạo `TaskBrief/` riêng).

**Phụ thuộc:** FB1–FB4 (design phải khoá; contract tham chiếu schema/spec đã chốt).

**Đọc trước:** `Design/ContractForAI/CONTRACT_STRUCTURE_RULE.md` (đã có), `VibeCode.md`, `RoadMap/Month1/README.md` + `Week-01..04.md`, `Conventions/TechStack.md`, `Conventions/TestStrategy.md`, `Adapters/claude-code.md`, `Core/Schemas/*`, `Content/interview-script/script.yaml`, `Content/taxonomy.md`.

**Việc chi tiết:**
- Dựng skeleton `Design/ContractForAI/Core/month1/{W1,W2,W3,W4}/` + `break_task/` (folder rỗng để sẵn, đừng tạo break contract trước khi có output để review).
- Phân rã **mỗi tuần Week-01..04** thành **~4-6 micro-task contract** (nhóm a/b/c...), mỗi contract = một đơn vị ≤ ~200 dòng. Nguồn phân rã = "Việc chi tiết" của Week file + mapping module trong `claude-code.md` ("Cấu trúc module khuyến nghị") + nghiệm thu Week.
- Mỗi contract đủ **7 mục** theo structure rule, đặc biệt nặng tay ở: **kết quả mong đợi cụ thể** (tên file/hàm/shape), **danh sách file `[NEW]/[MODIFY]`**, **lệnh verification thật** (`npx vitest run`, `npm run typecheck`, `npm run build`). Executor yếu KHÔNG được tự chế interface — signature phải nằm trong contract.
- Mỗi contract ghi rõ **tầng** (Lõi/Nội dung/Adapter) và để `Status: WAITING_FOR_APPROVAL`.
- Gợi ý phân rã (manager tinh chỉnh): W1 = (a) scaffold repo+tooling, (b) golden-example-web fixture, (c) ghi chú chốt phạm vi MVP; W2 = (a) zod mirror 3 schema, (b) loadScript/loadProgress, (c) advanceState, (d) evaluateGate + emit gate-policy data, (e) unit test web+mobile; W3 = (a) SessionStart, (b) UserPromptSubmit theo mô hình 2 lớp FB1, (c) PreToolUse + heuristic Bash, (d) skill INJECT; W4 = (a) EMIT cây docs + anchor, (b) chạy thử web end-to-end, (c) ca biên + runbook.

**Nghiệm thu:** có structure rule + skeleton; mỗi tuần Month 1 có bộ contract đủ 7 mục, sized cho executor yếu, signature/file/verify rõ tới mức Gemini làm theo không phải đoán; mọi contract `WAITING_FOR_APPROVAL`; không tạo break_task contract khống.

**📋 PROMPT:**
```text
Dự án DesignEverything. ĐỌC: Design/ContractForAI/CONTRACT_STRUCTURE_RULE.md → Design/VibeCode.md →
Design/RoadMap/Month1/README.md + Week-01.md..Week-04.md → Design/Conventions/TechStack.md +
TestStrategy.md → Design/Adapters/claude-code.md → Design/Core/Schemas/* →
Design/Content/interview-script/script.yaml → Design/Content/taxonomy.md. Tóm tắt trước.
NHIỆM VỤ (FB5 — ContractForAI Month 1, CHỈ Month 1, MỘT lớp): (1) dựng skeleton
Design/ContractForAI/Core/month1/{W1,W2,W3,W4}/ + break_task/ (để rỗng). (2) Phân rã mỗi tuần
Week-01..04 thành ~4-6 micro-task contract (nhóm a/b/c...), mỗi cái = một đơn vị ≤~200 dòng, đủ 7 mục
theo structure rule. NẶNG TAY ở: kết quả mong đợi cụ thể (tên file/hàm/shape), danh sách [NEW]/[MODIFY],
lệnh verification thật. Executor là MODEL YẾU → signature interface phải nằm trong contract, không để nó
tự chế. Mỗi contract ghi rõ tầng (Lõi/Nội dung/Adapter), Status: WAITING_FOR_APPROVAL.
RÀNG BUỘC: bám đúng schema/spec ĐÃ KHOÁ sau FB1–FB4 (đặc biệt UserPromptSubmit theo mô hình 2 lớp của
FB1); KHÔNG tạo TaskBrief riêng; KHÔNG viết break_task contract khống; KHÔNG viết code. Liệt kê file đã tạo.
```

---

## Quy ước chung cho mọi fix-batch
- **Commit** sau mỗi batch: `docs(design): FB<N> - <mô tả>`.
- **Một batch không xong thì không sang batch sau.**
- Agent **luôn đọc `VibeCode.md` đầu tiên**; nếu định nhảy vào code → vi phạm, dừng.
- Phát sinh quyết định mới → ghi `DecisionLog.md`. Đổi schema phá tương thích → bump `Versioning.md`; còn lại amend 0.1.0 + changelog.
- Nghi ngờ đường dẫn/đặt tên → đối chiếu `git ls-files` / `git show HEAD:<file>`.

## Cố ý KHÔNG đưa vào remediation (để đúng pha)
- **Golden example web** — là việc *build* ở Month 1 Tuần 1, không phải lỗ hổng thiết kế. Chỉ giữ tên `golden-example-web/` nhất quán, chưa tạo nội dung.
- **Cấu trúc repo code (1 hay nhiều package), baseline đo "1 tuần"** — open question thật, để Tuần 1 / Month 3 quyết theo kế hoạch.
