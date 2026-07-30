# QA-06 — Release truth và tương thích

## Mục tiêu

Kiểm tra mọi claim phát hành, version, tài liệu vận hành và giới hạn tương thích có phản ánh đúng runtime hiện tại.

## Check bắt buộc

```powershell
rtk node scripts/check-version-sync.mjs
rtk node scripts/check-matrix.mjs
rtk node scripts/check-v4-claims.mjs
rtk npx vitest run test/docs
rtk npx vitest run test/replay/checkV4Claims.test.ts test/replay/crossRuntimeReplay.test.ts
rtk npm pack --dry-run
```

## Đối chiếu bắt buộc

- Version trong package, runtime, docs, manifests và install output.
- README/quickstart/runbook dùng đúng command và đúng tên skill/subcommand hiện tại.
- Số file output và taxonomy theo web/mobile/CLI/hybrid.
- Claim “hard gate” Claude và “rules-only/soft enforcement” Codex đúng hành vi.
- Claim self-contained, repair, moved-source và tamper detection có bằng chứng test.
- Node version tối thiểu trong docs phù hợp API/runtime thực tế.
- Đường dẫn minh họa không giả định POSIX nếu sản phẩm tuyên bố chạy Windows.
- Không claim production-ready/pilot/pass nếu contract hoặc roadmap vẫn ghi limitation mở.

## Novel probes bắt buộc

- Tìm link/path tài liệu trỏ đến file không tồn tại.
- Tìm command trong fenced code block không còn trong CLI dispatcher.
- So allowlist npm tarball với mọi asset installer/runtime thực sự đọc.
- Tìm claim định lượng nhưng không có test/report nguồn.
- Kiểm tra encoding tiếng Việt khi đọc README/runbook bằng môi trường mặc định.

## Oracle

Không có version drift, stale command, broken link, claim mạnh hơn bằng chứng hoặc asset cần thiết bị bỏ khỏi package. Limitation phải được diễn đạt rõ và nhất quán.

## Báo cáo

Ghi vào `findings/QA-06-<ten-phien>.md` theo `report-template.md`.
