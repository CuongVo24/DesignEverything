# Contract — W1C Golden example WEB (fixture)

> **Tầng:** Nội dung (sản phẩm — chất lượng > tốc độ). Nguồn: [Week-01](../../../../RoadMap/Month1/Week-01.md) + golden mẫu có sẵn [golden-example-mobile/](../../../../Content/golden-example-mobile/) + [script.yaml](../../../../Content/interview-script/script.yaml) (W1–W5) + [doc-templates/](../../../../Content/doc-templates/).

## 1. Micro-task target
Dựng tay trọn bộ golden example cho **một dự án web giả** (transcript hỏi–đáp + cây `docs/`), parity với golden-mobile, để làm fixture regression + demo cho nhánh web.

## 2. Scope
**In scope** — tạo `Design/Content/golden-example-web/`:
- `_interview-transcript.md` — hỏi–đáp giả lập S0→S6→W1→W5 theo **4 quy tắc vàng** (từng câu một, có default, DỊCH NGƯỢC, neo doc). Bám đúng `ask`/`translate_back` trong `script.yaml`.
- `docs/` đầy đủ: `00-vision`, `01-personas`, `02-scope`, `03-data-model`, `04-flows`, `05-architecture`, `06-constraints`, `07-deployment` (nhánh web → KHÔNG có `07-release`), `README`.
- `_quality-score.md` — chấm theo [QualityRubric.md](../../../../Content/QualityRubric.md).
- Mỗi file docs mở đầu `## Tại sao cần file này` + anchor `status=planned` cuối mỗi mục (AnchorFormat).
- Dự án giả gợi ý: nhỏ, chạm đủ W1–W5 (cần SEO, responsive, deploy link, auth, có/không admin) — ví dụ "trang chia sẻ & tìm công thức nấu ăn của nhóm bạn".

**Out of scope**
- File `07-release.md` (đó là nhánh mobile).
- Code; bố trí test fixture (W1D).

## 3. Checklist
- [ ] Transcript thể hiện rõ default + dịch ngược + xác nhận cho từng câu.
- [ ] `docs/` đủ 9 file, dùng `07-deployment.md` (không phải release).
- [ ] Mỗi quyết định kiến trúc (W1–W5) nối ngược về nhu cầu người dùng, không "vì hot".
- [ ] Mỗi file có "## Tại sao cần file này" + anchor `status=planned`.
- [ ] `_quality-score.md` chấm rubric, đạt mức tương đương golden-mobile.

## 4. Interfaces / Files expected to change
- `[NEW]` `Design/Content/golden-example-web/_interview-transcript.md`
- `[NEW]` `Design/Content/golden-example-web/docs/{00-vision,01-personas,02-scope,03-data-model,04-flows,05-architecture,06-constraints,07-deployment,README}.md`
- `[NEW]` `Design/Content/golden-example-web/_quality-score.md`

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Dự án giả quá to, không phỏng vấn gọn được | TB | Chọn dự án nhỏ vẫn chạm đủ W1–W5; bám golden-mobile làm chuẩn độ dài. |
| Default lệch `script.yaml` | TB | Copy `default`/`translate_back` từ `script.yaml`, không tự chế. |
| Quên anchor / "tại sao" | TB | Đối chiếu từng file với template tương ứng trong `doc-templates/`. |

## 6. Verification plan
- So cấu trúc cây với `taxonomy.md` (nhánh web): đúng 9 file, có `07-deployment`.
- Mỗi `target_doc` trong W1–W5 của `script.yaml` đều có chỗ rót tương ứng trong docs.
- Chấm `_quality-score.md` theo rubric, ghi điểm từng file.

## 7. Status
`WAITING_FOR_APPROVAL`
