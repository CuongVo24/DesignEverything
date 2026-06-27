# Contract — W4A EMIT cây docs + anchor

> **Tầng:** Lõi + Adapter. Nguồn: [Week-04](../../../../RoadMap/Month1/Week-04.md) + [taxonomy.md](../../../../Content/taxonomy.md) + [doc-templates/](../../../../Content/doc-templates/) + [AnchorFormat.md](../../../../Core/AnchorFormat.md).

## 1. Micro-task target
Engine EMIT: rót nội dung đã dịch ngược qua `doc-templates/` → sinh cây `docs/` đúng taxonomy, mỗi mục có anchor `status=planned`. Append tên file vào `emitted_docs`.

## 2. Scope
**In scope** — `src/core/emit.ts`:
- `emitDoc(targetDoc, filledSlots): string` — đọc template tương ứng trong `doc-templates/`, thay placeholder `{{...}}` bằng nội dung, giữ heading + anchor `status=planned` (rev trống lúc scaffolding — AnchorFormat §3).
- `emitTree(answers, branch): EmittedDoc[]` — sinh đúng tập file theo nhánh: web → `07-deployment.md`, mobile → `07-release.md`; **mỗi phiên chỉ một file `07-*`**.
- Tên file lấy từ taxonomy, KHÔNG tự chế.
- Trả danh sách để adapter ghi `docs/` + append `emitted_docs`.

**Out of scope**
- Logic phỏng vấn/dịch ngược (lớp skill). Resolve anchor `rev`/symbol (đó là Drift Flagging Month 4).

## 3. Checklist
- [x] Mỗi file emit khớp template tương ứng; placeholder thay hết.
- [x] Mỗi mục có anchor đúng format (`status=planned`, rev trống).
- [x] Nhánh web emit `07-deployment.md`, KHÔNG có `07-release.md` (và ngược lại).
- [x] Tên file ∈ taxonomy; mỗi file có "## Tại sao cần file này".
- [x] Test EMIT trên dữ liệu golden.

## 4. Interfaces / Files expected to change
```ts
export function emitDoc(targetDoc: string, filledSlots: Record<string, string>, templatesDir: string): string;
export function emitTree(answers: InterviewAnswers, branch: 'web' | 'mobile', templatesDir: string): EmittedDoc[];
```
- `[NEW]` `src/core/emit.ts` (+ test)

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Emit lệch taxonomy / sai file 07 | Cao | Map nhánh→file theo taxonomy; test khẳng định đúng một `07-*`. |
| Thiếu anchor | TB | Template đã có anchor; kiểm sau khi thay placeholder không xoá nhầm. |
| Adapter tự chế tên file | TB | Lấy tên từ taxonomy/template, không hardcode rời. |

## 6. Verification plan
- `emitTree(<golden web answers>, 'web')` → đúng 9 file gồm `07-deployment.md`, không `07-release.md`.
- Mỗi file chứa anchor `status=planned`; so khớp golden-web (W1C).

## 7. Status
`DONE`

### Quyết định thực tế & Nghiệm thu
- Đã cài đặt động cơ phát hành tài liệu lõi tại **[emit.ts](file:///e:/DesignEverything/src/core/emit.ts)**:
  - `emitDoc`: Đọc nội dung file mẫu thuộc cây `doc-templates/`, tự động lọc bỏ phần tiêu đề metadata thừa `# Template — docs/...` để đảm bảo văn bản sạch. Thay thế toàn bộ placeholder dạng `{{key}}` bằng nội dung câu trả lời tương ứng hoặc dữ liệu mỏ neo dự kiến.
  - `emitTree`: Sinh chính xác tập hợp 9 file tài liệu theo đúng nhánh. Nếu nhánh là `web` thì chỉ tạo `07-deployment.md` và bỏ qua `07-release.md` (và ngược lại).
  - Tự động sinh mỏ neo dự định `planned_src_...` và `planned_symbol_...` dựa trên nhánh được chọn (web bắt đầu bằng `src/`, mobile bắt đầu bằng `apps/mobile/src/`) với `status=planned` và `rev=` rỗng.
- Viết bộ unit test chuyên dụng tại **[emit.test.ts](file:///e:/DesignEverything/src/core/emit.test.ts)** để kiểm chứng việc bóc tách placeholder, loại bỏ tiêu đề metadata, sinh đúng cây 9 file phân loại theo nhánh web/mobile và kiểm tra mỏ neo planned đúng quy cách.
- Toàn bộ vitest, typecheck, lint, build chạy thành công xanh sạch 100%.
