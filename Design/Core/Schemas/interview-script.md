# Schema — interview-script

> Định dạng trung tính (YAML/markdown) cho kịch bản phỏng vấn. **Cả Lõi lẫn mọi Adapter đều đọc file này** → chốt sớm, đổi cẩn thận ([Versioning.md](../Versioning.md)).

## Tại sao cần file này
Kịch bản phỏng vấn là sản phẩm, nhưng nó phải có **hình dạng máy đọc được** để adapter render và để gate-policy biết câu nào neo vào doc nào. File này định nghĩa hình dạng đó.

## 1. Top-level shape

```yaml
version: 0.1.0
questions:
  - id: S0
    ask: "Mô tả dự án trong 1 câu, như kể cho bạn thân."
    default: null
    target_doc: 00-vision.md
    branch: core
    gate: null
    translate_back: "Tóm lại thành elevator pitch 1-2 câu rồi hỏi xác nhận."
    depends_on: []
```

Top-level bắt buộc có:

| Field | Kiểu | Bắt buộc | Ý nghĩa |
|---|---|---|---|
| `version` | string | ✓ | Phiên bản schema đang áp dụng. Batch 1 khoá ở `0.1.0`. |
| `questions` | array\<question\> | ✓ | Danh sách câu hỏi theo thứ tự thực thi chuẩn. Không được rỗng. |
| `critics` | map\<question-id → critic\> | — (optional) | Nội dung critic phản biện, key = `id` câu mà critic chạy **sau** (điểm fire). Mỗi entry: `challenge` (câu thách thức) + `ack_prompt` (câu bắt xác nhận). Optional. Xem [Contract.md](../Contract.md) §3, [DecisionLog D24](../../DecisionLog.md). |

## 2. Shape của một `question`

| Field | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `id` | string | ✓ | Định danh vĩnh viễn. Regex khuyến nghị: `^[A-Z][A-Za-z0-9-]*$`. Không tái dùng cho nghĩa khác. |
| `ask` | string | ✓ | Câu hỏi đời thường, đã trim, không rỗng. Không nhét thuật ngữ nội bộ vào đây. |
| `default` | string \| null | ✓ | `null` nghĩa là câu bắt buộc, agent không tự điền. String nghĩa là "mặc định thông minh" khi user nói "không biết". |
| `kind` | `anchored` \| `meta` | — (default `anchored`) | Loại câu. `anchored` = câu neo vào doc (mặc định khi thiếu field → giữ tương thích ngược). `meta` = câu hiệu chỉnh chế độ phỏng vấn (vd độ sâu giải thích), KHÔNG neo doc, KHÔNG sinh anchor. |
| `target_doc` | string \| null | ✓ | Khi `kind=anchored`: tên file đích (vd `02-scope.md`), phải tồn tại trong [../../Content/taxonomy.md](../../Content/taxonomy.md). Khi `kind=meta`: bắt buộc `null`. |
| `branch` | `core` \| `<shape-id>` | ✓ | `core` = câu dùng chung mọi dự án. `<shape-id>` = câu thuộc một hình-hài dự án có thật trong registry [taxonomy.md](../../Content/taxonomy.md) (vd `web`, `mobile`, `hybrid`, `cli`). Không còn enum đóng — xem [DecisionLog D21](../../DecisionLog.md). |
| `gate` | string \| null | ✓ | `id` của gate liên quan trong [gate-policy.md](gate-policy.md), hoặc `null` nếu câu này không nối gate. |
| `translate_back` | string | ✓ | Mẫu/ghi chú dịch ngược để agent tóm trả lời đời thường thành ngôn ngữ chuẩn rồi xác nhận. Không được rỗng. |
| `depends_on` | array\<string\> | ✓ | Danh sách `id` phải hoàn tất trước khi câu này được hỏi. Có thể rỗng. |
| `answer_contract` | object | — (optional) | Contract khai báo để [validateAnswer](../../../src/core/validateAnswer.ts) chấm câu trả lời của đúng `id` này: `required`, `min_trimmed_chars`, `min_items`, `required_fields`, `enum_values`, `pattern`, `warning_rules` (mảng `{code, pattern?, message}` — khớp thì outcome thành `needs_user_ack`, KHÔNG tự pass). Thiếu field này = chỉ áp luật rỗng/placeholder mặc định của validator. Nội dung rule cụ thể theo từng câu do B3b sở hữu ở `Content/interview-script/*`; schema này chỉ khoá hình dạng generic, không hardcode ý nghĩa từng câu ([answerContract.ts](../../../src/core/schemas/answerContract.ts)). |
| `slot_keys` | array\<string\> | — (optional) | Danh sách khoá `--slots-file` mà câu này được phép ghi. Thiếu field này = mọi khoá trong payload đều được chấp nhận (hành vi cũ, tương thích ngược). Một khoá có thể xuất hiện dưới nhiều câu khác nhau (vd `architecture_overview` dưới cả W1/W2, M2 và C1 — cùng một slot được điền tuỳ nhánh interview thật đã đi) — đây là allowlist theo-câu, không phải allowlist toàn cục ([interviewApplicationServices.ts](../../../src/core/interviewApplicationServices.ts)). |
| `options` | array\<{value, label, description}\> | — (optional, `2.1.0`) | Câu **chọn tĩnh**: 2–4 lựa chọn viết cứng, mỗi entry `value` (token dùng làm khoá máy — slot/`--branch`/`--calibrate`, KHÔNG phải văn xuôi commit), `label` (nhãn hiển thị ngắn), `description` (1 câu nêu đánh đổi thật, không rỗng). `value`/`label` phải duy nhất trong cùng câu. Adapter (Claude thẻ tương tác, AGENTS.md liệt kê text) chỉ đọc field này, không tự chế lựa chọn — [D53](../../DecisionLog.md). Loại trừ lẫn nhau với `option_hints`. |
| `recommendation` | `{mode:'fixed', value}` \| `{mode:'contextual'}` | — (bắt buộc khi có `options`, `2.1.0`) | `fixed`: đúng một `value` trong `options` được đánh dấu khuyến nghị (adapter hiển thị nhãn "(khuyến nghị)", KHÔNG tự preselect). `contextual`: không lựa chọn nào được khuyến nghị trước — dùng khi ý nghĩa `default` cũ tự thân điều kiện hoá ("nếu X thì Y"), không suy ra được một khuyến nghị cố định. `fixed.value` phải trỏ đúng một `value` có thật trong `options` của cùng câu. |
| `option_hints` | `{synthesize_from, hint_count, hint_style}` | — (optional, `2.1.0`) | Câu **mở, có gợi ý**: KHÔNG viết cứng lựa chọn — agent tự tổng hợp tại runtime. `synthesize_from` (mảng `id`, không rỗng) là các câu nguồn agent phải suy từ answer đã commit của chúng, và mỗi `id` đó **phải nằm trong closure bắc cầu của `depends_on`** của câu hiện tại (loader từ chối nếu không — chặt hơn mức tối thiểu ban đầu, xem [b22b §7](../../ContractForAI/Core/v7-expansion/B22/b22b_script_schema_options_contract.md)). `hint_count` là `2` hoặc `3`. `hint_style` là chỉ dẫn ngắn cách tổng hợp (vd "nỗi đau + workaround khả dĩ"). Loại trừ lẫn nhau với `options`. |
| `multi_select` | boolean | — (optional, mặc định `false`, `2.2.0`) | Chỉ có ý nghĩa khi câu có `options` hoặc `option_hints` — thiếu cả hai thì bị từ chối (câu free-text không có gì để chọn nhiều). Không tương thích với `recommendation.mode: 'fixed'` — hai câu cần đúng một token máy đọc (`CAL0` cho `--calibrate`, `S7` cho `--branch`) không bao giờ được khai `multi_select`. Người dùng vẫn luôn còn đường tự nhập ([D55](../../DecisionLog.md) không đổi). Văn xuôi commit khi chọn nhiều là các lựa chọn nối bằng `deriveMultiAnswerText`, không phải mảng `value` ([D58](../../DecisionLog.md), [D61](../../DecisionLog.md)). |

## 3. Bốn quy tắc vàng (agent PHẢI tuân khi chạy script)
1. **Hỏi từng câu một** — không bắn nhiều câu cùng lúc.
2. **Luôn có mặc định thông minh** — `default` là đường đi tiếp khi user không biết trả lời.
3. **Dịch ngược** — dùng `translate_back` để tóm câu trả lời đời thường thành ngôn ngữ chuẩn rồi xác nhận.
4. **Mỗi câu `anchored` neo vào 1 ô doc** — với `kind=anchored`, `target_doc` phải chỉ tới đúng file taxonomy; câu nào không biết rót vào đâu thì không được tồn tại. Ngoại lệ duy nhất: câu `kind=meta` (vd hiệu chỉnh độ sâu giải thích) cố ý KHÔNG neo doc — xem [DecisionLog D23](../../DecisionLog.md).

## 4. Cấu trúc nhánh và thứ tự thực thi (v2)
- **Khung lõi `branch: core`** chạy trước, gồm: (tuỳ chọn) câu `kind=meta` hiệu chỉnh chế độ giải thích → **S0–S6** (vision…constraints) → **S7 câu chọn hình-hài dự án** (set `branch` cho phần còn lại).
- **Câu chọn hình-hài (S7)** là `branch: core`; nó là điểm rẽ nhánh **duy nhất**. Trước v2 việc chọn nhánh nằm lẫn trong S6 — nay tách riêng ([DecisionLog D22](../../DecisionLog.md)).
- **Câu nhánh theo shape** (`branch: <shape-id>`, vd `web`, `mobile`, `hybrid`, `cli`) rẽ **sau S7**; mỗi shape có bộ câu riêng định nghĩa ở `Content/interview-script/*`.
- Trong file YAML, `questions` giữ thứ tự thực thi chuẩn: toàn bộ `core` trước, rồi các nhóm shape theo registry taxonomy.
- Một câu shape tối thiểu phải `depends_on` câu chọn hình-hài (S7) để chỉ rẽ sau khi đã chốt shape.
- `depends_on` chỉ trỏ tới `id` khai báo trước đó; không trỏ vòng, không tự phụ thuộc.
- Nội dung câu hỏi nằm ở `Content/interview-script/*`; schema này chỉ khoá **hình dạng**, không hardcode logic phỏng vấn chi tiết.

Nội dung đầy đủ các câu: [../../Content/interview-script/](../../Content/interview-script/).

## 5. Ví dụ hợp lệ tối thiểu
```yaml
version: 0.1.0
questions:
  - id: S0
    ask: "Mô tả dự án trong 1 câu, như kể cho bạn thân."
    default: null
    target_doc: 00-vision.md
    branch: core
    gate: null
    translate_back: "Tóm thành elevator pitch 1 dòng."
    depends_on: []
  - id: S3
    ask: "Liệt kê việc người dùng làm được (kể lộn xộn)."
    default: "Agent đề xuất bộ MVP tối thiểu."
    target_doc: 02-scope.md
    branch: core
    gate: scope-locked
    translate_back: "Xếp thành Must / Should / Could (MoSCoW)."
    depends_on: [S0, S1, S2]
```

> **S3 là câu khó & quan trọng nhất** — agent là người phân loại Must/Should/Could, người mới không tự ưu tiên được.

Ví dụ `options` (câu chọn tĩnh, `2.1.0`):
```yaml
  - id: CAL0
    ask: "Bạn muốn giải thích kỹ hay đi nhanh?"
    default: "Đi nhanh thẳng vào việc, giải thích tối giản."
    kind: meta
    target_doc: null
    branch: core
    gate: null
    translate_back: "Mình ghi nhận mức độ giải thích: `<giải thích kỹ / đi nhanh>`."
    depends_on: []
    options:
      - { value: deep, label: "Giải thích kỹ", description: "Có thêm lý do và hướng dẫn, nhưng mất thời gian hơn." }
      - { value: fast, label: "Đi nhanh", description: "Tập trung chốt quyết định nhanh với giải thích tối giản." }
    recommendation: { mode: fixed, value: fast }
```

Ví dụ `option_hints` (câu mở, có gợi ý, `2.1.0`):
```yaml
  - id: S1
    ask: "Hiện giờ mọi người đang khổ vì chuyện gì?"
    default: "Suy từ câu S0 rồi đề xuất 1 cách hiểu cụ thể nhất."
    target_doc: 00-vision.md
    branch: core
    gate: null
    translate_back: "Mình đang hiểu nỗi đau chính là: `<nỗi đau chuẩn hoá>`."
    depends_on: [S0]
    option_hints:
      synthesize_from: [S0]
      hint_count: 3
      hint_style: "nỗi đau + workaround khả dĩ"
```

## 6. Luật validate

Validator cho Batch 6 và test sau này phải kiểm được tối thiểu các luật dưới đây:

1. `version` là string hợp lệ theo SemVer rút gọn, khớp version Lõi hiện hành ([Versioning.md](../Versioning.md)); từ v2 là dòng `2.x`.
2. `questions` là mảng không rỗng; mọi phần tử chứa đủ field bắt buộc ở mục 2 (`kind` được phép thiếu → hiểu là `anchored`).
3. `id` là duy nhất toàn file; không tái dùng cho nghĩa khác ở version tương thích.
4. `ask` và `translate_back` là string không rỗng sau khi trim.
5. `default` chỉ được là string không rỗng hoặc `null`; `null` được hiểu là câu bắt buộc, không phải "thiếu field".
6. Khi `kind=anchored`: `target_doc` phải khớp một file có thật trong taxonomy lõi (theo registry hình-hài; vd `07-distribution.md` cho `cli`, `07-deployment.md`/`07-release.md` cho web/mobile — mỗi tên file là một entry hợp lệ riêng, không parse cây như chuỗi bracket). Khi `kind=meta`: `target_doc` phải là `null`.
7. `branch` là `core` hoặc một `<shape-id>` có khai báo trong registry hình-hài của [taxonomy.md](../../Content/taxonomy.md). Validator KHÔNG hardcode danh sách shape — đọc từ registry.
8. `gate` là `null` hoặc trỏ tới một `id` có thật trong `gate-policy`.
9. `depends_on` là mảng `id` có thật, không trùng lặp, không chứa chính `id` hiện tại, và không trỏ tới câu xuất hiện sau nó.
10. Câu thuộc shape không được đứng trước câu chọn hình-hài (S7); file giữ thứ tự thực thi chuẩn (core trước, shape sau) để state machine đi tuần tự.
11. Câu `kind=meta` không có `gate` ràng buộc artifact và không xuất hiện trong `emitted_docs` (không sinh doc).
12. `critics` (nếu có) là map; mọi key phải là `id` câu có thật; mỗi entry có `challenge` và `ack_prompt` không rỗng.
13. `options` và `option_hints` loại trừ lẫn nhau — một câu không được khai cả hai (`2.1.0`).
14. Khi có `options`: 2–4 entry, `value`/`label` duy nhất trong câu, `description` không rỗng;
    `recommendation` bắt buộc phải có mặt; nếu `recommendation.mode = 'fixed'`, `value` của nó phải
    trỏ đúng một `value` có thật trong `options`. Ngược lại, `recommendation` không được xuất hiện
    khi câu không có `options` (`2.1.0`).
15. Khi có `option_hints`: `synthesize_from` không rỗng và không trùng lặp; `hint_count` là `2` hoặc
    `3`; mọi `id` trong `synthesize_from` phải đã khai báo trước câu hiện tại **và** nằm trong
    closure bắc cầu của `depends_on` của câu đó (`2.1.0`).
16. Khi `multi_select: true`: câu phải có `options` hoặc `option_hints` (một trong hai, theo luật
    13); `recommendation.mode` không được là `'fixed'` nếu có mặt (`2.2.0`).

## 7. Bất biến tương thích

- Không bao giờ đổi nghĩa một `id` đã phát hành.
- Đổi tên hoặc xoá field là thay đổi phá tương thích → bump MAJOR theo [Versioning.md](../Versioning.md).
- Thêm field mới chỉ được phép nếu optional hoặc có default rõ ràng (vd `kind` default `anchored`) để adapter cũ không vỡ âm thầm.
- Mở `branch` khỏi enum đóng + thêm hình-hài mới (đổi cây taxonomy) là thay đổi **MAJOR** — v2.0.0 ([DecisionLog D21](../../DecisionLog.md)); phải cập nhật [ConformanceMatrix](../../Adapters/ConformanceMatrix.md) cùng commit.
- Danh sách hình-hài hợp lệ là **single source** ở registry trong [taxonomy.md](../../Content/taxonomy.md); schema/loader tham chiếu, không tự chế.

## V3 Execution Expansion — target 4.0.0, chưa implement

B7b sẽ thêm R1 sau khi chọn shape để ghi external dependency, platform, cost, permission, terms và điều chưa biết vào 09-execution-plan. R1 là anchored question: không hỏi người dùng kiến thức chuyên môn, cho phép không biết và bắt agent phân loại confirmed, assumption hoặc spike-required. Không được thêm R1 vào runtime script hay thay đổi thứ tự hiện hành trước khi B7a/B7b được duyệt.

## Changelog
| Version | Thay đổi |
|---|---|
| 0.1.0 | Khoá schema ổn định cho Batch 1: chốt field, ràng buộc, thứ tự thực thi và luật validate. |
| 2.0.0 | 2026-07-09 | Mở `branch` thành hình-hài dự án (registry ở taxonomy); thêm field `kind: anchored\|meta` (`target_doc` null khi meta); tách câu chọn hình-hài (S7) khỏi S6; câu nhánh `depends_on` S7; thêm top-level `critics:` map theo điểm fire. MAJOR: D21–D24. |
| 2.1.0 | 2026-08-16 | **MINOR — bản vá hiện hành** (không đổi luật mục 6.1 "từ v2 là dòng `2.x`"). Thêm 3 field optional cho câu: `options` (2–4 lựa chọn viết cứng cho câu chọn tĩnh), `recommendation` (khuyến nghị `fixed`/`contextual`, bắt buộc khi có `options`), `option_hints` (chỉ dẫn tổng hợp gợi ý runtime cho câu mở, loại trừ lẫn nhau với `options`). Câu thiếu cả hai field vẫn free-text như cũ — tương thích ngược tuyệt đối, không một câu nào trong `script.yaml` hiện có đổi hành vi. Luật validate 13–15. [D53](../../DecisionLog.md)/[D58](../../DecisionLog.md), [InteractiveQuestionCardsPlan.md](../../RoadMap/InteractiveQuestionCardsPlan.md). |
| 2.2.0 | 2026-08-16 | **MINOR**. Thêm field optional `multi_select` (mặc định `false`) cho câu — cho phép chọn nhiều `options`/gợi ý `option_hints` cùng lúc, luôn còn đường tự nhập ([D55](../../DecisionLog.md) không đổi). Bật cho `S1`, `S2`, `S4`, `S5` — bốn câu duy nhất trong `script.yaml` mà slot đích vốn là danh sách cộng dồn (`problem_summary+current_workaround`, hai persona, `core_entities`, các bước luồng). Không bật cho `W4`/`C4` dù cũng có `options`: hai câu đó có lựa chọn loại trừ lẫn nhau (một phương thức đăng nhập / một hệ điều hành mục tiêu), multi_select ở đó sẽ cho phép tổ hợp vô nghĩa. Cấm tuyệt đối trên `CAL0`/`S7` bằng luật validate 16 (không tương thích `recommendation.mode: 'fixed'`). Luật validate 16. [D61](../../DecisionLog.md), [InterviewCadencePlan.md](../../RoadMap/InterviewCadencePlan.md). |
