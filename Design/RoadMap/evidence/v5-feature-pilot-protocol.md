# V5 Feature-Journey Pilot Protocol (B18a)

> Trạng thái: **CHƯA CHẠY** (awaiting pilot). File này định nghĩa quy chuẩn thử nghiệm; **không** chứa số liệu pilot cho tới khi có người ngoài tác giả chạy thật và nộp artifact. Không được nâng claim "hỗ trợ build tới sản phẩm" trước khi bảng kết quả bên dưới được điền bằng dữ liệu thật (D47, mở rộng D40).

## Mục tiêu
Kiểm chứng chặng **sau M0**: một người mới đi từ folder trống, qua skeleton, tới **hoàn thành trọn ≥1 feature Must thật** (không chỉ shell chạy được), với vòng review/break-task đóng.

## Đối tượng & phân bố
- ≥6 người ngoài nhóm phát triển, phủ cả Newbie và Junior.
- ≥2 quy mô dự án: **nhỏ** (CLI ít entity) và **vừa** (web/CLI data-model rộng).
- Cả hai harness: Claude Code (hard-gate) và Codex (soft-gate).

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
- Cỡ mẫu nhỏ, sandbox cục bộ; không đại diện mọi nhóm dev.
- Codex là soft-gate cho vòng review; người dùng cố ý nhảy vẫn nhảy được.
- Sizing heuristic hiệu chỉnh trên fixture; số ngưỡng có thể lệch với dự án thật.
