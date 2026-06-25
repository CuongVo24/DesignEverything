## Tại sao cần file này
File này kéo chuyện phát hành mobile về đúng thực tế: có bản thử, ký app, review và phân phối. Nếu bỏ qua nó, người mới rất dễ ảo tưởng rằng chỉ cần code xong là đã có app trên store.

## Mục Tiêu Phát Hành Giai Đoạn Đầu
Mục tiêu trước mắt là đưa được bản thử cho một nhóm nhỏ người dùng thật trong phòng trọ để kiểm tra luồng ghi và chia tiền.
<!-- anchor: id=07-release/release-goal  src=apps/mobile/src/features/release/release.ts::releaseGoal  rev=  status=planned -->

## Kênh Phân Phối Thử Hoặc Phát Hành
Ưu tiên TestFlight hoặc internal testing trước khi nghĩ tới store public. Đây là đường phát hành an toàn hơn cho MVP vì cho phép sửa nhanh theo phản hồi thật.
<!-- anchor: id=07-release/distribution-strategy  src=apps/mobile/src/features/release/release.ts::distributionStrategy  rev=  status=planned -->

## Chuẩn Bị Cho Store
Cần tính tới ký app, metadata, quy trình review, và khả năng bị từ chối nếu quyền thiết bị hoặc mô tả phát hành chưa rõ. Đây là việc tách biệt với coding, không nên để đến phút cuối mới nghĩ.
<!-- anchor: id=07-release/store-readiness  src=apps/mobile/src/features/release/release.ts::storeReadinessNotes  rev=  status=planned -->

## Kiếm Tiền Hoặc Chưa Kiếm Tiền
MVP chưa đặt nặng kiếm tiền. Nếu sau này cần thu phí trong app, hướng mặc định là in-app purchase và phải chấp nhận phí nền tảng trước khi đưa vào scope thật.
<!-- anchor: id=07-release/monetization-strategy  src=apps/mobile/src/features/release/release.ts::monetizationStrategy  rev=  status=planned -->
