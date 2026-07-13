# Contract Structure Rule — DesignEverything

> Áp dụng cho mọi file dưới `Design/ContractForAI/`.
>
> **Vì sao có lane này.** Agent code chính của dự án là một model yếu hơn (harness yếu hơn Claude/Codex). Model yếu cần task được atom hoá tới mức *một-đơn-vị-làm-được*, có **kết quả mong đợi viết rõ**, **danh sách file phải đụng**, và **lệnh verification cụ thể** — nếu không chất lượng sẽ trôi. Manager (model mạnh: lên plan + review) viết contract; executor (model yếu) thực thi đúng contract. Đây chính là cơ chế đảm bảo chất lượng của dự án.

## 0. Quan hệ với phần còn lại của `Design/`
- **Nguồn của mỗi contract** = file Week tương ứng trong `Design/RoadMap/MonthN/Week-*.md` (đóng vai TaskBrief: đã có "Việc chi tiết" + nghiệm thu) **+** các spec lõi đã khoá mà task chạm tới (`Core/Schemas/*`, `Content/*`, `Adapters/*`, `Conventions/*`).
- **Không tạo lớp TaskBrief riêng.** Dự án này nhỏ; Week file đã là brief. Contract là lớp duy nhất thêm vào.
- Contract chỉ viết được **sau khi design đã khoá** (RemediationPlan FB1–FB4). Contract tham chiếu schema chưa khoá = phải viết lại.

**Ngoại lệ expansion lane:** khi có một Vn ExpansionPlan đã khoá quyết định/schema xuyên nhiều tháng, plan đó thay Week file làm TaskBrief nguồn cho thư mục Core/vN-expansion. Mỗi contract phải ghi rõ plan, DecisionLog và dependency đã khoá; không được dùng ngoại lệ này để viết contract trước design.

## 1. Cấu trúc thư mục
```text
Design/ContractForAI/
  CONTRACT_STRUCTURE_RULE.md   # file này
  Core/                        # lane duy nhất: engine lõi + adapter
    month1/
      W1/ W2/ W3/ W4/
    # month2.. thêm khi tới (just-in-time, chỉ tháng có code)
    break_task/
      week{N}_break/           # contract fix/polish sau khi review output tuần N
      project_structure_break/ # (tuỳ chọn) fix lệch cấu trúc xuyên tuần
    vN-expansion/              # lane xuyên tháng, chỉ khi có Vn ExpansionPlan đã khoá
```
> Phạm vi hiện tại: **chỉ Month 1**. Month 2 (mobile + AGENTS.md + hardening) và Month 4 W15 (drift flagging) viết contract khi tới tuần đó. Month 3 là dogfood/nội dung → dùng nghiệm thu Week sẵn có, thường không cần contract code.

## 2. Đặt tên file
Lowercase snake_case: `w{tuần}{nhóm}_{mô_tả_ngắn}_contract.md`
- Task: `w1a_scaffold_repo_contract.md`, `w2c_evaluate_gate_contract.md`
- Break/fix: `w1_fix_session_init_state_contract.md`, `w1_polish_loader_jsdoc_contract.md`

## 3. Nội dung bắt buộc của một contract (7 mục — giữ nguyên)
1. **Micro-task target** — một câu: làm xong cái gì, là một đơn vị triển khai được.
2. **Scope** — `In scope` / `Out of scope` (nêu rõ cái cố ý KHÔNG làm để chống trôi scope).
3. **Checklist** — các mục kiểm được, tick từng cái.
4. **Interfaces / Files expected to change** — `[NEW]`/`[MODIFY]` từng file + ước lượng dòng. Ghi rõ signature interface nếu có (executor yếu KHÔNG tự chế interface).
5. **Risks & mitigations** — bảng rủi ro + cách giảm.
6. **Verification plan** — **lệnh chạy thật** để chứng minh đạt (vd `npx vitest run`, `npm run typecheck`), bám 3 tầng test trong [../Conventions/TestStrategy.md](../Conventions/TestStrategy.md).
7. **Status** — một trong các giá trị ở §5.

## 4. Sizing cho executor yếu (BẮT BUỘC)
- Mỗi contract = **một đơn vị triển khai được**, hand-authored ≤ **~200 dòng/file** (trùng [VibeCode.md](../VibeCode.md) Step 3). Vượt ngưỡng → tách nhóm (W1a, W1b...).
- Kết quả mong đợi phải **cụ thể tới mức không cần suy luận**: tên file, tên hàm, shape dữ liệu, lệnh verify. Đừng để executor phải "đoán ý".
- Một contract chỉ chạm **một tầng** ([VibeCode.md](../VibeCode.md) Step 1): **Lõi** / **Nội dung** / **Adapter**. Ghi rõ tầng ở đầu contract.

## 5. Status values (map vào VibeCode approve gate)
- `WAITING_FOR_APPROVAL` — đã viết, chờ manager duyệt (= VibeCode Step 2 "chờ Approve"). Executor **chưa được chạm code**.
- `READY_TO_IMPLEMENT` — đã Approve, executor được làm.
- `IN_PROGRESS`
- `DONE` — đã pass verification plan; ghi quyết định thực tế vào cuối contract.
- `BLOCKED` — kèm lý do + contract/điều kiện cần gỡ.

## 6. Agent protocol
Trước khi tạo/sửa contract:
1. Đọc [../VibeCode.md](../VibeCode.md) → file này → Week file nguồn → spec lõi mà task chạm.
2. Đặt contract đúng `month{N}/W{tuần}/`.
3. Giữ contract gọn trong một đơn vị triển khai được; tách nhóm nếu to.
4. Không di chuyển/xoá/đổi tên contract đã có khi chưa được duyệt rõ ràng.

Trước khi **thực thi** một contract (executor):
1. Đọc contract + đúng các file nó liệt kê ở mục 4 — không đọc lan man.
2. Chỉ làm trong scope; thấy phải đụng ngoài scope → DỪNG, báo manager (có thể cần break_task).
3. Chạy đúng verification plan trước khi báo `DONE`.

## 7. Vòng break_task (cơ chế chất lượng cốt lõi)
Sau khi executor báo `DONE` một tuần, **manager review output** → mọi lỗi/điểm chưa sạch → viết contract trong `break_task/week{N}_break/`:
- `w{N}_fix_*` cho bug thật; `w{N}_polish_*` cho nợ kỹ thuật/độ sạch.
- Mỗi fix vẫn đủ 7 mục, vẫn một đơn vị nhỏ. Đây là nơi chất lượng được kéo lên khi executor yếu bỏ sót.
