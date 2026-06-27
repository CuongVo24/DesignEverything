# Contract — W6A Generator sinh AGENTS.md từ lõi (bậc B)

> **Tầng:** Adapter. Nguồn: [Week-06](../../../../RoadMap/Month2/Week-06.md) + [agents-md.md](../../../../Adapters/agents-md.md) (đặc tả 5 phần) + [Contract.md](../../../../Core/Contract.md) + [taxonomy](../../../../Content/taxonomy.md) + [gate-policy.md](../../../../Core/Schemas/gate-policy.md).

## 1. Micro-task target
Hàm thuần sinh nội dung `AGENTS.md` từ lõi (script + gate-policy + taxonomy), đủ **5 phần** theo agents-md.md, gồm tuyên bố giới hạn enforcement **mềm** rõ ràng. Sinh từ một nguồn — không copy-paste để tránh drift với lõi.

## 2. Scope
**In scope** — `src/adapters/agents/`:
- `[NEW]` `generateAgentsMd(opts: { script: Script; policy: GatePolicy }): string` — trả về markdown đủ 5 phần theo agents-md.md §"Mẫu nội dung bắt buộc":
  1. Tại sao repo này dùng chế độ phỏng vấn trước
  2. Nguồn sự thật phải đọc (Design/VibeCode.md, Contract.md, script.yaml, taxonomy.md)
  3. Cách hỏi từng bước (1 câu/lượt, dịch ngược, rót vào doc)
  4. Gate mềm trước khi code (map từ `policy.gates`: liệt kê `requires_docs` của gate `scope-locked`)
  5. Cách emit docs (đúng taxonomy + anchor `status=planned`)
- Câu giới hạn enforcement bắt buộc (agents-md.md §"Cách nói đúng về giới hạn"): gate là chỉ dẫn mạnh, **không** chặn cứng; cần deterministic → dùng Claude Code adapter. Kèm lưu ý nhịp 1-bước/lượt là best-effort ở bậc B.

**Out of scope**
- KHÔNG ghi file ra đĩa trong hàm core (caller/CLI làm). KHÔNG đụng adapter Claude Code (Month 1).
- KHÔNG hardcode chi tiết dự án cụ thể vào template. KHÔNG test trên harness thật (đó là W6B).
- KHÔNG tự chế rule ngoài Contract lõi (bất biến §5).

## 3. Checklist
- [x] Output có đủ 5 phần đúng thứ tự agents-md.md.
- [x] Phần "Gate mềm" liệt kê đúng `requires_docs` của `scope-locked` đọc từ `policy` (không hardcode).
- [x] Có câu tuyên bố giới hạn enforcement mềm + lưu ý nhịp best-effort.
- [x] Mỗi câu hỏi/section bám `script`/`taxonomy`, không bịa file ngoài taxonomy.
- [x] Hàm thuần (string in → string out), không I/O.

## 4. Interfaces / Files expected to change
```ts
export function generateAgentsMd(opts: { script: Script; policy: GatePolicy }): string;
```
- `[NEW]` `src/adapters/agents/generateAgentsMd.ts` (~120 dòng) + `.test.ts`
- `[MODIFY]` `src/core/index.ts` hoặc adapter index — export

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Bán quá lời "chặn cứng" như bậc A | Cao | Câu giới hạn enforcement bắt buộc + test assert có mặt. |
| Drift giữa generator và gate-policy lõi | Cao | Đọc `requires_docs` từ `policy` runtime, không hardcode chuỗi file. |
| Tự chế rule ngoài Contract | TB | Chỉ render từ script/policy/taxonomy; review theo Contract §5. |

## 6. Verification plan
- `npx vitest run generateAgentsMd` — assert có 5 heading, có câu giới hạn enforcement, liệt kê đúng 3 doc của `scope-locked`.
- Snapshot output vs đặc tả agents-md.md §"Mẫu chỉ dẫn inject".
- `npm run typecheck && npm run lint && npm test` — xanh.

## 7. Status
`DONE`

### Quyết định thực tế & Nghiệm thu
- Đã cài đặt bộ generator sinh nội dung `AGENTS.md` tại **[generateAgentsMd.ts](file:///e:/DesignEverything/src/adapters/agents/generateAgentsMd.ts)**:
  - Sinh đầy đủ và chính xác 5 phần theo chuẩn `agents-md.md` cấu trúc: 1. Tại sao dùng phỏng vấn trước; 2. Nguồn sự thật phải đọc; 3. Cách hỏi từng bước; 4. Gate mềm trước khi code; 5. Cách emit docs.
  - Phần "Gate mềm" hoàn toàn động, tự động đọc và kết xuất danh sách `requires_docs` của từng cổng chặn (ví dụ: `scope-locked` yêu cầu `00-vision.md`, `01-personas.md`, `02-scope.md`) từ tệp cấu hình `policy` tại thời điểm chạy (runtime) thay vì hardcode tĩnh.
  - Tích hợp chặt chẽ tuyên bố giới hạn "enforcement mềm" đúng tinh thần Rubric: gate trên các harness đọc rule chỉ mang tính chỉ dẫn mạnh thay vì chặn cứng, hướng dẫn dùng Claude Code adapter nếu cần cơ chế chặn deterministic. Ghi nhận nhịp 1-bước/lượt trên harness mềm chỉ là best-effort khuyến nghị.
  - Xuất bản hàm thuần `generateAgentsMd` qua **[src/core/index.ts](file:///e:/DesignEverything/src/core/index.ts)**.
- Viết bộ unit test chuyên dụng tại **[generateAgentsMd.test.ts](file:///e:/DesignEverything/src/adapters/agents/generateAgentsMd.test.ts)** để kiểm thử sự hiện diện của 5 phần, tuyên bố giới hạn và các tài liệu của gate `scope-locked`.
- Toàn bộ 49 unit và integration tests đều hoàn thành xanh sạch 100%. Lint và Typecheck hoàn tất không có lỗi.
