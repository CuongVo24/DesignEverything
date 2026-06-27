# Contract — M2-POLISH Vật chất hóa output generateAgentsMd + khóa drift

> **Tầng:** Adapter (AGENTS.md). Nguồn: Month 2 review (observation, xem [README](README.md)) + [Week-06](../../../../RoadMap/Month2/Week-06.md) ("sinh được AGENTS.md từ lõi") + [agents-md.md](../../../../Adapters/agents-md.md) + [w6a_agents_md_generator](../../month2/W6/w6a_agents_md_generator_contract.md).
>
> **Ưu tiên:** thấp / có thể defer. Làm cho đường AGENTS.md "thật" (có artifact soi được) và chống drift. Không chặn mốc.

## 1. Micro-task target
Output thật của [generateAgentsMd](../../../../../src/adapters/agents/generateAgentsMd.ts) (file `# AGENTS` 5 phần) hiện **chưa được ghi ra đĩa ở đâu** — file [.agents/AGENTS.md](../../../../../.agents/AGENTS.md) là rules `/design` viết tay, KHÁC hoàn toàn. Polish này: (1) vật chất hóa output generator ra một artifact cố định, soi được; (2) thêm test khóa "artifact đã commit == output generator hiện tại" để chống drift về sau.

## 2. Scope
**In scope:**
- `[NEW]` Một artifact generated cố định, ví dụ `Design/Adapters/generated/AGENTS.sample.md`, là output đúng của `generateAgentsMd({ script, policy })` chạy trên `script.yaml` + `gate-policy.yaml` lõi. Tên/đường dẫn chốt theo [agents-md.md](../../../../Adapters/agents-md.md); nếu spec chưa nói → đặt dưới `Design/Adapters/generated/` và ghi 1 dòng vào spec.
- `[NEW]` `src/adapters/agents/generateAgentsMd.artifact.test.ts` — load script+policy lõi, gọi `generateAgentsMd`, đọc artifact đã commit, `expect(generated).toBe(committed)`. Test đỏ ⇒ phải regenerate artifact (chống drift copy-paste — đúng cảnh báo cạm bẫy W6).
- Ghi 1 dòng trong README artifact (hoặc đầu file sample) rằng đây là **file sinh tự động, không sửa tay**.

**Out of scope**
- KHÔNG đổi `generateAgentsMd` (chữ ký + nội dung giữ nguyên — đây là materialize, không refactor logic).
- KHÔNG đụng [.agents/AGENTS.md](../../../../../.agents/AGENTS.md) viết tay (nó phục vụ mục đích khác — rules `/design` cho Claude Code).
- KHÔNG tự động trigger sinh file khi `progress.json` đổi (đó là known-limitation #2, thuộc tầm xa/Month 3+).

## 3. Checklist
- [x] Artifact generated được commit, header ghi rõ "sinh tự động, không sửa tay".
- [x] Test so khớp `generateAgentsMd(...) === artifact` đã commit.
- [x] Cố ý sửa 1 ký tự artifact → test đỏ; regenerate → xanh.
- [x] Đường dẫn artifact khớp (hoặc cập nhật) [agents-md.md](../../../../Adapters/agents-md.md).
- [x] Toàn bộ test xanh.

## 4. Interfaces / Files expected to change
- Không đổi interface `generateAgentsMd`.
- `[NEW]` `Design/Adapters/generated/AGENTS.sample.md` (output generator, ~40 dòng)
- `[NEW]` `src/adapters/agents/generateAgentsMd.artifact.test.ts` (~25 dòng)
- `[MODIFY]` `Design/Adapters/agents-md.md` — 1 dòng chốt đường dẫn artifact (nếu spec chưa có)

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---|---|
| Artifact phình thành "nguồn sự thật thứ hai" cạnh generator | TB | Header "sinh tự động"; test ép artifact luôn == output → generator vẫn là nguồn duy nhất. |
| Đường test load sai script/policy lõi | TB | Dùng đúng đường lõi như generator unit test hiện có; tái sử dụng loader. |
| Lẫn với `.agents/AGENTS.md` viết tay | Thấp | Đặt khác thư mục (`Design/Adapters/generated/`) + ghi rõ mục đích từng file. |

## 6. Verification plan
- `npx vitest run generateAgentsMd` — unit cũ + artifact drift-guard mới đều xanh.
- Nghịch đảo: sửa 1 ký tự artifact → `npx vitest run generateAgentsMd.artifact` đỏ; regenerate → xanh.
- `npm run typecheck && npm run lint && npm test` — toàn bộ xanh.

## 7. Status
`DONE`

### Quyết định thực tế & Nghiệm thu
- Đã vật chất hóa (materialize) kết quả sinh tự động từ `generateAgentsMd` ra tệp **[AGENTS.sample.md](file:///e:/DesignEverything/Design/Adapters/generated/AGENTS.sample.md)** đặt dưới thư mục `Design/Adapters/generated/`. Đầu tệp được ghi rõ lời cảnh báo sinh tự động và cấm chỉnh sửa thủ công để tránh biến nó thành nguồn sự thật thứ hai.
- Đã xây dựng tệp kiểm thử chống drift **[generateAgentsMd.artifact.test.ts](file:///e:/DesignEverything/src/adapters/agents/generateAgentsMd.artifact.test.ts)** để so khớp nội dung giữa hàm sinh tự động với tệp sample đã commit. Nếu có bất kỳ chỉnh sửa thủ công nào trên sample hoặc thay đổi logic generator mà không cập nhật lại, test sẽ lập tức báo đỏ (đã kiểm chứng qua sanity check sửa 1 ký tự).
- Đã cập nhật tệp **[agents-md.md](file:///e:/DesignEverything/Design/Adapters/agents-md.md)** để chỉ ra đường dẫn của artifact sample được sinh ra tự động.
- Chạy `npm test` xanh hoàn toàn 58/58 tests. Lint và typecheck hoàn toàn sạch lỗi.
