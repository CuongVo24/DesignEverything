# Spike — UserPromptSubmit có bắn khi trả lời thẻ tương tác không?

> Tầng: QA. Nguồn: [InteractiveQuestionCardsPlan.md](../../../RoadMap/InteractiveQuestionCardsPlan.md)
> §5 (bảng batch, dòng R-spike). Phụ thuộc: gate mở lane (xem README).
>
> Đây là spike thực nghiệm, không phải contract implement tính năng — không có "Interfaces / Files
> expected to change" theo nghĩa sản phẩm; kết quả là một quyết định kỹ thuật ghi lại, dùng để khoá
> thiết kế B22c.

## 1. Micro-task target

Xác định thực nghiệm: khi người dùng trả lời một thẻ tương tác (click chọn, không gõ văn xuôi),
hook `UserPromptSubmit` có được Claude Code bắn hay không. Kết quả quyết định B22c có cần cơ chế
"giữ câu trả lời qua lượt" hay có thể commit ngay trong lượt trả lời.

## 2. Scope

**In scope**

- Cài hook log `UserPromptSubmit` vào một workspace trống (ngoài repo DesignEverything, dùng cơ chế
  cài thật của `install.mjs`, không giả lập).
- Gọi một thẻ tương tác thật (widget chọn hoặc mock tương đương hành vi click trong Claude Code),
  đọc log để xác nhận hook có bắn.
- Thử tối thiểu 2 kiểu tương tác: chọn nút có sẵn, và gõ vào ô tự nhập kèm theo thẻ — vì D55 bắt
  buộc đường tự nhập luôn tồn tại, cả hai đường phải được đo.
- Ghi lại kết quả dưới dạng quyết định kỹ thuật trong mục 7 (Status) khi DONE.

**Out of scope**

- Không viết code sản phẩm (`render-inject.ts`, `SKILL.md`) — đó là B22c, chờ kết quả spike này.
- Không đo hiệu năng hay độ trễ, chỉ đo có-bắn/không-bắn.

## 3. Checklist

- [ ] Hook log cài được vào workspace trống thật (không phải unit test giả lập `UserPromptSubmit`).
- [ ] Ca "chọn nút có sẵn" có kết quả bắn/không-bắn ghi log rõ ràng, tái hiện được ≥3 lần liên tiếp.
- [ ] Ca "gõ vào ô tự nhập của thẻ" có kết quả riêng, không gộp chung với ca chọn nút.
- [ ] Kết luận ghi thành một trong hai nhánh thiết kế cho B22c (xem mục 5 rủi ro) và note vào Status.

## 4. Quan sát và cách ghi lại

Không có file sản phẩm để liệt kê `[NEW]`/`[MODIFY]` — sản phẩm của spike là bằng chứng quan sát.
Ghi log thô vào `Design/RoadMap/evidence/r-spike-userpromptsubmit-log.md` (tạo mới, ≤100 dòng): mỗi
lần thử một dòng gồm loại tương tác, thời điểm, log hook thô hoặc "không thấy entry nào".

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Kết quả khác nhau giữa các phiên bản Claude Code | TB | Ghi rõ version Claude Code lúc đo; nếu hành vi đổi sau này, B22c phải re-test trước khi release. |
| Nhầm log của tool khác với `UserPromptSubmit` thật | Cao | Log phải in tên hook event, không suy luận từ timing. |
| Kết luận "có bắn" nhưng chỉ đúng cho một loại thẻ | TB | Thử cả hai ca (nút + tự nhập) riêng biệt, không gộp kết luận. |

**Hai nhánh thiết kế phụ thuộc kết quả (từ plan §6, rủi ro "nhịp giữ câu trả lời qua lượt"):**
- Nếu `UserPromptSubmit` **có** bắn khi trả lời thẻ → B22c bỏ hẳn cơ chế giữ câu trả lời qua lượt;
  commit ngay trong lượt đó.
- Nếu **không** bắn → B22c phải thiết kế cơ chế giữ (`nextCommand` rỗng, agent nhớ câu đang chờ tới
  khi có `UserPromptSubmit` kế tiếp) — rủi ro Cao vì phụ thuộc model nhớ đúng, cần B22e viết test
  riêng cho trường hợp này.

## 6. Verification plan

- Log thật từ workspace cài thật, không phải test giả lập — không có lệnh `npx vitest run` cho spike
  này. Verification = log tồn tại tại `Design/RoadMap/evidence/r-spike-userpromptsubmit-log.md`, đủ
  3 lần thử/ca, và kết luận trong Status trỏ đúng một trong hai nhánh ở mục 5.

## 7. Status

IN_PROGRESS (2026-08-16) — probe dựng xong, **chờ chủ repo chạy phiên thật** (bước này không tự
động hoá được trong một phiên đối chiếu tài liệu, cùng lý do như A3/Gate B1). Đã dựng:
`E:\rspike-8.1-probe` — workspace trống, cài DesignEverything thật bằng `install.mjs` (bundle
8.1.0, rebuild trước khi cài để qua `checkDistFreshness`), cộng một hook log độc lập
(`rspike-log-hook.mjs`, đăng ký thêm vào `UserPromptSubmit` bên cạnh hook sản phẩm thật, không sửa
hook sản phẩm) — đã smoke-test bằng stdin giả, ghi log đúng định dạng. Template kết quả:
[r-spike-userpromptsubmit-log.md](../../../RoadMap/evidence/r-spike-userpromptsubmit-log.md) — có
hướng dẫn từng bước cho 2 ca × 3 lần. B22c hiện đã code theo nhánh giả định "commit ngay trong lượt,
không giữ câu trả lời qua lượt" (xem §7 [b22c](B22/b22c_claude_interactive_cards_contract.md)) —
spike này sẽ xác nhận hoặc bác giả định đó bằng log thật.
