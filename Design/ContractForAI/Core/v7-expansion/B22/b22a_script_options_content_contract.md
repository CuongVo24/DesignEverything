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

- [x] 14 câu chọn tĩnh có `options` đúng 2–4 entry, mỗi entry đủ 3 field (`value`/`label`/
      `description`) + khuyến nghị ở field cấp câu `recommendation` khi có `default` khác `null`
      (shape khác `recommended: true` per-entry như spec gốc — deviation ghi ở §7).
- [x] Với mỗi `recommendation.mode: 'fixed'`, `value`/`label` không mâu thuẫn ngữ nghĩa với
      `default` hiện tại của câu đó — bảng đối chiếu tay 14 câu ở §7.
- [x] 5 câu mở có `option_hints` đủ 3 field, `synthesize_from` chỉ trỏ `id` xuất hiện trước nó
      trong `depends_on` chain hiện có của câu đó (không tự thêm phụ thuộc mới) — xác nhận bằng
      `loadScript.ts` closure check (xem §7 [b22b](b22b_script_schema_options_contract.md)).
- [x] `S7` có đúng 4 `options` khớp registry hình-hài (`web`/`mobile`/`hybrid`/`cli`), không
      thêm/bớt — khoá bằng test `contentIntegrity.test.ts`.
- [x] Không câu nào ngoài 19 câu trên bị đổi field (ngoại trừ 2 vá `warning_rules`/description ở
      C5/M2, ghi rõ ở §7 — thuộc `answer_contract`, không phải field mới của lane này, nhưng cần
      sửa để hai bất biến D55/warning không xung đột nhau).
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

DONE (2026-08-16, lộ trình P3, nhánh `codex/lane-8-1-interactive-cards`). 4 file markdown song sinh
(`S0-S6-core.md`, `W-web.md`, `M-mobile.md`, `C-cli.md`) nay có mục `**options**`/`**option_hints**`
cho đúng 19 câu, đặt ngay dưới `**default**` — khớp vị trí với đối chiếu B22e (P7).

**Audit phát hiện 2 lỗi thật khi đối chiếu, đã vá trong batch này (ngoài scope gốc, nhưng cần thiết
— xem §7 [b22b](b22b_script_schema_options_contract.md) cho phần lưới máy-check thay thế):**
- `C5_MULTIPLATFORM_DISTRIBUTION_REQUESTED` (pattern cũ `(github releases|homebrew|scoop|binary
  biên dịch sẵn)`) khớp **0/4** option của C5, kể cả văn xuôi `label: description` — người chọn thẻ
  "Binary phát hành"/"Package manager hệ điều hành" thoát hoàn toàn ack gate. Pattern sửa thành
  `(github releases|homebrew|scoop|binary|package manager)`.
- `M2_OFFLINE_SYNC_REQUESTED` khớp nhầm cả `online-first` (an toàn nhất) vì description cũ chứa
  "mất mạng". Sửa description thành "Đơn giản nhất nhưng người dùng cần kết nối liên tục để thao
  tác được." — bỏ 4 từ khoá kích hoạt rule (`offline`/`mất mạng`/`đồng bộ`/`sync`) mà không đổi ý
  nghĩa đánh đổi thật.

Kiểm chứng bằng script Node đọc trực tiếp `script.yaml` đã parse, đối chiếu `deriveAnswerText`-style
văn bản với từng `pattern` bằng `RegExp(pattern, 'i')`: sau vá, `C5 → {release-binary,
os-package-manager}`, `M2 → {offline-critical, offline-first}` — đúng ý định gốc của cả hai rule,
không match/mismatch nào còn lại. `generateAgentsMd.artifact.test.ts` snapshot regenerate lại (chỉ
đổi đúng 1 dòng M2 trong `AGENTS.sample.md`, không đổi gì khác).

**Bảng đối chiếu tay `default` ↔ `recommendation` (14 câu chọn tĩnh, checklist mục 3 dòng 2):**

| ID | `default` (rút gọn) | `recommendation` | Khớp nghĩa? |
|---|---|---|---|
| CAL0 | Đi nhanh thẳng vào việc, giải thích tối giản | fixed `fast` — Đi nhanh | ✅ |
| S7 | web | fixed `web` — Ứng dụng web | ✅ |
| W1 | Tuỳ nhu cầu SEO — SSR/SSG nếu công khai, SPA nếu sau đăng nhập | contextual | ✅ (default tự thân điều kiện hoá, không có một khuyến nghị cố định để suy) |
| W2 | Cả hai, responsive mobile-first | fixed `responsive-both` — Responsive cả hai | ✅ |
| W3 | Vercel/Netlify subdomain miễn phí, chưa cần tên miền riêng | fixed `preview-subdomain` — Subdomain bản thử | ✅ |
| W4 | Tuỳ nhu cầu tài khoản — Google OAuth + email/password nếu cần | contextual | ✅ (default điều kiện hoá theo "nếu cần") |
| M1 | Một nền tảng duy nhất có thiết bị thật để test | contextual | ✅ (default phụ thuộc thiết bị thật của người dùng, không suy được một OS cố định) |
| M2 | Online-first, trừ khi thật sự cần offline thường xuyên | fixed `online-first` — Ưu tiên có mạng | ✅ |
| M4 | Chưa bật push nếu không có lý do rõ ràng | fixed `no-push` — Chưa cần push | ✅ |
| M5 | Bản thử trước (TestFlight/internal test) | fixed `internal-test` — Thử nghiệm nội bộ | ✅ |
| C1 | Node.js (TypeScript) | fixed `node-ts` — Node TypeScript | ✅ |
| C2 | Kết hợp flags/arguments + menu tương tác | fixed `flags-interactive` — Flags và menu | ✅ |
| C4 | Hệ điều hành hiện tại của người phát triển | contextual | ✅ (default phụ thuộc máy thật của người dùng) |
| C5 | Chạy cục bộ (node/npx/npm link) | fixed `local` — Chạy cục bộ | ✅ |

Không có lệch nghĩa nào — 10 câu `fixed` đều đúng semantic với `default` cũ; 4 câu `contextual` (W1,
W4, M1, C4) đều có `default` tự thân điều kiện hoá theo "nếu…thì…", đúng lý do ở §7 của
[b22b](b22b_script_schema_options_contract.md) tại sao không ép một `recommended: boolean` cố định.

`npm test` = 993 pass / 2 skip / 131 file (giữ nguyên baseline, không đổi số sau khi regenerate
artifact); `npm run lint`/`typecheck:all` xanh.

**Deviation từ spec (ghi lại, không sửa lén — xem [D58](../../../../DecisionLog.md)):** mỗi
`options` entry thực tế mang `value`/`label`/`description`, còn cờ khuyến nghị tách thành field
riêng cấp câu hỏi `recommendation: {mode: 'fixed', value} | {mode: 'contextual'}` thay vì
`recommended: boolean` trên từng entry như mục 2 mô tả ban đầu. Lý do: cần phân biệt câu có khuyến
nghị cố định (S7, W2, W3…) với câu khuyến nghị phụ thuộc ngữ cảnh (W1, W4, M1, C4 — không entry nào
nên preselect) — một field `recommended: boolean` trên entry không biểu diễn được nhánh "không có
khuyến nghị nào" mà không tự chọn liều một entry bất kỳ. Xem thêm §7 của
[b22b_script_schema_options_contract.md](b22b_script_schema_options_contract.md) cho phần schema
tương ứng.
