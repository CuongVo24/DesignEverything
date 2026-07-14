# Evaluation Report — V4 Newbie Experience Gating

Tài liệu này tổng hợp kết quả đánh giá thử nghiệm thực tế (Pilot Evaluation) về khả năng dẫn dắt người mới (newbie) vượt qua mốc M0 dưới sự bảo vệ của các cổng an toàn đa runtime.

## 1. Kết Quả Tổng Hợp (Aggregate Report)

### Theo Môi Trường Triển Khai (Harness)
| Môi trường (Harness) | Số phiên (Sample Size) | Tỷ lệ hoàn thành | Thời gian trung bình | Tần suất can thiệp trung bình | Tỷ lệ thất bại |
|---|---|---|---|---|---|
| **Claude Code** (Hard Gate) | 3 | 100.0% | 13.6 phút | 1.3 lần / phiên | 0.0% |
| **Codex Plugin** (Soft Gate) | 3 | 66.7% | 14.5 phút | 1.3 lần / phiên | 33.3% |

### Theo Stack Công Nghệ (Profile)
| Stack công nghệ | Số phiên (Sample Size) | Tỷ lệ hoàn thành | Thời gian trung bình | Tỷ lệ can thiệp | Trạng thái chốt chặn (Enforcement) |
|---|---|---|---|---|---|
| **node-cli** | 2 | 100% | 13.0 phút | 0.5 lần / phiên | Hard Gate (Claude) / Soft (Codex) |
| **vite-web** | 2 | 50% | 18.0 phút | 2.5 lần / phiên | Hard Gate (Claude) / Soft (Codex) |
| **python-cli** | 2 | 100% | 13.0 phút | 1.0 lần / phiên | Hard Gate (Claude) / Soft (Codex) |

## 2. Phân Tích Độ Phủ & Trạng Thái Bảo Vệ (Parity & Gaps)
- **Claude Code**: Hoạt động dưới dạng **Hard Enforcement**. Mọi vi phạm về allowed paths hoặc command đều bị chặn cứng ở mức hook trước khi tool được thực thi.
- **Codex Plugin**: Hoạt động dưới dạng **Soft Enforcement**. Đưa ra cảnh báo trực quan cho người dùng thay vì chặn tiến trình, phù hợp với các IDE mở rộng.

## 3. Các Giới Hạn Đã Biết (Known Limitations)
- **Cỡ mẫu thử nghiệm nhỏ**: Thử nghiệm được tiến hành trên quy mô nhỏ gồm 6 người tham gia. Kết quả không đại diện cho tất cả các nhóm lập trình viên khác nhau.
- **Môi trường Sandbox cục bộ**: Chưa chạy thử nghiệm trên cloud bypass hook trust. Môi trường CI sử dụng các mock-free replay được cấu hình cục bộ để xác thực tính toàn vẹn.

## 4. Tài Liệu Tham Chiếu
- Quy chuẩn thử nghiệm: [v4-pilot-protocol.md](evidence/v4-pilot-protocol.md)
- Dữ liệu thô ẩn danh: [v4-pilot-raw.md](evidence/v4-pilot-raw.md)
- Báo cáo chạy đối chiếu runtime: [v4-replay-report.md](evidence/v4-replay-report.md)
