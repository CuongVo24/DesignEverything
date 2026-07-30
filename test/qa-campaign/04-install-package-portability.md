# QA-04 — Installer, package và portability

## Mục tiêu

Xác nhận gói phát hành là self-contained, cài đặt/repair an toàn và tiếp tục chạy khi target hoặc source được di chuyển.

## Check bắt buộc

```powershell
rtk npm run build:bundle
rtk npx vitest run test/integration/packaging.test.ts
rtk npx vitest run test/integration/installed-runtime/runtime-bundle.test.ts
rtk npx vitest run test/integration/installed-runtime/claude-install-flow.test.ts
rtk npx vitest run test/integration/installed-runtime/codex-parity.test.ts
rtk npx vitest run test/integration/installed-runtime/installer-repair.test.ts
rtk npx vitest run test/integration/installed-runtime/installer-interrupted.test.ts
rtk npx vitest run test/integration/installed-runtime/moved-source.test.ts
rtk npx vitest run test/integration/installed-runtime/tampered-runtime.test.ts
```

## Novel probes bắt buộc

- Target path có khoảng trắng, Unicode và độ sâu lớn.
- Cài hai lần; so manifest, hook entries và byte của user config.
- Source bị đổi tên/xóa khỏi vị trí cũ sau install; target vẫn chạy.
- Tamper một asset content, một hook và manifest; đối chiếu status/repair.
- Cài bị gián đoạn tại các phase; rerun không để staging rác hoặc half-install.
- Tarball không chứa test, node_modules, absolute path, secret hoặc file ngoài allowlist.
- Dùng target read-only hoặc file đích bị lock nếu môi trường mô phỏng an toàn.

## Oracle

Install atomic, rerun idempotent, preserve user config, repair đúng phạm vi, bundle không cần source/node_modules, không có dev absolute path và tamper luôn được phát hiện fail-closed.

## Báo cáo

Ghi vào `findings/QA-04-<ten-phien>.md` theo `report-template.md`.
