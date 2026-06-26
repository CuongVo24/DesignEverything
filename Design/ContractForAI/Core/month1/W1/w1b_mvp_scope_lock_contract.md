# Contract — W1B Chốt phạm vi MVP Month 1

> **Tầng:** Nội dung/process (văn bản quyết định, không code). Nguồn: [Week-01](../../../../RoadMap/Month1/Week-01.md) + [Month1/README.md](../../../../RoadMap/Month1/README.md) + [ProductPRD.md](../../../../ProductPRD.md) §9.

## 1. Micro-task target
Viết một văn bản chốt phạm vi MVP Month 1 để tuần 2–4 chỉ việc bám theo, không tranh luận lại "bản chạy được" nghĩa là gì.

## 2. Scope
**In scope** — tạo `Design/RoadMap/Month1/MVP-Scope-Lock.md` nêu rõ:
- **Chỉ làm:** Claude Code (bậc A); chỉ nhánh **web**; đúng **1 gate** `scope-locked`; 3 hook `SessionStart`/`UserPromptSubmit`/`PreToolUse`; skill INJECT.
- **Câu giữ:** S0–S6 + W1–W5 (mobile M1–M5 vẫn nằm trong `script.yaml` nhưng KHÔNG chạy/test ở Month 1).
- **Cố ý chưa làm trong Month 1:** mobile end-to-end, AGENTS.md, chau chuốt template, phân phối, maintain.
- **Doc bắt buộc để mở gate:** `00-vision.md`, `01-personas.md`, `02-scope.md` (theo gate-policy.yaml).
- **Định nghĩa "Bản chạy được":** một phiên web S0→W5 sinh đúng cây docs, gate chặn trước và mở sau.

**Out of scope**
- Đổi taxonomy/schema/scope sản phẩm (chỉ tuyên bố lát cắt MVP, không sửa lõi).
- Viết code.

## 3. Checklist
- [ ] File `MVP-Scope-Lock.md` có đủ 5 mục trên.
- [ ] Mọi tuyên bố khớp `ProductPRD.md` §9 (Non-goals) và `gate-policy.yaml`.
- [ ] Mở đầu có `## Tại sao cần file này`.
- [ ] Liệt kê rõ "web only / 1 gate / Claude Code only / chưa mobile / chưa AGENTS.md".

## 4. Interfaces / Files expected to change
- `[NEW]` `Design/RoadMap/Month1/MVP-Scope-Lock.md`

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Phình phạm vi (lén thêm mobile/AGENTS.md) | Cao | Liệt kê tường minh phần "cố ý chưa làm"; mọi mở rộng = sửa file này có chủ đích. |
| Mâu thuẫn với Non-goals | TB | Đối chiếu trực tiếp ProductPRD §9 trước khi chốt. |

## 6. Verification plan
- Đọc chéo với `ProductPRD.md` §9 và `gate-policy.yaml`: không mâu thuẫn.
- Một người đọc file là biết tuần 2–4 phải/không phải làm gì.

## 7. Status
`WAITING_FOR_APPROVAL`
