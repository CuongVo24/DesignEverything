# Dogfood Checklist — lần chạy thật đầu tiên trên dự án ngoài repo

Tài liệu này dành cho **lần dogfood thật** được nêu ở `Design/RoadMap/v7-release-note.md` §0 — điều
kiện cuối cùng còn thiếu trước khi 7.0.0 hết `BLOCKED`. Đây không phải test mô phỏng (`npm test`
chạy trong repo, qua Vitest) — đây là chạy `install.mjs` thật vào một dự án thật, ngoài repo
DesignEverything, rồi dùng Claude Code (hoặc Codex) thật để phỏng vấn/build.

## 1. Chuẩn bị

- [ ] Build bundle trước — `install.mjs` fail-closed nếu thiếu:
  ```bash
  npm run build:bundle
  ```
  (`adapter/claude-code/install.mjs:45-49` từ chối cài nếu không thấy `dist/bundle/runtime.mjs`.)
- [ ] Chọn một dự án đích **ngoài repo DesignEverything**. Installer tự chặn cài vào chính repo
  (`adapter/claude-code/install.mjs:39-42`) — không có cách vượt qua, đây là chủ đích.
- [ ] Dự án đích nên là dự án thật đang làm (không phải thư mục rỗng dựng riêng cho test) — mục
  đích của lần dogfood này là quan sát hành vi trên workspace có cấu trúc thật, không phải xác nhận
  lại happy path đã có trong `test/e2e/`.

## 2. Cài đặt

```bash
node adapter/claude-code/install.mjs <đường-dẫn-dự-án-đích>
```

Dùng `adapter/codex-plugin/install.mjs` thay thế nếu chạy trên Codex thay vì Claude Code.

## 3. Chạy phỏng vấn/build thật

Mở dự án đích trong Claude Code (hoặc Codex), gọi skill `/design-everything` để bắt đầu phỏng vấn,
đi hết ít nhất một nhánh (`web`/`mobile`/`cli`/`hybrid`) tới khi docs được emit, rồi gọi `/build` để
đi qua validate → execute ít nhất một task thật.

## 4. Quan sát gì

Không chỉ xác nhận "chạy được" — quan sát cụ thể các điểm mà evidence trong repo còn đánh dấu
`PARTIAL`/`OPEN` (xem `Design/ContractForAI/Core/v1-fix-bugs/finding-coverage-matrix.md`):

- Hook có bao giờ **silently allow** một hành động lẽ ra phải deny không (viết code trước khi docs
  emit, sửa trực tiếp `progress.json`/`.design-everything/interview-state.json`)?
- CLI/hook có bao giờ trả về JSON không parse được, exit code sai nghĩa, hoặc thông báo tiếng Việt
  không khớp hành vi thật không?
- Sau một lần Ctrl+C/crash giữa chừng commit hoặc emit, lần chạy lại có tự phục hồi đúng không, hay
  để lại state kẹt?
- Slot/answer có bị ghi đè nhầm giữa các câu hỏi không (X12, còn OPEN)?
- Docs sinh ra có rỗng ruột, đặt câu hỏi placeholder mà vẫn pass không (U05, PARTIAL)?
- Với Codex: có hành vi nào khác với Claude Code cho cùng một input không (B4e, PARTIAL)?

## 5. Báo lỗi lại theo mẫu

Cho mỗi vấn đề quan sát được, ghi vào một mục riêng với các trường sau (không cần file riêng — có
thể gộp thành một báo cáo, mỗi vấn đề một mục `###`):

```markdown
### <tên ngắn>

- **Finding liên quan** (nếu khớp một dòng trong finding-coverage-matrix.md): <ID, vd X12>
- **Bước tái hiện**: <các bước cụ thể đã làm, theo thứ tự>
- **Kỳ vọng**: <hành vi đúng lẽ ra phải xảy ra>
- **Thực tế**: <hành vi thật quan sát được, kèm output/JSON/log thật nếu có>
- **Tần suất**: <luôn xảy ra / X trên Y lần thử>
- **Mức nghiêm trọng**: <chặn hoàn toàn / mất dữ liệu / sai nhưng có đường vòng / chỉ khó chịu>
```

Không cần kết luận nguyên nhân hay đề xuất fix — mục tiêu của lần dogfood là thu thập bằng chứng
thật, không phải sửa lỗi tại chỗ.
