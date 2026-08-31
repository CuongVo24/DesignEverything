# Contract — B27b đồng bộ tài liệu + cắt 9.0.0

> Tầng: QA/Process.
> Nguồn: [V9-DocDepthPlan.md](../../../../RoadMap/V9-DocDepthPlan.md) §Batch.
> Phụ thuộc: B25a, B25b, B26a, B26b, B27a — **tất cả phải `DONE` trước khi bắt đầu**.

## 1. Micro-task target

Đồng bộ toàn bộ tài liệu, golden và ma trận theo năm batch trước, rồi cắt phát hành **9.0.0** với
gap công khai — không tuyên bố mức bằng chứng cao hơn thực tế.

## 2. Scope

**In scope**

- **Golden 3 shape:** cập nhật `golden-example-web` / `-mobile` / `-cli` để phản ánh cây mới
  (`Guideline.md` bắt buộc; `docs/contracts/` nếu golden đi tới pha build; `modules`/`frontend` cho
  golden có opt-in tier-2).
- **Phân vai `README.md` ↔ `Guideline.md`** — quyết định bị B25a cố ý hoãn lại tới đây. Chốt một
  trong hai và ghi vào `taxonomy.md`: hoặc `README.md` thành mục lục ngắn trỏ `Guideline.md`, hoặc
  gộp làm một. **Không để hai file nói cùng một thứ.**
- **Đồng bộ tài liệu lõi:** `Design/Content/taxonomy.md`, `taxonomy-tier2.md`,
  `Design/Adapters/ConformanceMatrix.md` (thêm mục `## Trạng thái v9.0.0`),
  `Design/Core/Versioning.md` (hàng 9.0.0), `README.md` gốc, `docs/quickstart.md`.
- **Adapter:** cập nhật `adapter/claude-code/skill/SKILL.md` + `skill/build/SKILL.md` +
  `adapter/codex-plugin/skills/**` + `.agents/AGENTS.md` cho hai module deepen mới và cây
  `docs/contracts/`. Hai harness phải dùng **cùng văn xuôi**, chỉ khác mức enforcement (D37/D53).
- **Bump:** `package.json`, `package-lock.json` (2 chỗ), `src/version.ts`,
  `adapter/codex-plugin/.codex-plugin/plugin.json` → `9.0.0`.
- **Release note** `Design/RoadMap/v9-release-note.md`: gồm §Gap công khai liệt kê thẳng cái chưa
  đạt, theo tiền lệ D56. **Phủ ba lane, không phải một** (D68): v8-hotfix H1–H6 và v8-expansion
  D59–D61 chưa bao giờ được cắt nên changelog của chúng ra cùng lần này — người dùng nhảy từ 8.1.0
  lên 9.0.0 nhận cả ba, release note phải nói đủ cả ba.
- Cập nhật `CONTRACT_INDEX.md` (6 dòng → `DONE`) và `LANE_INDEX.md` (lane v9 → Đóng + version).

**Out of scope**

- Không thêm tính năng mới. Batch này chỉ đồng bộ và cắt.
- Không đóng hộ R-spike, pilot B18a, RB-08, D49–D52 — bốn khoản treo từ trước, ghi lại trong release
  note là **known-open**, không tuyên bố đã đóng.
- Không tự `git tag`, không tự `npm publish`. Chuẩn bị xong, chủ repo bấm.

## 3. Checklist

- [ ] `npm test` xanh trọn chuỗi: `check-version-sync` → `check-matrix` → `check-docs` →
      `typecheck:all` → `vitest`.
- [ ] `node scripts/check-version-sync.mjs` exit 0 sau bump (4 nơi khai version khớp nhau).
- [ ] `node scripts/check-docs.mjs` exit 0: 6 contract v9 có dòng trong `CONTRACT_INDEX.md` với
      status `DONE`; lane v9 có dòng trong `LANE_INDEX.md`; `Versioning.md` có hàng 9.0.0.
- [ ] Không doc nào còn khai một version ≤ 9.0.0 là "chưa cắt" (phép kiểm 6 của `check-docs.mjs`).
- [ ] **Re-emit 8.x:** một fixture emit bằng 8.1.0 re-emit bằng 9.0.0 → thêm file mới, **không** hỏi
      lại câu nào, 12 doc cũ không đổi nội dung.
- [ ] Golden 3 shape khớp cây mới; `test/regression/golden-*.test.ts` xanh.
- [ ] `ConformanceMatrix.md` ghi trung thực mức enforcement từng harness cho hai module mới — không
      hứa Codex ngang Claude Code.
- [ ] Release note có §Gap công khai với **4 khoản known-open** nêu trên.
- [ ] Release note và `## Trạng thái v9.0.0` ở `ConformanceMatrix.md` nói đủ **ba** lane (D68), không
      chỉ v9 — người nâng cấp từ 8.1.0 nhận luôn hotfix H1–H6 và interview cadence.
- [ ] Không dựng lại hàng 8.1.1 hay 8.2.0 trong `Versioning.md`; hai số đó không tồn tại (D68).
- [ ] `README.md` gốc: mọi câu "mốc X.Y.Z" khớp 9.0.0 (`check-version-sync` ép).

## 4. Interfaces / Files expected to change

- `[MODIFY] Design/Content/golden-example-{web,mobile,cli}/**` — cây docs mới
- `[MODIFY] Design/Content/taxonomy.md`, `taxonomy-tier2.md`
- `[MODIFY] Design/Adapters/ConformanceMatrix.md` (+ mục `## Trạng thái v9.0.0`)
- `[MODIFY] Design/Core/Versioning.md` (+1 hàng)
- `[MODIFY] Design/ContractForAI/CONTRACT_INDEX.md`, `Design/RoadMap/LANE_INDEX.md`
- `[NEW] Design/RoadMap/v9-release-note.md` (~120 dòng)
- `[MODIFY] adapter/claude-code/skill/SKILL.md`, `adapter/claude-code/skill/build/SKILL.md`,
  `adapter/codex-plugin/skills/**/SKILL.md`, `.agents/AGENTS.md`
- `[MODIFY] package.json`, `package-lock.json`, `src/version.ts`,
  `adapter/codex-plugin/.codex-plugin/plugin.json`
- `[MODIFY] README.md`, `docs/quickstart.md`

## 5. Risks & mitigations

| Rủi ro | Giảm bằng |
|---|---|
| Cắt 9.0.0 với claim cao hơn thực tế (đúng bệnh R15) | §Gap công khai bắt buộc; `check-version-sync` + `check-docs` phép kiểm 6 chặn hai chiều |
| Golden lệch cây mới, test regression đỏ sát ngày cắt | Golden cập nhật ngay trong batch tương ứng (B25a/B25b/B26b/B27a), B27b chỉ đối chiếu lần cuối |
| Dự án 8.x vỡ khi nâng | Ca re-emit ở §3 là điều kiện chặn, không phải nice-to-have |
| Hai skill file lệch nhau giữa hai harness | Dùng chung hàm derive văn xuôi; test parity đã có (`adapter-parity.test.ts`) |

## 6. Verification plan

```bash
npm test
npm run build:bundle && npx vitest run test/integration/installed-runtime/
node scripts/check-version-sync.mjs && node scripts/check-matrix.mjs && node scripts/check-docs.mjs
npx vitest run test/regression/ test/e2e/ test/eval/
```

Smoke tay bắt buộc trước khi báo `DONE`: cài vào target trống, đi trọn `/design-everything` →
`emit` → `/build validate`, mở `docs/Guideline.md` và `docs/contracts/CONTRACT_INDEX.md`, xác nhận
mọi link mở được và `node tools/check-docs.mjs` trong target exit 0.

## 7. Status

`WAITING_FOR_APPROVAL`
