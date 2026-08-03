# V5 Feature-Journey Pilot Protocol (B18a)

> Trạng thái: **CHƯA CHẠY** (awaiting pilot). File này định nghĩa quy chuẩn thử nghiệm; **không** chứa số liệu pilot cho tới khi chạy thật và nộp artifact. Không được nâng claim "hỗ trợ build tới sản phẩm" trước khi bảng kết quả bên dưới được điền bằng dữ liệu thật (D47, mở rộng D40).
>
> **Sửa 2026-08-03 — hạ quy mô (quyết định chủ repo 2026-08-02):** bản gốc đòi ≥6 người ngoài nhóm
> phát triển × ≥2 quy mô × 2 harness. Quy mô thật cho lần chạy B1 của
> [MasterSequencingPlan.md](../MasterSequencingPlan.md): **self-pilot — 1 người (chủ repo/tác giả), 1
> quy mô, 1 harness (Claude Code)**. Xem Known limitations bên dưới — kết quả từ quy mô này **không**
> thoả điều kiện độc lập của D40 và **không** được dùng để nâng claim "hỗ trợ build tới sản phẩm" của
> D47. Bảng ≥6 người / ≥2 quy mô / 2 harness vẫn là đích **dài hạn** khi có pilot bên ngoài, không phải
> điều kiện chặn cho lần chạy B1 hiện tại.

## Mục tiêu
Kiểm chứng chặng **sau M0**: một người mới đi từ folder trống, qua skeleton, tới **hoàn thành trọn ≥1 feature Must thật** (không chỉ shell chạy được), với vòng review/break-task đóng.

## Đối tượng & phân bố (lần chạy B1 — self-pilot)
- **1 người**: chủ repo/tác giả tự chạy — không phải người ngoài nhóm phát triển.
- **1 quy mô**: nhỏ (CLI ít entity).
- **1 harness**: Claude Code (hard-gate).
- Đích dài hạn (chưa áp dụng cho lần chạy này): ≥6 người ngoài nhóm, ≥2 quy mô, cả 2 harness.

## Journey Rubric (mở rộng V3)
| Tiêu chí | Đạt | Không đạt |
|---|---|---|
| Hiểu hợp đồng active | Nêu đúng micro-task + allowed_paths của hợp đồng đang mở | Sửa lung tung ngoài interface hợp đồng |
| Tuân review/break-task | Sau feature verify, chạy review; làm hết break-task trước khi sang feature kế | Nhảy feature kế khi review chưa đóng |
| Không "done giả" | Feature-done chỉ khi break-task pass + review đóng | Báo done khi test còn đỏ |
| Sizing hợp lý | Số hợp đồng khớp quy mô, không ngợp | Quá nhiều/ít so với Must |

## Chỉ số ghi nhận (điền sau khi chạy)
| Participant | Band | Adapter | Scale | Feature Must hoàn thành | Time-to-first-feature | #Hợp đồng sinh | #Break-task | Review đóng | Final | Artifact ID |
|---|---|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — | — | — | — |

> Bảng để trống có chủ đích. Điền bằng raw ẩn danh + replay artifact tái kiểm được, giống [v4-pilot-raw.md](v4-pilot-raw.md).

## Semantic mutation (bắt buộc)
Chèn hợp đồng sai và xác nhận validator/review bắt được:
1. `interfaces[].path` ngoài Conventions → `validateContract` fail.
2. `verification` chỉ `file-exists` cho task implementation → fail.
3. trace-link Must→skeleton khi đã có feature task → `validatePlan` fail.
4. Đóng review khi break-task chưa xong → `closeFeatureReview` throw (fail-closed).

## Bằng chứng máy đã có (không thay pilot người)
Cơ chế feature-journey được replay tự động, mock-free tại
[`test/replay/featureJourneyReplay.test.ts`](../../../test/replay/featureJourneyReplay.test.ts):
synth → compile → validate → review(sạch/bẩn) → feature-done fail-closed. Đây là
điều kiện cần (mechanics đúng), **không** phải điều kiện đủ (trải nghiệm người mới).

## Known limitations (công bố trước)
- **Cỡ mẫu 1, người chạy là tác giả** (lần chạy B1) — không thoả điều kiện độc lập của
  [D40](../../DecisionLog.md); kết quả không được dùng để nâng claim "hỗ trợ build tới sản phẩm" của
  [D47](../../DecisionLog.md). Chỉ là bằng chứng cơ chế chạy được trên một journey thật, không phải
  bằng chứng trải nghiệm người mới đa dạng.
- Cỡ mẫu nhỏ, sandbox cục bộ; không đại diện mọi nhóm dev.
- Chỉ chạy Claude Code (hard-gate) ở lần này; Codex (soft-gate) chưa được pilot — người dùng cố ý nhảy
  review vẫn nhảy được trên Codex, chưa kiểm chứng ở quy mô này.
- Sizing heuristic hiệu chỉnh trên fixture; số ngưỡng có thể lệch với dự án thật.
