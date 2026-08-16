# Contract — B22a Nội dung `options` cho câu chọn tĩnh + `option_hints` cho câu mở

> Tầng: Nội dung. Nguồn: [InteractiveQuestionCardsPlan.md](../../../../RoadMap/InteractiveQuestionCardsPlan.md)
> §4–§5 (bảng batch B22a), [D53](../../../../DecisionLog.md). Phụ thuộc: gate mở lane (xem README).
> Chạy song song với R-spike; không phụ thuộc kết quả spike.

## 1. Micro-task target

Viết `options` máy đọc được cho 14 câu chọn tĩnh và `option_hints` cho 5 câu mở-có-gợi-ý, trong
`Design/Content/interview-script/script.yaml` và các file markdown song sinh (nội dung câu hỏi con
người đọc, không phải schema) — mà B22b sẽ khoá hình dạng field ở tầng Lõi.

## 2. Scope

**In scope**

- `options` (mảng có thứ tự) cho đúng 14 câu chọn tĩnh liệt kê ở plan §4 bảng "Chọn tĩnh":
  `CAL0`, `S7`, `W1`, `W2`, `W3`, `W4`, `M1`, `M2`, `M4`, `M5`, `C1`, `C2`, `C4`, `C5`.
  Mỗi entry: `value` (string ngắn, dùng làm answer thật — phải giữ nguyên ngữ nghĩa `default` hiện
  có nếu entry đó là default), `label` (nhãn hiển thị ngắn), `description` (1 câu nêu đánh đổi, KHÔNG
  chỉ nêu tên — theo rủi ro "chọn bừa" ở plan §6), `recommended` (bool, đúng một entry `true` khi câu
  có `default` không null — entry đó phải mang value/label khớp nghĩa `default` hiện tại).
- `option_hints` (object) cho 5 câu mở-có-gợi-ý ở plan §4 bảng "Mở, có gợi ý": `S1`, `S2`, `S3`,
  `S4`, `S5`. KHÔNG viết cứng lựa chọn — field này là **chỉ dẫn cho agent** tổng hợp 2–3 gợi ý tại
  runtime từ answers đã commit của các câu trước, gồm: `synthesize_from` (mảng `id` câu nguồn),
  `hint_count` (2 hoặc 3), `hint_style` (mô tả ngắn cách tổng hợp, vd cho S3: "liệt kê 2–3 nhóm Must
  điển hình dựa theo branch đã chọn").
- Với 14 câu chọn tĩnh: `default` giữ nguyên giá trị cũ (bất biến tương thích của schema — B22b sẽ
  không cho `options` thay thế `default`, theo D55). `options` KHÔNG đổi nghĩa câu hỏi, chỉ thêm cách
  thu câu trả lời có cấu trúc cho đúng free-text hiện có.
- Với `S7` (giới hạn 4 lựa chọn bề mặt Claude Code): đúng 4 `options` = `web`/`mobile`/`hybrid`/`cli`
  theo registry hình-hài hiện có trong `taxonomy.md`, không tự chế thêm nhánh.

**Out of scope**

- Không sửa field `default`, `target_doc`, `branch`, `gate`, `depends_on`, `answer_contract` của bất
  kỳ câu nào — chỉ thêm hai field mới.
- Không viết `options`/`option_hints` cho câu nào ngoài 19 câu liệt kê trên (đặc biệt: không đụng
  `S0`, `S6`, `S8`, `R1`, các câu không thuộc hai bảng ở plan §4).
- Không đổi `version` của `script.yaml` — đó là việc của B22b (bump `2.0.0 → 2.1.0`).
- Không viết code loader/validator — đó là B22b.

## 3. Checklist

- [ ] 14 câu chọn tĩnh có `options` đúng 2–4 entry, mỗi entry đủ 4 field, đúng một entry
      `recommended: true` khi câu có `default` khác `null`.
- [ ] Với mỗi `options` entry `recommended: true`, `value`/`label` không mâu thuẫn ngữ nghĩa với
      `default` hiện tại của câu đó (đối chiếu tay từng câu, ghi vào evidence khi DONE).
- [ ] 5 câu mở có `option_hints` đủ 3 field, `synthesize_from` chỉ trỏ `id` xuất hiện trước nó
      trong `depends_on` chain hiện có của câu đó (không tự thêm phụ thuộc mới).
- [ ] `S7` có đúng 4 `options` khớp registry hình-hài, không thêm/bớt.
- [ ] Không câu nào ngoài 19 câu trên bị đổi field.
- [ ] Diff `script.yaml` chỉ thêm field `options`/`option_hints`, không sửa dòng nào khác.

## 4. Interfaces / Files expected to change

- [MODIFY] `Design/Content/interview-script/script.yaml` — thêm `options`/`option_hints` cho 19 câu,
  ước lượng +150 dòng (schema field, không phải file mới).
- [MODIFY] `Design/Content/interview-script/S0-S6-core.md`, `W-web.md`, `M-mobile.md`, `C-cli.md`
  (file song sinh markdown cho người đọc — tên thật lấy từ nội dung hiện có của
  `Design/Content/interview-script/`, đối chiếu lại khi bắt đầu implement) — mỗi file thêm phần liệt
  kê `options`/`option_hints` song song với nội dung câu đã có, ≤40 dòng thêm/file.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Người mới chọn bừa lựa chọn đầu tiên | Cao | `description` bắt buộc nêu đánh đổi thật, không chỉ nêu tên; `recommended` không tự động là lựa chọn đầu mảng. |
| `recommended` lệch nghĩa với `default` cũ | Cao | Checklist đối chiếu tay từng câu; B22e (QA) test tự động `default` phải nằm trong `options` — bắt lỗi nếu B22a lệch. |
| `option_hints` bị hiểu nhầm là lựa chọn viết cứng | TB | Field tách riêng tên (`option_hints` vs `options`), ghi rõ trong markdown song sinh đây là chỉ dẫn tổng hợp runtime, không phải danh sách cố định. |
| File markdown song sinh lệch với `script.yaml` | TB | B22e viết test đối chiếu khớp giữa 5 file — nằm trong DoD của plan §8. |

## 6. Verification plan

- `npx vitest run loadScript` — xác nhận field mới không phá loader hiện có (loader B22b sẽ dạy nó
  đọc field, nhưng B22a phải giữ YAML hợp lệ trước).
- Review tay của manager: đối chiếu 14 câu `recommended` với `default` cũ, ghi kết quả vào Status
  khi DONE.
- `npm test` xanh toàn bộ — không câu nào ngoài 19 câu liệt kê bị đổi hành vi.

## 7. Status

IN_PROGRESS (2026-08-16) — nội dung `options`/`option_hints` trong `script.yaml` đã có đủ 19 câu
(14 static + 5 hints), nhưng 4 file markdown song sinh (`S0-S6-core.md`, `W-web.md`, `M-mobile.md`,
`C-cli.md`) chưa được cập nhật và bảng đối chiếu tay `default`↔`recommendation` chưa viết — đóng ở
lộ trình P3 (nhánh `codex/lane-8-1-interactive-cards`).

**Deviation từ spec (ghi lại, không sửa lén — xem [D58](../../../../DecisionLog.md)):** mỗi
`options` entry thực tế mang `value`/`label`/`description`, còn cờ khuyến nghị tách thành field
riêng cấp câu hỏi `recommendation: {mode: 'fixed', value} | {mode: 'contextual'}` thay vì
`recommended: boolean` trên từng entry như mục 2 mô tả ban đầu. Lý do: cần phân biệt câu có khuyến
nghị cố định (S7, W2, W3…) với câu khuyến nghị phụ thuộc ngữ cảnh (W1, W4, M1, C4 — không entry nào
nên preselect) — một field `recommended: boolean` trên entry không biểu diễn được nhánh "không có
khuyến nghị nào" mà không tự chọn liều một entry bất kỳ. Xem thêm §7 của
[b22b_script_schema_options_contract.md](b22b_script_schema_options_contract.md) cho phần schema
tương ứng.
