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
- [ ] Output có đủ 5 phần đúng thứ tự agents-md.md.
- [ ] Phần "Gate mềm" liệt kê đúng `requires_docs` của `scope-locked` đọc từ `policy` (không hardcode).
- [ ] Có câu tuyên bố giới hạn enforcement mềm + lưu ý nhịp best-effort.
- [ ] Mỗi câu hỏi/section bám `script`/`taxonomy`, không bịa file ngoài taxonomy.
- [ ] Hàm thuần (string in → string out), không I/O.

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
`WAITING_FOR_APPROVAL`
