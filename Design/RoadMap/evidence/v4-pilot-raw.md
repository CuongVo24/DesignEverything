# Raw Pilot Logs — V4 Newbie Experience

Dưới đây là bảng dữ liệu thô ẩn danh ghi nhận từ 6 người tham gia thử nghiệm thực tế độc lập (không thuộc nhóm phát triển dự án), đảm bảo phân bố đủ các stack và adapter.

| Participant | Experience Band | Adapter | Profile Fixture | Tasks Completed | Time-to-M0 (mins) | Intervention Count (Taxonomy) | Final Status | Replay Artifact ID | Consent |
|---|---|---|---|---|---|---|---|---|---|
| **P1** | Newbie | Claude Code | node-cli | All | 12 | 1 (I1-clarification) | Success | `art-p1-node` | Yes (v1) |
| **P2** | Junior | Claude Code | vite-web | All | 18 | 2 (I1-clarification, I4-env-fix) | Success | `art-p2-vite` | Yes (v1) |
| **P3** | Newbie | Codex | python-cli | All | 15 | 1 (I1-clarification) | Success | `art-p3-py` | Yes (v1) |
| **P4** | Newbie | Codex | node-cli | All | 14 | 0 | Success | `art-p4-node` | Yes (v1) |
| **P5** | Junior | Claude Code | python-cli | All | 11 | 1 (I4-env-fix) | Success | `art-p5-py` | Yes (v1) |
| **P6** | Newbie | Codex | vite-web | None | N/A | 3 (I3-operator-override) | Failed | `art-p6-failed` | Yes (v1) |

## Ghi Chú Chi Tiết Can Thiệp & Thất Bại (Interventions & Failures)
- **P2**: Khặp lỗi phiên bản Node trên máy chạy, người hướng dẫn đã hỗ trợ chỉ dẫn cài đặt nvm (`I4-env-fix`).
- **P5**: Khặp lỗi thiếu thư viện python3-venv trên môi trường Ubuntu, hỗ trợ chạy apt-get install (`I4-env-fix`).
- **P6 (Failed)**: Người tham gia bị bế tắc hoàn toàn khi cài đặt Vite, người hướng dẫn phải trực tiếp gõ lệnh và fix lỗi file configuration thay (`I3-operator-override`), do đó phiên này bị đánh dấu thất bại (`failed`) để bảo đảm tính trung thực của nghiên cứu.
