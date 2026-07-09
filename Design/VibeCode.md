# 🤖 VIBE CODING PROTOCOL — DesignEverything (ANTI-HALLUCINATION)

Bộ **Khung Kim Cô** bắt buộc mọi AI Agent (Claude Code / Cursor / Codex / Antigravity...) phải tuân khi làm việc trên **DesignEverything**, để ngăn ảo giác phá vỡ kiến trúc **lõi + adapter** đã thiết kế.

## Tại sao cần file này
Đây là file kỷ luật gốc của toàn repo. Nếu không có nó, agent rất dễ nhảy vào code trước khi lõi và nội dung được khóa, trong khi chính sản phẩm này sống bằng lời hứa ngăn chuyện đó xảy ra.

> ⚠️ **Dự án này tự ăn cơm nhà mình (dogfooding).** Nó là công cụ *ép người ta thiết kế tài liệu trước khi code* — nên chính nó phải gương mẫu: **không đụng code adapter khi hợp đồng Lõi & schema chưa khoá.** Vi phạm điều này = phản bội sản phẩm.

> Dự án **1 người** vận hành cùng AI. Kỷ luật càng phải chặt vì không có buddy review chéo. AI là người thực thi, **không phải người quyết định scope**.

---

## 🛑 STEP 0: NẠP NGỮ CẢNH (THE ABSOLUTE PRIMER)

Mở phiên mới, **hành động đầu tiên tuyệt đối** là đọc trọn file này, rồi đọc bộ xương sống **theo đúng thứ tự**:

| # | File | Mục đích | Khi nào |
|---|------|----------|---------|
| 1 | `Design/VibeCode.md` | Khung Kim Cô (file này) | Luôn đọc đầu |
| 2 | `Design/Guideline.md` | Bản đồ toàn `Design/`, thứ tự đọc | Luôn đọc |
| 3 | `Design/ProductPRD.md` | Sản phẩm là gì, cho ai, **Non-goals** | Luôn đọc |
| 4 | `Design/Glossary.md` | Từ vựng chuẩn — gọi tên mọi thứ giống nhau | Luôn đọc |
| 5 | `Design/Core/Contract.md` | Hợp đồng Lõi↔Adapter (public API) | Luôn đọc |
| 6 | `Design/Core/Versioning.md` | Cách đổi lõi mà không vỡ adapter | Luôn đọc |

**Tài liệu lõi — đọc khi đụng schema / nội dung:**

| # | File | Khi nào |
|---|------|---------|
| 7 | `Design/Core/Schemas/interview-script.md` | Khi đụng kịch bản phỏng vấn |
| 8 | `Design/Core/Schemas/state-schema.md` | Khi đụng `progress.json` / state machine |
| 9 | `Design/Core/Schemas/gate-policy.md` | Khi đụng logic GATE / hook |
| 10 | `Design/Core/AnchorFormat.md` | Khi đụng mỏ neo truy vết trong output |
| 11 | `Design/Content/taxonomy.md` | Khi đụng cây doc đầu ra (EMIT) |
| 12 | `Design/Content/interview-script/README.md` | Khi mài nội dung S0–S7 / W / M / C |
| 12.1 | `Design/Content/interview-script/shapes.yaml` | Khi cấu hình hình-hài dự án (registry) |
| 12.2 | `Design/Content/golden-example-cli/` | Cây thư mục golden mẫu của CLI |

**Tài liệu adapter & quy ước — đọc khi code:**

| # | File | Khi nào |
|---|------|---------|
| 13 | `Design/Adapters/ConformanceMatrix.md` | Trước khi viết/sửa bất kỳ adapter nào |
| 14 | `Design/Adapters/claude-code.md` / `agents-md.md` | Khi code adapter tương ứng |
| 15 | `Design/Conventions/TechStack.md` | Stack khoá cứng (cấm import lậu) — Node/TS | Luôn đọc khi code |
| 16 | `Design/Conventions/Coding & Git Standard.md` | Luôn đọc khi code |
| 17 | `Design/Content/QualityRubric.md` | Khi viết/chấm nội dung doc |
| 18 | `Design/Conventions/TestStrategy.md` | Trước khi test (3 tầng) |
| 19 | `Design/RoadMap/MasterRoadMap.md` | Biết đang ở mốc nào, scope ra sao |
| 20 | `Design/DecisionLog.md` | Khi phân vân vì sao đã chọn thế này |
| 21 | `Design/ContractForAI/CONTRACT_STRUCTURE_RULE.md` + contract của task | **Trước khi code một task** — đọc contract tương ứng (`Core/month{N}/W{tuần}/`), làm đúng scope + verification của nó |

> 💡 **Prompt gợi ý đầu phiên:**
> *"Đọc `Design/VibeCode.md` và toàn bộ tài liệu nó trỏ tới, rồi tóm tắt lại cho tôi trước khi làm gì. KHÔNG code."*

---

## 🧭 STEP 1: PLANNING MODE — PHÂN RÃ + PHÂN LOẠI

Khi nhận task, AI **KHÔNG tuôn code ngay**. Bắt buộc:

1. **Phân loại task vào đúng tầng:**
   - **LÕI** (Contract / Schema / taxonomy / anchor) → đụng tới đây là đụng public API → cần version + cập nhật ConformanceMatrix.
   - **NỘI DUNG** (kịch bản phỏng vấn, template, lý do "tại sao cần file này") → đây là **sản phẩm thật**, chất lượng > tốc độ.
   - **ADAPTER** (INJECT/GATE/EMIT cho 1 harness) → chỉ vỏ, phải gầy.
2. **File map:** liệt kê chính xác file `[NEW]` / `[MODIFY]`.
3. **Risk:** đụng public API lõi? phá taxonomy? thiếu version bump? adapter phình logic đáng lẽ thuộc lõi?

---

## 📜 STEP 2: LÕI-FIRST → WAIT FOR APPROVE

**Single Source of Truth = `Design/Core/`.** Trước khi viết code adapter, hợp đồng & schema liên quan phải **đã khoá** trong `Core/`.

- Cần đổi hành vi lõi → sửa file `.md` trong `Core/` **trước**, nêu rõ ảnh hưởng adapter, rồi **DỪNG và chờ "Approve"**.
- Chỉ khi user gõ **"Approve"** mới được viết/đổi code adapter.
- ⛔ Nhảy thẳng vào code adapter khi schema/contract chưa khoá = vi phạm nghiêm trọng → dừng ngay. (Đây chính là cái gate mà sản phẩm này bán ra — ta phải sống bằng nó.)

---

## 🧱 STEP 3: LUẬT 200 DÒNG (ANTI-HALLUCINATION)

- Cấm thêm/sửa/ghi đè **> 200 dòng trên 1 file / 1 lần**. Vượt ngưỡng → AI dễ quên `{}` hoặc ghi đè mất logic cũ.
- Tách file con, code từng nhánh ~100 dòng → test → mới mở dải mới.
- Ưu tiên **localized edits**, không rewrite cả file vô cớ.

---

## 🚧 STEP 4: KỶ LUẬT LÕI BÉO — ADAPTER GẦY (STRICT ECOSYSTEM)

- **Logic chung dồn về lõi.** Adapter chỉ làm đúng 3 việc: INJECT / GATE / EMIT (xem `Core/Contract.md` §2). Thấy adapter bắt đầu chứa logic phỏng vấn/taxonomy → kéo ngược về lõi.
- **Không hardcode câu hỏi/taxonomy trong code.** Code **đọc** từ `interview-script` & `taxonomy` — file schema là nguồn sự thật duy nhất.
- **Cấm import lậu:** không thêm dependency ngoài cái đã thống nhất mà không xin approve.
- **Đổi schema = bump version:** mọi thay đổi `Core/Schemas/*` phải theo `Versioning.md` (MAJOR/MINOR/PATCH) và cập nhật `ConformanceMatrix.md` nếu phá tương thích.
- **Mỏ neo gắn từ đầu:** output luôn mang anchor theo `AnchorFormat.md` — không để dành.

---

## 🚀 STEP 5: PUSH PROTOCOL & ITERATE

Xong mỗi nhóm task, qua các trạm gác rồi mới push:

1. **Test 3 tầng** (theo `Conventions/TestStrategy.md`): schema hợp lệ · GATE chặn đúng ca biên · end-to-end adapter ra đúng cây taxonomy.
2. **Branch Guard:** nhánh `feat/<mô-tả>` / `fix/<mô-tả>`. Cấm push thẳng `main` (trừ tài liệu).
3. **Commit Convention:** `<type>(<scope>): <mô tả>` (vd `feat(core): chot schema interview-script`).
4. **Push & report** bằng tiếng Việt: nhánh nào, đụng tầng nào (lõi/nội dung/adapter), có bump version không.

Sau push → quay lại **Step 2** cho nhóm tiếp theo.

```
┌──────────────────────────────────────────────┐
│  Step 0: Nạp ngữ cảnh (VibeCode + Core docs) │
│  Step 1: Plan + phân loại (Lõi/Nội dung/Adapter)│
│  ┌────────────────────────────────────────┐  │
│  │ Step 2: Lõi-first → WAIT APPROVE  ←─ lặp│  │
│  │ Step 3-4: Code (≤200 dòng, adapter gầy)│  │
│  │ Step 5: Test 3 tầng → Push → nhóm tiếp │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## 🚨 COMMON AI FAILURE MODES & HOW TO STOP THEM

| # | Failure mode | Triệu chứng | Cách chặn (DO THIS) |
|---|---|---|---|
| 1 | **Code adapter trước khi khoá lõi** | Viết hook/skill khi `Core/Contract.md` hoặc schema còn ở trạng thái chưa khoá | STOP. Khoá `Core/` + Approve trước. Đây là gate cốt lõi của chính sản phẩm. |
| 2 | **Hardcode câu hỏi vào code** | Câu phỏng vấn nằm trong `.ts`/hook thay vì đọc từ `interview-script` | Reject. Code đọc script, không nhúng nội dung. |
| 3 | **Adapter phình logic** | Adapter tự phân loại Must/Should/Could, tự dựng taxonomy | Kéo về lõi. Adapter chỉ INJECT/GATE/EMIT. |
| 4 | **Phá taxonomy / đổi id câu hỏi** | Đổi tên file đầu ra, tái dùng `id` cho nghĩa khác | Cấm. Đổi = MAJOR + cập nhật ConformanceMatrix + giữ id vĩnh viễn. |
| 5 | **Đổi schema không bump version** | Sửa `Core/Schemas/*` lặng lẽ | Bắt theo `Versioning.md`, ghi changelog, soát adapter ảnh hưởng. |
| 6 | **Quên mỏ neo truy vết** | Output doc không có anchor | Mọi mục mang anchor theo `AnchorFormat.md` (gieo từ scaffolding). |
| 7 | **Gate chặn nhầm "Stop"** | Hook chặn cả khi AI hỏi xong nhường lượt | Chỉ chặn khi định build/kết thúc mà state chưa đủ (gate-policy §3). |
| 8 | **Scope creep về Non-goals** | Bắt đầu nuôi model / dựng UI / làm maintain trong MVP | Chiếu `ProductPRD.md` §9. STOP & hỏi. |
| 9 | **Hứa ép cứng ở harness mềm** | Bảo người dùng Cursor "sẽ bị chặn" | Bậc B chỉ khuyến nghị. Nói đúng năng lực từng harness (graceful degradation). |

---

## 💡 GOLDEN RULES

1. **Single Source of Truth = `Core/`** — hành vi đổi → sửa `Core/` trước, code sau.
2. **Lõi béo, adapter gầy** — logic chung không bao giờ ở adapter.
3. **No locked Core — No adapter code** — schema/contract phải khoá trước.
4. **MVP-first** — bám `ProductPRD.md` Non-goals (không model, không UI, không maintain ở MVP).
5. **Dogfooding** — ta phải sống bằng đúng cái gate ta bán ra.
