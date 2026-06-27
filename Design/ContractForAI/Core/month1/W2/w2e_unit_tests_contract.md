# Contract — W2E Unit test engine lõi

> **Tầng:** Lõi/test. Nguồn: [Week-02](../../../../RoadMap/Month1/Week-02.md) + [TestStrategy.md](../../../../Conventions/TestStrategy.md) (tầng 1 + tầng 2) + fixtures W1D + golden web/mobile.

## 1. Micro-task target
Bộ unit test Vitest phủ engine lõi (W2A–W2D) trên fixture web và các ca biên state/gate, để contract/schema thành logic kiểm được bằng máy.

## 2. Scope
**In scope** — `src/core/*.test.ts`:
- **Schema/content (tầng 1):** `script.yaml` load được, 17 câu, `id` duy nhất; mọi `target_doc` tồn tại trong `taxonomy.md`; mọi `gate` trỏ gate có thật trong `gate-policy.yaml`; `gate-policy.yaml` khớp ví dụ trong `gate-policy.md`.
- **advanceState:** chuỗi S0→S6→W1..W5 (web); commit trùng `userTurnId` → throw; S6 thiếu `branchChoice` → throw; đổi `branch` → throw.
- **rate-limit:** `checkRate` answered tăng 2 → fail; tăng 1/0 → ok.
- **gate:** thiếu `02-scope.md` → đóng + `isBlocked` chặn; đủ 3 doc → mở + không chặn.
- **loadProgress:** fixture `invalid/*` → throw đúng; thiếu file → state S0.

**Out of scope**
- Test hook Claude Code thật (W3). Test EMIT (W4).

## 3. Checklist
- [x] Test phủ đủ 5 nhóm trên, dùng fixture W1D + golden.
- [x] Có ca web hoàn chỉnh.
- [x] Có ca `answered_len_at_last_turn` vi phạm.
- [x] Có ca thiếu doc mở gate thất bại.
- [x] `npx vitest run` xanh; coverage engine lõi hợp lý.

## 4. Interfaces / Files expected to change
- `[NEW]` `src/core/{loadScript,loadProgress,advanceState,evaluateGate}.test.ts`
- `[NEW]` `src/core/contentIntegrity.test.ts` cho tầng 1 đối chiếu chéo taxonomy/gate.

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Test chỉ chạy "đường bằng" | TB | Bắt buộc có ca biên (rate-limit, branch, missing-doc, invalid state). |
| Đối chiếu taxonomy bằng chuỗi thô | TB | Parse danh sách file từ `taxonomy.md` map, so theo basename. |

## 6. Verification plan
- `npx vitest run` xanh trên nhánh web.
- Mỗi bất biến state-schema §5 có ít nhất một test phủ.

## 7. Status
`DONE`

### Quyết định thực tế & Nghiệm thu
- Đã xây dựng bộ unit test toàn diện cho lõi động cơ phỏng vấn và đánh giá cổng chặn (25 test cases trong 6 file):
  - `loadScript.test.ts`: Kiểm chứng parse YAML kịch bản phỏng vấn thật, bắt lỗi trùng ID, depends_on nghịch hoặc hướng tới tương lai, và thứ tự câu hỏi nhánh trước S6.
  - `loadProgress.test.ts`: Kiểm chứng tự khởi tạo S0, kiểm chứng validate cấu trúc qua Zod cho các template fixtures, và kiểm chứng việc đọc/ghi dữ liệu trạng thái.
  - `advanceState.test.ts`: Kiểm chứng các chuỗi chuyển đổi trạng thái (Web & Mobile), bắt lỗi double commit, bắt lỗi thay đổi nhánh và kiểm nhịp rate-limit.
  - `evaluateGate.test.ts`: Kiểm chứng đóng/mở gate artifact-based, chặn tool action, và chuẩn hóa đường dẫn HĐH.
  - `contentIntegrity.test.ts`: Kiểm chứng đối chiếu chéo (target_doc thuộc taxonomy.md, gate trỏ đúng gate-policy.yaml).
  - `smoke.test.ts`: Được rút gọn làm smoke test nhẹ nhàng xác thực path alias `@/`.
- Toàn bộ suite test chạy thành công sạch sẽ. typecheck, lint, build đều xanh.
