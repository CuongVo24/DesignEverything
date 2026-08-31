# 📖 GUIDELINE — BẢN ĐỒ DỰ ÁN DESIGNEVERYTHING

> File này là **cửa vào duy nhất** của bộ tài liệu `Design/`. Đọc trước khi đọc bất kỳ file nào
> khác — kể cả khi bạn chỉ cần sửa một dòng code.
>
> Cây `Design/` của DesignEverything **vừa là tài liệu nền móng, vừa là bản mẫu vàng** mà chính sản
> phẩm này hướng tới sinh ra (dogfooding). Cấu trúc của file này là bản mẫu cho `docs/Guideline.md`
> mà lane 9.0.0 sẽ emit vào dự án người dùng — xem [RoadMap/V9-DocDepthPlan.md](RoadMap/V9-DocDepthPlan.md).

## 🤖 NẾU BẠN LÀ AI AGENT ĐƯỢC GIAO VIẾT CODE

Đọc [ContractForAI/EXECUTOR_RUNBOOK.md](ContractForAI/EXECUTOR_RUNBOOK.md) trước, rồi làm đúng tám
bước trong đó. Không cần đọc hết file này.

## ⏱️ FIRST 10 MINUTES

Chỉ có 10 phút trước khi bắt tay? Đọc đúng thứ tự này:

1. [VibeCode.md](VibeCode.md) — **Khung Kim Cô**: luật bắt buộc cho mọi agent. Đọc trước tiên.
2. [ProductPRD.md](ProductPRD.md) — sản phẩm là gì, cho ai, thắng bằng cái gì.
3. [Core/Contract.md](Core/Contract.md) — hợp đồng Lõi↔Adapter, xương sống kiến trúc.
4. [Content/artifact-catalog.yaml](Content/artifact-catalog.yaml) — danh mục **mọi** artifact được
   phép sinh ra, kèm path/tier/shape.
5. [RoadMap/LANE_INDEX.md](RoadMap/LANE_INDEX.md) — đang ở lane nào, việc gì còn treo.

Đủ để bắt đầu. Phần còn lại đọc dần theo nhu cầu.

## 🌳 CẤU TRÚC THƯ MỤC

| Thư mục | Vai trò | Đọc khi nào | Tính chất |
|---|---|---|---|
| [`Core/`](Core/) | Hợp đồng Lõi↔Adapter, schema, version, anchor format | Trước khi đụng bất kỳ schema nào | **Portable, viết một lần** |
| [`Content/`](Content/) | Kịch bản phỏng vấn, `shapes.yaml`, template doc, taxonomy, catalog, golden | Khi sửa nội dung phương pháp | **Đây là sản phẩm** — runtime load-bearing |
| [`Adapters/`](Adapters/) | Cách phủ từng harness + [ConformanceMatrix](Adapters/ConformanceMatrix.md) | Khi sửa Claude Code / Codex / AGENTS.md | **Gầy, xuống bậc theo nền tảng** |
| [`Conventions/`](Conventions/) | [TechStack](Conventions/TechStack.md), chuẩn code/git, [TestStrategy](Conventions/TestStrategy.md) | Trước khi viết dòng code đầu tiên | Quy ước |
| [`ContractForAI/`](ContractForAI/) | **129 hợp đồng micro-task** + luật viết + mục lục + runbook | Trước khi giao việc cho AI viết code | Cơ chế chất lượng cốt lõi |
| [`RoadMap/`](RoadMap/) | Lộ trình, plan từng lane, evidence, release note | Khi cần biết đang ở đâu | Kế hoạch |

> `Design/Content/` **và** `Design/Core/Schemas/` được engine nạp lúc chạy, và `Design/Content` nằm
> trong `package.json` `files` (ship theo npm). **Không move, không đổi tên.**

## 📌 BỐN FILE KHOÁ CỨNG — KHÔNG BAO GIỜ TỰ CHẾ

| Cần gì | Tra ở đâu | Không có trong đó thì |
|---|---|---|
| Ranh giới Lõi↔Adapter, adapter được làm gì | [Core/Contract.md](Core/Contract.md) | Dừng, sửa tài liệu trước, code sau |
| Artifact nào được sinh, ở path nào, tier/shape nào | [Content/artifact-catalog.yaml](Content/artifact-catalog.yaml) | Dừng — thêm vào catalog trước, đừng ghi file lạ |
| Câu hỏi phỏng vấn, id, slot, gate khai báo | [Content/interview-script/script.yaml](Content/interview-script/script.yaml) | Dừng, bổ sung kịch bản trước |
| Shape của state phỏng vấn/thực thi | [Core/Schemas/state-schema.md](Core/Schemas/state-schema.md) | Dừng, hỏi người review |

Id câu hỏi là **vĩnh viễn** — không bao giờ tái dùng một id cho nghĩa khác
([Core/Versioning.md](Core/Versioning.md) §3, liên quan anchor truy vết).

## 🧭 ĐANG Ở ĐÂU

| Cần gì | File |
|---|---|
| Trạng thái thật của mọi lane (bảng gate canonical) | [RoadMap/MasterSequencingPlan.md](RoadMap/MasterSequencingPlan.md) |
| Bản đồ lane: plan ↔ contract ↔ evidence ↔ version | [RoadMap/LANE_INDEX.md](RoadMap/LANE_INDEX.md) |
| Mọi contract + status thật | [ContractForAI/CONTRACT_INDEX.md](ContractForAI/CONTRACT_INDEX.md) |
| Quyết định đã chốt kèm lý do | [DecisionLog.md](DecisionLog.md) |
| Từ vựng chuẩn | [Glossary.md](Glossary.md) |

Version hiện tại: **8.1.0** (RC). Lane đang mở: **9.0.0 — Doc Depth**
([RoadMap/V9-DocDepthPlan.md](RoadMap/V9-DocDepthPlan.md)).

## 🔒 GIỮ TÀI LIỆU KHỎI MỤC

```bash
npm test
```

Chuỗi này chạy `check-version-sync` → `check-matrix` → **`check-docs`** → `typecheck:all` → `vitest`.
[`scripts/check-docs.mjs`](../scripts/check-docs.mjs) đối chiếu: mọi link tương đối phải resolve;
mọi contract phải có đúng một dòng trong `CONTRACT_INDEX.md` **khớp status thật**; mọi lane phải có
dòng trong `LANE_INDEX.md`; `Versioning.md` phải có hàng cho version hiện tại; không version đã phát
hành nào còn bị đánh dấu "chưa cắt".

Nó đỏ thì **sửa tài liệu, đừng sửa script cho nó xanh**.

> Kỷ luật sống còn: **Lõi phải béo, Adapter phải gầy.**
