# Versioning — Chính sách phiên bản Lõi

## Tại sao cần file này
Adapter gầy **phụ thuộc** lõi béo. Đổi lõi mà không version → vỡ hết adapter một cách âm thầm. File này quy định cách thay đổi lõi an toàn.

## 1. Đối tượng được version
Tất cả thành phần trong [Contract.md](Contract.md) mục 1: `interview-script`, `taxonomy`, `state-schema`, `gate-policy`, `anchor-format`. Mỗi cái mang một trường `version`.

## 2. SemVer rút gọn
- **MAJOR** — phá tương thích: bỏ/đổi nghĩa field, đổi cây taxonomy, đổi id câu hỏi. Adapter phải sửa.
- **MINOR** — thêm tương thích: thêm câu hỏi mới có default, thêm field optional. Adapter cũ vẫn chạy.
- **PATCH** — sửa chữ/typo/làm rõ, không đổi cấu trúc.

## 3. Quy tắc khoá
- `interview-script` và `taxonomy` đổi MAJOR → **phải** cập nhật [../Adapters/ConformanceMatrix.md](../Adapters/ConformanceMatrix.md) cùng commit.
- Không bao giờ tái dùng một `id` câu hỏi cho nghĩa khác (id là vĩnh viễn — liên quan anchor truy vết, xem [AnchorFormat.md](AnchorFormat.md)).

## 4. Mốc planned sau 3.0.0

V3 Execution Expansion nằm ở lane ContractForAI/Core/v3-expansion nhưng target release là 4.0.0. Nó thêm 09-execution-plan, R1 risk discovery, execution state/evidence và semantics gate task-level; đây là MAJOR theo §2. Không đổi version runtime hay public claim trước B10b. Xem [V3-ExecutionExpansionPlan.md](../RoadMap/V3-ExecutionExpansionPlan.md) và D29-D35.

## 5. Ghi nhận
Mỗi file schema có bảng changelog ở cuối. Khi MAJOR, ghi rõ adapter nào cần đụng.

| Version | Ngày | Thay đổi | Adapter bị ảnh hưởng |
Mỗi file schema có bảng changelog ở cuối. Khi MAJOR, ghi rõ adapter nào cần đụng.

| Version | Ngày | Thay đổi | Adapter bị ảnh hưởng |
|---|---|---|---|
| 0.1.0 | (init) | Khởi tạo skeleton | — |
| 1.0.0 | 2026-06-27 | Đóng mốc v1: Thêm nhánh mobile, adapter AGENTS.md, hardening ca biên và đồng bộ 2 golden | — |
| 1.0.1 | 2026-06-28 | Sửa chữ/làm rõ gợi ý S3 (MoSCoW) và cảnh báo M2 (Sync)/M5 (Store) trong kịch bản | Không có |
| 1.1.0 | 2026-06-29 | Hỗ trợ cấu hình `srcPrefix` cho mỏ neo `planned_src_*` trong `emitTree` | Không có |
| 1.2.0 | 2026-06-29 | Bổ sung nhánh `'hybrid'` sinh đồng thời `07-deployment.md` và `07-release.md` | Không có |
| 2.0.0 | 2026-07-09 | Mở `branch` thành hình-hài dự án (registry ở taxonomy); thêm `kind: anchored\|meta`; tách câu chọn hình-hài `S7` khỏi S6; thêm shape `cli` + `07-distribution.md`; critic role + meta-calibrate. **MAJOR** — xem [V2-ExpansionPlan](../RoadMap/V2-ExpansionPlan.md), DecisionLog D21–D26. | Claude Code + AGENTS.md (Đồng bộ đầy đủ và pass kiểm thử tại B5-B6) |
| 3.0.0 | 2026-07-10 | Thêm file dẫn xuất `08-build-plan.md` vào cây taxonomy cho MỌI hình-hài (kế hoạch build milestone + done-when, suy từ S3+S5, slot do skill điền lúc emit). **MAJOR** vì đổi cây taxonomy — xem DecisionLog D28. Không đổi câu hỏi, không đổi state-schema. | Claude Code (skill /design + CLI `emit --slots-file`) + AGENTS.md (rules emit thêm 08) |
| 4.0.0 | 2026-07-13 | Mở rộng quy trình thực thi V3: Thêm tài liệu `09-execution-plan.md` vào taxonomy, thư mục `.design-everything/` chứa `execution-plan.json` và `execution-state.json`. Thêm 6 lệnh CLI build. Semantic validation kiểm tra trace/command/wont-leak/risk. **MAJOR** — xem DecisionLog D29-D35. | Claude Code (skill /design + skill /build + CLI validate/next/start/record-evidence/repair) |
| 5.0.0 | 2026-07-14 | Báo cáo thử nghiệm thực tế (Pilot Evaluation) cho newbie, setup cổng phát hành v4-newbie-evaluation-report.md và scripts/check-v4-claims.mjs. **MAJOR** vì thay đổi tiêu chí phát hành. | Không có (chỉ linter CI) |
| 6.0.0 | 2026-07-14 | B16a Contract schema & Conventions bind: Thêm `contractSchema`, `projectConventionsSchema`, `compileContractToTaskCard`, `emitProjectConventions`, và `validateContract` làm cầu nối giữa hợp đồng feature và task card. **MAJOR** vì thêm taxonomy và public schemas mới. | Claude Code + Codex (sắp tới ở B17b) |
| 7.0.0 | **GA (2026-08-10)** | v1-fix-bugs Release Truth Sync: đóng gói installed-runtime adversarial integration (B5a), state/emit transaction fault injection (B5b), newbie journey evaluation (B5c), shared parity runner giữa Claude Code và Codex (B4e), loại bỏ link `file:///e:/...` và kiểm tra sự thật runtime (B5d). **MAJOR.** 24/24 contract `APPROVED + IMPLEMENTED` với Proof on-axis (`UNIT_ONLY`/`SEAM_PARTIAL`, theo D56); không contract nào `VERIFIED` tuyệt đối, gap thật công khai — xem [v7-release-note.md](../RoadMap/v7-release-note.md) §5. Hàng này từng ghi ngày 2026-07-25 như đã phát hành trong khi chưa cắt — đúng finding R15, sửa 2026-07-30; cắt thật 2026-08-10. | Claude Code + Codex + AGENTS.md |
| 8.0.0 | **GA (2026-08-10)** | v6-expansion — opt-in progressive deepening tier-2 (`glossary`/`feature-spec`/`adr`/`test-strategy` dưới `docs/design/`, D49–D52). **MAJOR** (đổi cây output khi opt-in; tầng 1 mặc định không đổi output). Xem [v6-expansion/README.md](../ContractForAI/Core/v6-expansion/README.md). | Claude Code + Codex |
| 8.1.0 | **RC (2026-08-16)** | v7-expansion — Interactive Question Cards: `options`/`option_hints` máy đọc được trong `script.yaml`, adapter render thẻ tương tác (D53–D55, D58). **MINOR** — thêm field optional, adapter cũ vẫn chạy. `package.json` và `src/version.ts` đứng ở version này. RC chứ chưa GA: R-spike (`AskUserQuestion` có bắn `UserPromptSubmit` không) còn chờ phiên thật — xem [v8.1-release-note.md](../RoadMap/v8.1-release-note.md) §Status. | Claude Code (thẻ native) + Codex (text liệt kê) |
| 9.0.0 | **chưa cắt** | Một lần cắt nuốt ba lane (D68). **(a)** v8-hotfix H1–H6 — bế tắc bootstrap, `--slots-file`, gate PowerShell, `status` question card, `gates_passed`/`ready-for-validation` (6/6 contract DONE 2026-08-16; từng dự kiến ra dưới số 8.1.1). **(b)** v8-expansion Interview Cadence — `undo` một bước, batch nhiều câu một lượt do Core quyết, `multi_select` (D59–D61; 8/8 contract DONE 2026-08-16; từng dự kiến ra dưới số 8.2.0). **(c)** v9-expansion Doc Depth — `docs/Guideline.md` tier-1 bắt buộc, cây `docs/contracts/`, `kind: 'tool'`, module deepen `modules` + `frontend` (D62–D67). **MAJOR** vì (c) thêm artifact tier-1 bắt buộc và mở `artifactKindSchema`; (a) là PATCH và (b) là MINOR, bị số lớn hơn nuốt. Xem [V9-DocDepthPlan.md](../RoadMap/V9-DocDepthPlan.md) và [v8-hotfix/](../ContractForAI/Core/v8-hotfix/) · [InterviewCadencePlan.md](../RoadMap/InterviewCadencePlan.md). | Claude Code + Codex + AGENTS.md |

> **Không có 8.1.1 và 8.2.0.** Hai số đó từng là target của v8-hotfix và v8-expansion, nhưng
> `package.json` chưa bao giờ rời 8.1.0 và repo không có tag nào — chúng là *dự định*, không phải
> *bản phát hành*. Theo D68, changelog của cả hai gộp vào hàng 9.0.0 ở trên thay vì dựng hai hàng
> cho hai version không tồn tại. Nội dung nguyên văn của hai hàng cũ nằm trong lịch sử git
> (commit `d0d447a`) và trong contract của chính hai lane đó; công việc không mất, chỉ thôi được
> đếm là version.
