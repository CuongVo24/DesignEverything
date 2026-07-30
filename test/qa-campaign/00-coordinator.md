# Runbook cho coordinator

## Trước khi dispatch

1. Khóa target:

   ```powershell
   rtk git rev-parse HEAD
   rtk git status --short
   rtk node --version
   rtk npm --version
   rtk codegraph status
   ```

2. Chọn một trong hai chế độ:

   - `COMMIT`: mỗi phiên chạy trong worktree riêng tại cùng `CAMPAIGN_SHA`.
   - `DIRTY_SNAPSHOT`: dừng mọi source writer, copy snapshot bất biến, ghi digest của toàn bộ file tracked + untracked trong scope.

3. Ghi commit/branch, chế độ snapshot và các file bẩn có sẵn. Không quy finding cho thay đổi chưa commit nếu chưa chứng minh quan hệ nhân quả.
4. Giao mỗi lane cho đúng một phiên. Nếu cần chạy lặp độc lập, dùng hậu tố `-A`, `-B` và yêu cầu không đọc báo cáo của nhau trước khi hoàn tất.
5. Nhắc các phiên không sửa source và không dùng chung một file báo cáo.

Nếu `HEAD`, tracked source hoặc test file đổi trong lúc campaign chạy, đánh dấu `SNAPSHOT_DRIFT`, dừng dùng kết quả mới làm release evidence và dispatch lại trên snapshot sạch. Chỉ file báo cáo riêng của tester được phép xuất hiện thêm.

## Trong khi chạy

- Nhận update theo mốc: `SETUP`, `TARGETED TESTS`, `NOVEL PROBES`, `REPORT`.
- Kiểm tra `HEAD` và `git status` ở mỗi mốc để phát hiện snapshot drift.
- Nếu một lane phát hiện S0/S1, yêu cầu một phiên khác tái hiện mù chỉ từ bước tái hiện; không gửi kết luận ban đầu.
- Nếu hai lane cùng chạm một vùng, coordinator giữ cả hai báo cáo thô rồi hợp nhất sau.
- Một test có sẵn fail chỉ là bằng chứng triệu chứng. Finding phải nêu tác động sản phẩm và nguyên nhân khả dĩ.
- Không cho phiên tester chuyển sang sửa lỗi. Việc fix thuộc chiến dịch riêng sau triage.

## Kiểm tra chất lượng finding

Một finding chỉ được nhận nếu có đủ:

- ID duy nhất, tiêu đề theo hành vi.
- Môi trường và trạng thái repo.
- Preconditions.
- Bước/lệnh tái hiện tối thiểu.
- Expected và actual tách biệt.
- Bằng chứng: output rút gọn, exit code, file/digest hoặc stack trace.
- Tỷ lệ tái hiện.
- Severity kèm lý do.
- Phạm vi ảnh hưởng và workaround nếu biết.
- Confidence: high/medium/low.

Thiếu expected/actual hoặc không tái hiện lần hai thì hạ thành `S4 — Observation`.

## De-duplicate

Hai finding là trùng khi cùng nguyên nhân gốc và cùng hướng khắc phục, kể cả thông báo lỗi khác nhau. Giữ báo cáo có bằng chứng mạnh hơn làm primary; báo cáo còn lại thành `Corroborates`.

Hai finding không trùng nếu:

- cùng module nhưng vi phạm invariant khác nhau;
- cùng thông báo nhưng xảy ra ở ranh giới khác nhau;
- cùng nguyên nhân nhưng tác động security/data-loss khác biệt đáng kể.

## Release gate đề xuất

- Chặn release khi có S0/S1 mở.
- Chặn release khi full suite, build bundle, packaging hoặc installed-runtime lane không chạy được.
- S2 cần owner và quyết định chấp nhận rủi ro rõ ràng.
- S3/S4 có thể đưa backlog nhưng phải giữ bằng chứng.

## Báo cáo hợp nhất

Coordinator tạo `findings/CONSOLIDATED.md` với:

1. Commit, môi trường, thời gian và lane đã chạy.
2. Kết luận release: `GO`, `GO_WITH_RISK`, `NO_GO`.
3. Bảng finding đã de-duplicate, sắp theo severity.
4. Coverage map: lời hứa sản phẩm → lane → bằng chứng.
5. Danh sách phần chưa test và residual risk.
6. Đề xuất thứ tự sửa và regression test cần bổ sung.
