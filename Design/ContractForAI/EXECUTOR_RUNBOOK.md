# EXECUTOR RUNBOOK — tám bước thực thi một contract

> Dành cho **executor**: agent (hoặc người) được giao thực thi một contract đã `READY_TO_IMPLEMENT`.
> Nếu bạn đang **viết** contract chứ không thực thi, đọc
> [CONTRACT_STRUCTURE_RULE.md](CONTRACT_STRUCTURE_RULE.md) thay vì file này.
>
> Luật nền bắt buộc đọc trước: [../VibeCode.md](../VibeCode.md).

## Tại sao cần file này

Model thực thi của dự án yếu hơn model quản lý ([CONTRACT_STRUCTURE_RULE.md](CONTRACT_STRUCTURE_RULE.md)
mở đầu). Executor yếu hỏng theo những cách lặp lại được: đọc lan man rồi hết ngữ cảnh, tự chế
interface không có trong contract, làm tràn sang scope khác, và báo `DONE` mà chưa chạy lệnh verify.
Tám bước dưới đây chặn đúng bốn lỗi đó, theo thứ tự chúng thường xảy ra.

## Tám bước

### 1. Kiểm điều kiện được phép làm

Contract phải đang ở `READY_TO_IMPLEMENT`. Nếu nó là `WAITING_FOR_APPROVAL` → **dừng**, chưa được
chạm code (VibeCode Step 2). Nếu `BLOCKED` → đọc lý do, gỡ điều kiện chặn trước.

### 2. Nạp đúng ngữ cảnh, không lan man

Đọc theo đúng thứ tự này và **dừng lại ở đó**:

1. [../VibeCode.md](../VibeCode.md) — luật nền.
2. Chính file contract.
3. Đúng những file contract liệt kê ở mục **Interfaces / Files expected to change**.
4. Spec lõi mà task chạm tới, nếu contract có dẫn link (`../Core/Schemas/*`, `../Content/*`,
   `../Adapters/*`, `../Conventions/*`).

Không đọc thêm file "cho chắc". Ngữ cảnh tiêu vào việc đọc thừa là ngữ cảnh mất cho việc làm.

### 3. Không tự chế interface

Mục 4 của contract đã ghi signature. Executor **không được** tự nghĩ ra tên hàm, shape dữ liệu hay
đường dẫn file khác. Thiếu thông tin để viết → **dừng, hỏi manager**, đừng đoán.

### 4. Chỉ làm trong scope

Contract có mục `Out of scope` viết rõ cái **cố ý không làm**. Thấy buộc phải đụng ra ngoài scope →
dừng, báo manager; nhiều khả năng cần một `break_task` riêng
([CONTRACT_STRUCTURE_RULE.md](CONTRACT_STRUCTURE_RULE.md) §7), không phải mở rộng contract đang làm.

### 5. Giữ luật 200 dòng

Mỗi file hand-authored ≤ ~200 dòng (VibeCode Step 3). Vượt ngưỡng là dấu hiệu contract bị to quá —
báo manager tách nhóm (`{feat}a`, `{feat}b`), đừng viết một file 600 dòng rồi báo xong.

### 6. Giữ kỷ luật lõi béo / adapter gầy

Một contract chỉ chạm **một tầng**: Lõi / Nội dung / Adapter (VibeCode Step 1, Step 4). Adapter chỉ
được làm INJECT / GATE / EMIT ([../Core/Contract.md](../Core/Contract.md)) — không tự chế câu hỏi,
không đổi taxonomy, không bỏ qua gate policy. Đang sửa adapter mà thấy mình viết logic nghiệp vụ →
sai tầng.

### 7. Chạy verification plan thật

Mục 6 của contract ghi **lệnh chạy thật**. Chạy đúng những lệnh đó và dán kết quả thật. Ba tầng test
theo [../Conventions/TestStrategy.md](../Conventions/TestStrategy.md): schema/content → GATE (ca
biên, quan trọng nhất) → end-to-end mỗi adapter.

Không được báo `DONE` khi chưa chạy. Không được báo `DONE` với lệnh đã sửa cho dễ pass.

### 8. Đóng contract cho đúng

Khi verify xanh:

1. Tick từng mục ở **Checklist** (mục 3) — tick theo cái đã kiểm thật, không tick cả loạt.
2. Đổi mục `Status` thành `DONE`, ghi kết quả verify thật (số test pass, lệnh đã chạy) vào cuối
   contract.
3. Cập nhật dòng tương ứng trong [CONTRACT_INDEX.md](CONTRACT_INDEX.md) **cùng commit**.
   `scripts/check-docs.mjs` sẽ fail nếu index lệch với contract.
4. Nếu có gap chưa đóng được → ghi gap ra, đừng làm tròn thành `DONE` sạch. Tiền lệ D56: công bố
   mức bằng chứng thật (`UNIT_ONLY` / `SEAM_PARTIAL`) tốt hơn tuyên bố `VERIFIED` không có thật.

## Ba lỗi khiến contract bị trả lại

| Lỗi | Dấu hiệu |
|---|---|
| Báo `DONE` mà chưa chạy verify | Mục Status có `DONE` nhưng không có output lệnh thật |
| Tự chế interface | Có hàm/kiểu/đường dẫn không nằm trong mục 4 của contract |
| Tràn scope | Diff đụng file không có trong mục 4, hoặc đụng thứ nằm trong `Out of scope` |

Cả ba đều bị bắt ở vòng review của manager và sinh `break_task` — đó là nơi chất lượng được kéo lên
khi executor bỏ sót ([CONTRACT_STRUCTURE_RULE.md](CONTRACT_STRUCTURE_RULE.md) §7).
