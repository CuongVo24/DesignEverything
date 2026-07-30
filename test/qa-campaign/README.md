# Chiến dịch QA đa phiên — DesignEverything

Mục tiêu của chiến dịch này là kiểm thử sản phẩm như một tester độc lập: không chỉ chạy lại test có sẵn, mà còn đối chiếu lời hứa trong tài liệu với hành vi thật, tìm ca biên mới, thu bằng chứng tái hiện và phân loại rủi ro.

## Nguyên tắc chung

1. Coordinator khóa một `CAMPAIGN_SHA` trước khi dispatch. Tất cả lane phải test cùng SHA hoặc cùng một snapshot có digest được ghi lại.
2. Mỗi phiên dùng Codex worktree riêng hoặc một bản copy chỉ dành cho test. Không chạy release campaign trên working tree đang được phiên khác sửa source.
3. Mỗi phiên chỉ nhận một lane và chỉ ghi báo cáo vào file riêng trong `findings/`.
4. Không sửa source, test có sẵn, tài liệu sản phẩm hoặc file do phiên khác tạo.
5. Không chạy test phá hoại trên repo gốc. Mọi cài đặt, giả lập hỏng file và dữ liệu thử phải nằm trong thư mục tạm của hệ điều hành.
6. Trước khi kết luận lỗi, chạy lại ca tái hiện ít nhất hai lần. Nếu lỗi chập chờn, ghi rõ số lần fail/tổng số lần chạy.
7. “Test pass” không đồng nghĩa “không có lỗi”. Mỗi lane phải thực hiện các probe mới ngoài test có sẵn.
8. Không sửa lỗi trong chiến dịch này. Chỉ ghi nhận, thu bằng chứng và đề xuất phạm vi ảnh hưởng.
9. Mọi lệnh shell trong repo tuân theo `AGENTS.md`, gồm tiền tố `rtk`.

Nếu buộc phải test một snapshot có thay đổi chưa commit, coordinator phải ngừng các phiên đang sửa source, chụp danh sách file + digest và phát một bản copy bất biến cho từng tester. Báo cáo từ một working tree thay đổi giữa lúc chạy chỉ có giá trị exploratory, không được dùng làm release gate.

## Phân lane

| Lane | Mission | Trọng tâm | Có thể chạy song song |
|---|---|---|---|
| QA-01 | [Baseline và chất lượng tĩnh](01-baseline-static.md) | build, typecheck, lint, full suite, tính lặp lại | Có |
| QA-02 | [Core, state và transaction](02-core-state-transactions.md) | invariant, lock, crash recovery, emit atomicity | Có |
| QA-03 | [CLI, adapter và security boundary](03-cli-adapter-security.md) | protocol, parity, token, shell bypass, fail-closed | Có |
| QA-04 | [Installer, package và portability](04-install-package-portability.md) | npm tarball, install/repair, relocate, tamper | Có |
| QA-05 | [Hành trình người dùng và chất lượng output](05-user-journeys-content.md) | web/mobile/CLI/hybrid, newbie UX, docs sinh ra | Có |
| QA-06 | [Release truth và tương thích](06-release-truth-compatibility.md) | version, docs, claims, Node/OS/path assumptions | Có |

QA-01 nên hoàn thành sớm để cung cấp baseline, nhưng không chặn các lane khác. Nếu baseline đang fail, các lane vẫn tiếp tục và phân biệt rõ lỗi nền với lỗi riêng của lane.

## Cách giao cho một phiên mới

Dán nguyên prompt sau và thay `QA-0X`:

```text
Bạn là tester độc lập trong chiến dịch QA của repo E:\DesignEverything.
Chỉ test CAMPAIGN_SHA/snapshot do coordinator ghi trong lệnh giao việc. Nếu git
status hoặc HEAD đổi ngoài file báo cáo của bạn, dừng lane và báo SNAPSHOT_DRIFT.
Đọc đầy đủ:
1. AGENTS.md của repo
2. test/qa-campaign/README.md
3. test/qa-campaign/QA-0X tương ứng
4. test/qa-campaign/report-template.md

Chạy toàn bộ mission được giao. Không sửa source hay test hiện có. Mỗi lỗi phải
có lệnh/bước tái hiện, expected, actual, bằng chứng, severity và confidence.
Ghi duy nhất báo cáo của bạn vào:
test/qa-campaign/findings/QA-0X-<ten-phien>.md

Kết thúc bằng một tóm tắt: PASS/FAIL/BLOCKED, số finding theo severity, các lệnh
đã chạy, và đường dẫn báo cáo. Không tự sửa lỗi.
```

## Chuẩn severity

| Mức | Ý nghĩa |
|---|---|
| S0 — Blocker | Mất dữ liệu, bypass ranh giới an toàn nghiêm trọng, không thể cài/chạy sản phẩm trên đường chính |
| S1 — Critical | Luồng chính sai hoặc fail-open; không có workaround hợp lý |
| S2 — Major | Tính năng quan trọng sai, parity vỡ, recovery không đáng tin; có workaround |
| S3 — Minor | UX/message/docs gây hiểu nhầm hoặc ca biên ít gặp |
| S4 — Observation | Nợ test, rủi ro chưa chứng minh thành lỗi, đề xuất cải thiện |

## Chuẩn kết luận

- `PASS`: mọi check bắt buộc chạy được và không có finding S0–S2.
- `PASS_WITH_FINDINGS`: không có S0/S1 nhưng có S2–S4.
- `FAIL`: có ít nhất một finding S0 hoặc S1 đã tái hiện ổn định.
- `BLOCKED`: môi trường không cho phép hoàn thành mission; phải ghi chính xác blocker và phần đã chạy.
- `NOT_RUN`: chưa được giao hoặc chưa bắt đầu.

Coordinator hợp nhất kết quả theo [00-coordinator.md](00-coordinator.md), loại trùng theo nguyên nhân gốc thay vì theo thông báo lỗi.
