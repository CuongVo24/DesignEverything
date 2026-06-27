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
- [ ] Test phủ đủ 5 nhóm trên, dùng fixture W1D + golden.
- [ ] Có ca web hoàn chỉnh.
- [ ] Có ca `answered_len_at_last_turn` vi phạm.
- [ ] Có ca thiếu doc mở gate thất bại.
- [ ] `npx vitest run` xanh; coverage engine lõi hợp lý.

## 4. Interfaces / Files expected to change
- `[NEW]` `src/core/{loadScript,loadProgress,advanceState,evaluateGate}.test.ts`
- `[NEW]` (nếu cần) `src/core/contentIntegrity.test.ts` cho tầng 1 đối chiếu chéo taxonomy/gate.

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Test chỉ chạy "đường bằng" | TB | Bắt buộc có ca biên (rate-limit, branch, missing-doc, invalid state). |
| Đối chiếu taxonomy bằng chuỗi thô | TB | Parse danh sách file từ `taxonomy.md` map, so theo basename. |

## 6. Verification plan
- `npx vitest run` xanh trên nhánh web.
- Mỗi bất biến state-schema §5 có ít nhất một test phủ.

## 7. Status
`WAITING_FOR_APPROVAL`
