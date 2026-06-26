# Contract — W1D Bố trí test fixtures

> **Tầng:** Adapter/test (dữ liệu test, chưa viết test logic). Nguồn: [Week-01](../../../../RoadMap/Month1/Week-01.md) + [state-schema.md](../../../../Core/Schemas/state-schema.md) + [gate-policy.yaml](../../../../Content/interview-script/gate-policy.yaml).

## 1. Micro-task target
Chuẩn bị sẵn bộ dữ liệu fixture dưới `test/fixtures/` để W2 chỉ việc viết test, không phải bịa input. Bao trùm cả nhánh web và mobile, các state mẫu, và các ca gate.

## 2. Scope
**In scope**
- `test/fixtures/progress/` — vài `progress.json` mẫu hợp lệ theo state-schema (gồm `answered_len_at_last_turn`): `init-s0.json` (mới khởi tạo), `mid-web.json` (đang ở W2, branch=web), `ready-to-build.json` (phase ready, current_step=null).
- `test/fixtures/progress/invalid/` — vài state SAI để test fail rõ: thiếu field, `branch` ngoài enum, `answered_len_at_last_turn > answered.length`, double-step (answered tăng 2 so với baseline).
- `test/fixtures/gate/` — ca gate: `docs-missing/` (thiếu `02-scope.md` → gate đóng), `docs-complete/` (đủ 3 doc → gate mở).
- `README.md` trong `test/fixtures/` giải thích mỗi fixture dùng cho ca test nào; trỏ tới golden web (W1C) + golden mobile làm nguồn docs expected.

**Out of scope**
- Viết test thật (`*.test.ts`) → W2.
- Sửa schema/golden.

## 3. Checklist
- [ ] 3 `progress.json` hợp lệ + ≥3 invalid, mỗi cái minh hoạ đúng một bất biến.
- [ ] 2 thư mục gate (đóng/mở) với đúng/đủ doc theo `requires_docs` của `scope-locked`.
- [ ] `test/fixtures/README.md` map fixture → ca test, trỏ golden web/mobile.
- [ ] Mọi `progress.json` mẫu validate được bằng tay theo state-schema §6.

## 4. Interfaces / Files expected to change
- `[NEW]` `test/fixtures/progress/{init-s0,mid-web,ready-to-build}.json`
- `[NEW]` `test/fixtures/progress/invalid/*.json`
- `[NEW]` `test/fixtures/gate/docs-missing/`, `test/fixtures/gate/docs-complete/`
- `[NEW]` `test/fixtures/README.md`

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Fixture lệch schema sau FB1 | TB | Bám đúng state-schema §1–§2 (đã có `answered_len_at_last_turn`). |
| Trùng lặp dữ liệu với golden | Thấp | Gate fixture chỉ chứa **đủ** doc cần cho ca, trỏ golden cho docs expected đầy đủ. |

## 6. Verification plan
- Tự validate từng `progress.json` theo state-schema §6 (đặc biệt luật 8 cho `answered_len_at_last_turn`).
- Ca `docs-complete/` chứa đúng `00-vision.md`, `01-personas.md`, `02-scope.md`.

## 7. Status
`WAITING_FOR_APPROVAL`
