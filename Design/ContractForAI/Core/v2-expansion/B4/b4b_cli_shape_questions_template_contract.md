# Contract — B4b Bộ câu `cli` (C1–C5) + template `07-distribution.md`

> **Tầng:** Nội dung. Nguồn: [V2-ExpansionPlan B4](../../../../RoadMap/V2-ExpansionPlan.md) + [taxonomy registry](../../../../Content/taxonomy.md) (`cli` → `07-distribution.md`) + [doc-templates](../../../../Content/doc-templates/) + mẫu nhánh [M-mobile.md](../../../../Content/interview-script/M-mobile.md). Phụ thuộc: [B4a](b4a_script_s7_meta_kind_contract.md) `DONE` (S7 chọn được `cli`).

## 1. Micro-task target
Điền hình-hài **đầu tiên** ngoài web/mobile: bộ 5 câu nhánh `cli` (C1–C5, `branch: cli`) + file mẫu `07-distribution.md`. Mỗi câu neo đúng doc (`05-architecture.md` cho kiến trúc, `07-distribution.md` cho phát hành), có `default` thông minh + `translate_back`, đúng tinh thần "hỏi đời thường, dịch ngược".

## 2. Scope
**In scope:**
- 5 câu `cli` trong `script.yaml` + bản người-đọc `[NEW]` `Content/interview-script/C-cli.md`. Gợi ý nội dung (manager tinh chỉnh):
  - `C1` ngôn ngữ/runtime (Node? Python? Go? binary?) → `05-architecture.md`
  - `C2` giao diện lệnh (args/flags, interactive prompt, stdin/stdout pipeline) → `05-architecture.md`
  - `C3` cấu hình & trạng thái (config file, env, credentials) → `05-architecture.md`
  - `C4` phụ thuộc hệ điều hành / cross-platform → `05-architecture.md`
  - `C5` phân phối & phát hành (npm/pip/brew/cargo, release binary, versioning) → `07-distribution.md`
- `[NEW]` `Content/doc-templates/07-distribution.md` với placeholder `{{...}}` + phần "Tại sao cần file này" + anchor `status=planned`.
- Mọi câu `depends_on: [S7]` (tối thiểu), `kind: anchored`, `gate: null` (trừ nếu tái dùng scope-locked — không).

**Out of scope**
- KHÔNG thêm shape khác (extension/library) — chỉ `cli`.
- KHÔNG viết golden cli (B5c) hay emit map (B5b).
- KHÔNG viết critic content (B4c).

## 3. Checklist
- [x] C1–C5 `branch: cli`, neo đúng doc, có default + translate_back đời thường.
- [x] `07-distribution.md` template có placeholder + "Tại sao cần file này" + anchor.
- [x] Placeholder keys của template khớp key mà C1–C5 sẽ điền (chuẩn bị cho emit B5b).
- [x] `C-cli.md` (người đọc) khớp `script.yaml`.
- [x] script.yaml vẫn validate (branch `cli` ∈ registry từ B5a).

## 4. Interfaces / Files expected to change
- `[MODIFY]` `Design/Content/interview-script/script.yaml` (C1–C5)
- `[NEW]` `Design/Content/interview-script/C-cli.md`
- `[NEW]` `Design/Content/doc-templates/07-distribution.md`

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Default thiên về app người-dùng-cuối (OAuth/Vercel) lạc đề cli | TB | Default cli phải nói ngôn ngữ dev-tool (registry, binary, exit codes) — review riêng. |
| Placeholder template lệch key câu hỏi | Cao | Chốt danh sách key giữa C-series và template; emit B5b kiểm parity. |
| Câu cli quá kỹ thuật, mất tinh thần "đời thường" | TB | `ask` giữ giọng đời thường; chi tiết kỹ thuật để `default`/translate_back. |

## 6. Verification plan
- `npx vitest run loadScript contentIntegrity` — cli branch + target_doc `07-distribution.md` hợp lệ (registry + taxonomy).
- Review thủ công: chạy tay mường tượng một phiên cli ra docs hợp lý.
- `npm test` — không phá web/mobile; cli golden để B5c.

## 7. Status
`DONE`
