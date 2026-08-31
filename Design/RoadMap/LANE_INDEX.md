# LANE INDEX — mỗi lane một dòng

> Bản đồ gom bốn mảnh của một lane về một chỗ: **plan** (TaskBrief nguồn) · **contract dir** ·
> **evidence** · **version phát hành**. Danh sách contract chi tiết nằm ở
> [../ContractForAI/CONTRACT_INDEX.md](../ContractForAI/CONTRACT_INDEX.md); trình tự gate nằm ở
> [MasterSequencingPlan.md](MasterSequencingPlan.md).

## Tại sao cần file này

Tài liệu của một lane bị rải qua ba tới bốn thư mục: plan ở `RoadMap/`, contract ở
`ContractForAI/Core/`, số đo ở `RoadMap/evidence/`, release note lại ở `RoadMap/`. Không có chỗ nào
nối chúng lại, nên mở `RoadMap/` ra chỉ thấy 18 file rời tên na ná nhau và không biết cái nào còn
sống. Cảm giác "quá nhiều lane, mất kiểm soát" đến từ đó — **không phải từ số lượng lane**, mà từ
việc không có mục lục.

`scripts/check-docs.mjs` (chạy trong `npm test`) giữ bảng này khớp: mọi thư mục `Core/v*/` phải có
một dòng ở đây, và mọi dòng phải trỏ tới thư mục có thật.

## Lane theo version

| Lane | Plan (TaskBrief nguồn) | Contract dir | Evidence | Version | Trạng thái |
|---|---|---|---|---|---|
| `month1` | [Month1/](Month1/) `Week-01..04` | [Core/month1/](../ContractForAI/Core/month1/) | — | 1.0.0 | Đóng |
| `month2` | [Month2/](Month2/) `Week-05..08` | [Core/month2/](../ContractForAI/Core/month2/) | [Month2/v1-release-note.md](Month2/v1-release-note.md) | 1.0.0 | Đóng |
| `month3` | [Month3/](Month3/) `Week-09..12` | [Core/month3/](../ContractForAI/Core/month3/) | [Month3/dogfood/](Month3/dogfood/) (proj-01..03) | — | Đóng |
| `month4` | [Month4/](Month4/) `Week-13..16` | [Core/month4/](../ContractForAI/Core/month4/) | — | — | Đóng |
| `break_task` | — (sinh từ review, xem [CONTRACT_STRUCTURE_RULE §7](../ContractForAI/CONTRACT_STRUCTURE_RULE.md)) | [Core/break_task/](../ContractForAI/Core/break_task/) | — | — | Đóng |
| `v1-fix-bugs` | [Core/v1-fix-bugs/plan-v1-fix.md](../ContractForAI/Core/v1-fix-bugs/plan-v1-fix.md) · [RemediationPlan.md](RemediationPlan.md) | [Core/v1-fix-bugs/](../ContractForAI/Core/v1-fix-bugs/) | [v1-fix-bugs-evaluation-report.md](v1-fix-bugs-evaluation-report.md) · [v7-release-note.md](v7-release-note.md) | 7.0.0 | **GA** 2026-08-10 |
| `v2-expansion` | [V2-ExpansionPlan.md](V2-ExpansionPlan.md) | [Core/v2-expansion/](../ContractForAI/Core/v2-expansion/) | — | 2.0.0 | Đóng |
| `v3-expansion` | [V3-ExecutionExpansionPlan.md](V3-ExecutionExpansionPlan.md) | [Core/v3-expansion/](../ContractForAI/Core/v3-expansion/) | [v3-evaluation-report.md](v3-evaluation-report.md) · [V3-PostImplementationReview.md](V3-PostImplementationReview.md) | 4.0.0 | Đóng |
| `v4-expansion` | [V4-NewbieExpansionPlan.md](V4-NewbieExpansionPlan.md) | [Core/v4-expansion/](../ContractForAI/Core/v4-expansion/) | [v4-newbie-evaluation-report.md](v4-newbie-evaluation-report.md) · [evidence/v4-pilot-protocol.md](evidence/v4-pilot-protocol.md) · [evidence/v4-replay-report.md](evidence/v4-replay-report.md) | 5.0.0 | Đóng |
| `v5-expansion` | [V5-ContractSynthesisPlan.md](V5-ContractSynthesisPlan.md) · [V5-B16b-sketch.md](V5-B16b-sketch.md) | [Core/v5-expansion/](../ContractForAI/Core/v5-expansion/) | [evidence/v5-feature-pilot-protocol.md](evidence/v5-feature-pilot-protocol.md) — **bảng số đo còn trống** | 6.0.0 | Đóng (pilot B18a chưa chạy) |
| `v6-expansion` | [Core/v6-expansion/V6-DetailedDesignPlan.md](../ContractForAI/Core/v6-expansion/V6-DetailedDesignPlan.md) | [Core/v6-expansion/](../ContractForAI/Core/v6-expansion/) | [evidence/v6-tier2-eval.md](evidence/v6-tier2-eval.md) | 8.0.0 | **GA** 2026-08-10 |
| `v7-expansion` | [InteractiveQuestionCardsPlan.md](InteractiveQuestionCardsPlan.md) | [Core/v7-expansion/](../ContractForAI/Core/v7-expansion/) | [evidence/interactive-cards-turn-count-report.md](evidence/interactive-cards-turn-count-report.md) · [evidence/r-spike-userpromptsubmit-log.md](evidence/r-spike-userpromptsubmit-log.md) · [v8.1-release-note.md](v8.1-release-note.md) | 8.1.0 | **RC** — R-spike còn mở |
| `v8-hotfix` | — (chỉ có Gate D1 ở [MasterSequencingPlan.md](MasterSequencingPlan.md)) | [Core/v8-hotfix/](../ContractForAI/Core/v8-hotfix/) | — | 8.1.1 | Contract DONE, **version chưa cắt** |
| `v8-expansion` | [InterviewCadencePlan.md](InterviewCadencePlan.md) | [Core/v8-expansion/](../ContractForAI/Core/v8-expansion/) | [evidence/interview-cadence-turn-count-report.md](evidence/interview-cadence-turn-count-report.md) | 8.2.0 | Contract DONE, **version chưa cắt** |
| `v9-expansion` | [V9-DocDepthPlan.md](V9-DocDepthPlan.md) | [Core/v9-expansion/](../ContractForAI/Core/v9-expansion/README.md) | — | 9.0.0 | **MỞ** 2026-08-31 — 6/6 contract `WAITING_FOR_APPROVAL`, chờ duyệt D62–D67 |

## Kế hoạch xuyên lane (không thuộc lane nào)

| File | Vai trò |
|---|---|
| [MasterRoadMap.md](MasterRoadMap.md) | Mốc thời gian & phạm vi tổng |
| [MasterSequencingPlan.md](MasterSequencingPlan.md) | **Bảng gate canonical** — trạng thái thật của mọi lane đang chạy |
| [ReleaseReadinessPlan.md](ReleaseReadinessPlan.md) | RB-01..RB-08, nợ phát hành |
| [ContentFillPlan.md](ContentFillPlan.md) | Kế hoạch lấp nội dung kịch bản phỏng vấn |

## Việc còn treo (không lane nào đang đẩy)

| Việc | Gate | Vì sao chưa đóng |
|---|---|---|
| R-spike `UserPromptSubmit` | C3 | Cần một phiên Claude Code thật; probe đã dựng ở `Core/v7-expansion/r-spike-userpromptsubmit-probe.md`, chờ log thật |
| Pilot B18a (feature journey) | B1 | Cần agent build trọn 1 feature thật; bảng số đo `evidence/v5-feature-pilot-protocol.md` còn trống, không giả lập |
| RB-08 (drift docs onboarding) | B0-2 | 3/5 mục máy kiểm xanh; còn quickstart walkthrough + dòng ConformanceMatrix |
| D49–D52 chưa có dòng trong DecisionLog | B2 | Xem ghi chú giữ chỗ ở [../DecisionLog.md](../DecisionLog.md) |

## Hai lane thiếu README

`v8-hotfix` và `v8-expansion` là hai lane duy nhất **không có `README.md` riêng** — trạng thái của
chúng chỉ sống trong `MasterSequencingPlan.md` và `InterviewCadencePlan.md`. Đây là lý do lane 8.2
khó tra: không có cửa vào ở đúng thư mục contract. Lane mới bắt buộc có README (xem
[CONTRACT_STRUCTURE_RULE.md](../ContractForAI/CONTRACT_STRUCTURE_RULE.md) §1).
