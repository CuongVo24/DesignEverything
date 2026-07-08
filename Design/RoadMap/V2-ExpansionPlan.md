# V2 Expansion Plan — Mở hình-hài dự án + Critic role + Calibrate (mốc v2.0.0)

> Mục đích: gom 5 nâng cấp lớn của kịch bản thành các **batch độc lập, có thứ tự**, khoá quyết định + spec **trước khi** chạm code. Theo đúng gương [RemediationPlan.md](RemediationPlan.md): thay đổi xuyên nhiều tầng mà làm rải rác = drift toàn `Design/`. Đây là Phase 2 của dự án.
>
> Bối cảnh: review kịch bản (sau dogfood Month 3) lộ ra sản phẩm **chưa đủ để ra ngoài** không phải vì thiếu agent, mà vì kịch bản chỉ biết 2 hình-hài dự án (web/mobile) và không hiệu chỉnh theo trình độ người dùng.

## Tại sao cần file này
5 nâng cấp này phụ thuộc lẫn nhau và đều đụng cùng vài file lõi (`interview-script` schema, `taxonomy`, `script.yaml`, `emit.ts`, adapter). Nếu làm theo cảm hứng từng cái, mỗi cái bump version + đụng code đã viết = đắt và dễ vỡ golden. Rẻ hơn nhiều nếu khoá toàn bộ quyết định + spec **một lần ở đây**, rồi mới phân ContractForAI cho executor.

## Tinh thần bắt buộc (trích VibeCode + FirstIdea)
- **Single Source of Truth = `Core/`**; sửa `.md` lõi trước, không hardcode vào code.
- **Lõi béo, adapter gầy.** Critic role (nâng cấp #5) vẫn là **một persona/pass trong agent sẵn có**, KHÔNG phải hạ tầng multi-agent mới — giữ nguyên [D4](../DecisionLog.md) ("không build agent — chạy trên lưng agent có sẵn").
- **Đổi cây taxonomy / id câu hỏi / nghĩa field = MAJOR** ([Versioning.md](../Core/Versioning.md)) → cập nhật [ConformanceMatrix](../Adapters/ConformanceMatrix.md) cùng commit.
- **Mỗi câu hỏi neo vào một ô doc** vẫn là luật vàng — ngoại lệ duy nhất được mở là câu `meta` (nâng cấp #3), phải đánh dấu loại rõ ràng, không phải "câu thiếu target_doc".
- **Phát sinh quyết định → ghi DecisionLog.** Đây là MAJOR thật (có code tiêu thụ rồi) → **bump 2.0.0**, không amend tại chỗ.

## Vì sao là MAJOR (v2.0.0), không phải MINOR
| Thay đổi | Vi phạm bất biến nào | Hệ quả |
|---|---|---|
| Mở `branch` khỏi `{core,web,mobile,hybrid}` | schema §2 `branch` enum đóng; Versioning §2 "đổi cây taxonomy" | MAJOR |
| Thêm hình-hài `cli` → file `07-*` mới | taxonomy cây đầu ra đổi | MAJOR + golden mới |
| Câu `meta` không có `target_doc` | schema §2 `target_doc` bắt buộc + luật vàng #4 | đổi schema câu hỏi |
| Tách câu chọn nhánh khỏi S6 | thêm id câu hỏi mới (id vĩnh viễn) | MAJOR-an toàn (thêm, không đổi nghĩa cũ) |

## Quyết định cần khoá trước (DecisionLog — IDs kế tiếp D21–D25)
> Hiện DecisionLog đã tới **D20**. Năm quyết định dưới ánh xạ 1-1 với 5 nâng cấp; viết ở **B1**.

| ID | Quyết định | Ghi chú quan hệ |
|---|---|---|
| **D21** | Mở `branch` thành tập **hình-hài dự án** mở (project-shape), không còn enum đóng. Thêm hình-hài `cli`/`tool` **đầu tiên**; mỗi shape có bộ câu nhánh riêng + biến thể `07-*` riêng. | Mở rộng [D13](../DecisionLog.md) (taxonomy tối giản) — KHÔNG đảo; vẫn gộp auth/monetization vào 05/07. |
| **D22** | Tách **bộ chọn hình-hài** khỏi S6 thành một câu core riêng; `branch` do câu này set (một chiều, đúng [D14](../DecisionLog.md)). | S6 quay về chỉ hỏi ràng buộc team/deadline/budget. |
| **D23** | Thêm loại câu hỏi `meta` (calibrate "giải thích kỹ vs đi nhanh") — **không neo doc**, chỉ set chế độ giải thích/độ push-back. Schema cho `target_doc: null` khi `kind: meta`. | Ngoại lệ có kiểm soát của luật vàng #4; không lưu vào docs (không gác cổng, không khảo sát). |
| **D24** | **Ranh giới multi-agent:** KHÔNG dùng multi-agent cho generation (giữ [D4](../DecisionLog.md)). Critic = **một role/pass phản biện trong agent sẵn có**, ép mạnh ở harness có hook, mềm ở rules-only. | Trả lời thẳng câu hỏi "tool có sơ sài so với swarm-agent không": chiều giá trị là *ràng buộc*, không phải *sản lượng*. |
| **D25** | Phân biệt với [D17](../DecisionLog.md): mở **hình-hài dự án** ≠ mở **doc enterprise** (ADR/test-plan). D17 vẫn Active. | Chống lẫn "mở rộng tốt" (phủ thêm loại dự án cho người mới) với "mở rộng đã hoãn" (file enterprise cho cùng một dự án). |

## Thứ tự chạy (có phụ thuộc)
```
B1 Quyết định (D21–D25)
   └─► B2 Khoá schema + taxonomy (branch mở, kind=meta, selector, file-map theo shape)
          ├─► B3 Spec Critic + Calibrate (Contract/adapter, nơi critic fire)
          └─► B4 Nội dung (script.yaml + tách câu + generalize cảnh báo "bẫy" + shape #1: cli)
                 └─► B5 Code (emit/schemas src/ + loaders/validator + golden cli + regen + tests)
                        └─► B6 Adapter+critic impl + calibrate wiring + QA sweep + ConformanceMatrix + bump 2.0.0
```
B2 và B3 cùng đụng `Adapters/*` và `Contract.md` nhưng **khác mục**: B2 sở hữu "Input lõi / schema câu hỏi"; B3 sở hữu "hành vi critic + calibrate". Làm B2 trước. **Contract ContractForAI chỉ viết SAU khi B1–B3 khoá xong** (đúng như FB5 viết contract sau FB1–4), đặt ở lane mới `ContractForAI/Core/v2-expansion/{B4,B5,B6}/`.

> **Lưu ý khớp nối (chốt khi viết contract):** trong pha thực thi, phần **schema-code B5a phải chạy TRƯỚC content B4a** — vì thêm `kind`/`meta`/branch-mở vào `script.yaml` sẽ rớt validator zod hiện tại. Và registry hình-hài cần một **file dữ liệu máy-đọc `shapes.yaml`** (mirror taxonomy.md, theo tiền lệ D15) vì runtime không parse markdown. Thứ tự thực thi chi tiết ở [v2-expansion/README.md](../ContractForAI/Core/v2-expansion/README.md), không phải B4→B5 tuyến tính như sơ đồ trên.

## Các batch

### B1 — Khoá 5 quyết định (decision-only, không code)
- **File:** `Design/DecisionLog.md` (D21–D25); ghi chú quan hệ với D4/D13/D14/D17.
- **Nghiệm thu:** đọc D21–D25 là biết rõ phương hướng từng nâng cấp + ranh giới multi-agent + phân biệt với D17; chưa đụng spec/code.

### B2 — Khoá schema + taxonomy (Lõi/spec)
- **File:** `Core/Schemas/interview-script.md` (mở `branch`; thêm `kind: anchored|meta`; `target_doc` nullable khi meta; cập nhật luật validate §6 + bất biến §7 + changelog); `Core/Schemas/state-schema.md` (`branch` là chuỗi-shape mở, vẫn một chiều); `Content/taxonomy.md` (bảng hình-hài → cây file, biến thể `07-*` theo shape; thêm `cli` → `07-distribution.md`); `Core/Versioning.md` (kế hoạch bump 2.0.0); `Adapters/ConformanceMatrix.md`.
- **Nghiệm thu:** schema diễn tả được ≥3 shape + câu meta + câu selector mà không mâu thuẫn; chưa đụng `script.yaml`/code.

### B3 — Spec Critic role + Calibrate (Adapter/spec)
- **File:** `Core/Contract.md` §3 (critic là pass trong INJECT, không phải actor mới); `Adapters/claude-code.md` + `Adapters/agents-md.md` (nơi critic fire — sau S3 scope + sau câu kiến trúc nhánh; bậc hook ép mạnh, bậc rules mềm); `ProductPRD.md` §định-vị (critic + đa-shape là điểm khác biệt); ghi rõ critic đọc gì, thách thức gì (scope creep, phức tạp ẩn — tổng quát hoá cảnh báo M2/M5 ra mọi shape).
- **Nghiệm thu:** một dev đọc xong biết critic chạy ở đâu, nói gì, và vì sao nó KHÔNG vi phạm lõi-béo-adapter-gầy/D4.

### B4 — Nội dung kịch bản + hình-hài #1 (Nội dung)
- **File:** `Content/interview-script/script.yaml` + `S0-S6-core.md` (tách câu chọn-shape; thêm câu meta-calibrate; S6 gọn lại); generalize bộ "cảnh báo bẫy" thành pattern theo shape; **bộ câu `cli` (~5 câu)** + `Content/doc-templates/07-distribution.md`; cập nhật README kịch bản.
- **Nghiệm thu:** chạy tay một phiên `cli` ra docs hợp lý; web/mobile/hybrid không hồi quy.

### B5 — Code engine (Lõi)
- **File:** `src/core/emit.ts` (branch mở + file-map theo shape + xử lý câu meta); `src/core/schemas/*` (branch/kind); loaders + validator; **golden `cli` mới** + regen golden do taxonomy đổi; toàn bộ test.
- **Nghiệm thu:** `npm test` xanh gồm golden cli mới; `typecheck`/`lint` sạch.

### B6 — Adapter + critic impl + QA + đóng mốc
- **File:** skill/adapter triển khai critic-pass + calibrate-mode; QA sweep nhất quán toàn `Design/` (wording, Glossary, reading order); `ConformanceMatrix` + `Versioning` chốt **2.0.0**; cập nhật `MasterRoadMap` + `DecisionLog` changelog.
- **Nghiệm thu:** v2.0.0 nhất quán, không link treo, ConformanceMatrix phản ánh đa-shape + critic.

## Quan hệ với Month 4 (ĐÃ CHỐT: hướng A — ghi D26)
v2.0.0 là overhaul kịch bản, trong khi Month 4 đang "đóng gói & ship v1 ra ngoài" (W13 xong, [W14A](../ContractForAI/Core/month4/W14/w14a_external_validation_real_diff_contract.md) đang BLOCKED). Quyết định (2026-06-29, **D26**):
- **✅ (A) v2 trước, ship sau** — dọn kịch bản cho đủ shape rồi mới đóng gói/mời người ngoài. Khớp linh cảm "chưa đủ hay để ra ngoài". Đánh đổi: lùi mốc "Đáng chia sẻ".
- **Hệ quả với Month 4:** [W14A](../ContractForAI/Core/month4/W14/w14a_external_validation_real_diff_contract.md) (validation người ngoài), W14B (định vị), và phần đóng gói W13D giữ trạng thái **hoãn tới sau v2** — không phải "BLOCKED chờ tuần này" mà "deferred post-v2". W16 tổng kết lùi tương ứng.
- **Hệ quả với B4:** vì ship *sau* nên không có data người-ngoài dẫn lựa chọn shape. **Shape #1 = `cli`/`tool`** chọn theo phán đoán: developer-tools demand cao, và chính là loại dự án người dùng nêu ra (CLI/extension/library). Extension/library/desktop mở sau theo nhu cầu thật.

## Cố ý KHÔNG làm (chống phình)
- KHÔNG multi-agent cho generation (D24).
- KHÔNG làm 5 shape cùng lúc — **một shape một lần theo nhu cầu thật** (cli trước; extension/library/desktop chỉ mở khi data đòi).
- KHÔNG mở doc enterprise (ADR/test-plan) — vẫn theo D17 (D25).
- KHÔNG biến câu meta-calibrate thành khảo sát ngành học/lý lịch — chỉ set chế độ giải thích.
