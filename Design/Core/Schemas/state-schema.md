# Schema — state (`progress.json`)

> Trạng thái của một phiên phỏng vấn. Hook đọc file này để biết "đã đi tới đâu" và có cho sinh code chưa.

## Tại sao cần file này
GATE không đọc được "ý định" hay chất lượng câu trả lời — nó chỉ thấy **file có chưa, state đủ chưa**. Vì thế enforcement phải dựa trên **artifact + state machine**, và `progress.json` chính là state machine đó.

## 1. Top-level shape
```json
{
  "version": "7.0.0",
  "phase": "interview",
  "session_id": "sess-8f3a921d",
  "state_revision": 4,
  "branch": null,
  "calibrate_mode": null,
  "current_step": "S4",
  "answered": ["S0", "S1", "S2", "S3"],
  "emitted_docs": ["00-vision.md", "01-personas.md", "02-scope.md"],
  "gates_passed": ["scope-locked"],
  "pending_turn_capability": {
    "token_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "session_id": "sess-8f3a921d",
    "operation_kind": "interview",
    "question_id": "S4",
    "subject_id": null,
    "expected_revision": 4,
    "issued_at": "2026-07-22T00:00:00Z",
    "expires_at": "2026-07-22T00:30:00Z",
    "consumed_at": null,
    "status": "active"
  },
  "last_user_turn_id": "turn-0004",
  "answered_len_at_last_turn": 4,
  "updated_at": "2026-06-25T00:00:00Z"
}
```

## 2. Field đã khoá

| Field | Kiểu | Bắt buộc | Ý nghĩa |
|---|---|---|---|
| `version` | string | ✓ | Phiên bản schema state. V7.0.0 khoá capability token. |
| `phase` | `interview` \| `docs-emitted` \| `ready-for-validation` | ✓ | Pha hiện tại của phiên. `ready-for-validation` chỉ nói phỏng vấn đã xong; không mở code gate. |
| `session_id` | string | ✓ | ID phiên phỏng vấn định danh duy nhất cho khoá capability. |
| `state_revision` | number | ✓ | Số revision tăng tự động sau mỗi giao dịch state commit. |
| `branch` | `<shape-id>` \| null | ✓ | `null` trước khi chốt câu chọn hình-hài (S7); sau S7 phải là một `<shape-id>` có thật trong registry [taxonomy.md](../../Content/taxonomy.md) (vd `web`, `mobile`, `hybrid`, `cli`). |
| `calibrate_mode` | `deep` \| `fast` \| null | ✓ | Chế độ giải thích do câu meta `CAL0` set: `deep` (giải thích kỹ, người mới) vs `fast` (đi nhanh, có kinh nghiệm); cũng quyết định độ gắt critic. `null` trước khi trả `CAL0`. |
| `current_step` | string \| null | ✓ | `id` câu đang chờ câu trả lời người thật. `null` khi đã hoàn tất phỏng vấn và chuyển pha. |
| `answered` | array\<string\> | ✓ | Các `id` đã nhận câu trả lời người thật và đã được xác nhận. |
| `emitted_docs` | array\<string\> | ✓ | Danh sách file doc đã được EMIT ra theo taxonomy. |
| `gates_passed` | array\<string\> | ✓ | Các gate đã mở vì artifact yêu cầu đã có. |
| `pending_turn_capability` | capability_record \| null | ✓ | Thẻ ủy quyền capability lượt dùng duy nhất (single-use turn capability). |
| `last_user_turn_id` | string \| null | ✓ | `id` lượt người thật đã uỷ quyền cho lần commit gần nhất. |
| `answered_len_at_last_turn` | number | ✓ | Độ dài `answered` ghi nhận ở lần `UserPromptSubmit` gần nhất. |
| `updated_at` | string (ISO-8601 UTC) | ✓ | Timestamp lần cập nhật state gần nhất. |

## 3. Mô hình hai lớp: ai được mutate state

Enforcement chia làm hai lớp tách bạch — **đây là điểm cốt lõi của schema này** (xem [DecisionLog.md](../../DecisionLog.md) D14):

- **Lớp ngữ nghĩa = skill/LLM (phía INJECT).** Là actor DUY NHẤT được diễn giải ý nghĩa câu trả lời. Sau khi skill hỏi câu hiện tại và người dùng xác nhận bản dịch ngược, skill thực hiện một "commit step": append `current_step` vào `answered`, set `branch` nếu vừa xong câu chọn hình-hài `S7`, set `calibrate_mode` nếu vừa xong câu meta `CAL0`, tính `current_step` kế tiếp, cập nhật `last_user_turn_id`. Việc "câu trả lời đã hợp lệ/đã xác nhận chưa" và "hình-hài dự án nào" là phán đoán của **skill**, không phải của hook.
- **Lớp deterministic = hook (phía GATE).** Hook KHÔNG đọc ý định và KHÔNG tự advance. Nó chỉ ép hai đảm bảo cứng:
  - `PreToolUse` chặn theo **artifact** (gate-policy) — độc lập hoàn toàn với ngữ nghĩa.
  - `UserPromptSubmit` là **bộ giới hạn nhịp**: mỗi lượt người thật, `answered` chỉ được dài thêm tối đa **1** so với lượt trước (đo bằng `answered_len_at_last_turn`). Nếu skill/model cố commit nhiều bước trong cùng một lượt → hook chặn/gắn cờ.

> Vì sao chia vậy: hook **không thể** phân loại hình-hài dự án hay chấm "câu trả lời hay/dở" từ text thô (xem [gate-policy.md](gate-policy.md) §1). Bắt nó làm thế là thiết kế sai. Đảm bảo cứng mà sản phẩm hứa = (1) gate dựa artifact + (2) một-bước-mỗi-lượt-người-thật — KHÔNG phải "hook validate từng câu".

## 4. Quy tắc chuyển bước (ai làm gì)

1. **`SessionStart` (hook)** khởi tạo state với:
   - `phase = "interview"`, `branch = null`, `calibrate_mode = null`, `current_step = "S0"`
   - các mảng rỗng
   - `last_user_turn_id = null`, `answered_len_at_last_turn = 0`
2. **`UserPromptSubmit` (hook) — chỉ giới hạn nhịp, KHÔNG advance.** Khi có lượt người thật mới `incoming_turn_id`:
   - kiểm `answered.length - answered_len_at_last_turn <= 1`; nếu vi phạm (lượt trước đã commit > 1 bước) → chặn/gắn cờ, không cho tiếp;
   - cập nhật `answered_len_at_last_turn = answered.length`;
   - inject câu `current_step` cho skill rồi dừng. Hook không đụng `answered`/`branch`.
3. **Skill (LLM) — commit step ngữ nghĩa.** Sau khi người dùng xác nhận bản dịch ngược cho `current_step`, và chỉ khi `incoming_turn_id != last_user_turn_id` (chưa commit cho lượt này):
   - append `current_step` vào `answered`;
   - set `last_user_turn_id = incoming_turn_id`;
   - tính `current_step` kế tiếp theo `script.yaml` (mọi `depends_on` đã thoả).
4. **Rẽ nhánh sau câu chọn hình-hài `S7` — skill set, hook validate.** Khi commit `S7`, skill gán `branch = <shape-id>` từ câu trả lời đã chốt, rồi chọn `current_step` đầu nhánh shape đó. Hook chỉ kiểm `branch` thuộc registry hình-hài và chỉ được set đúng một lần (xem §5).
5. **Kết thúc nhánh.** Khi câu cuối của nhánh được commit:
   - `phase = "docs-emitted"` nếu còn thiếu file doc đầu ra;
   - `phase = "ready-for-validation"` khi mọi doc bắt buộc đã emit và gate tương ứng đã mở; lúc này `current_step = null`. Đây chưa phải là quyền code: emit phải tạo handoff execution-state rồi `/build validate` mới có thể mở `ready-to-execute`.

## 5. Bất biến

- Mỗi `last_user_turn_id` chỉ gắn với đúng **một** lần append vào `answered` (một-bước-mỗi-lượt-người-thật).
- Tại thời điểm một `UserPromptSubmit` mới fire, `answered.length` không vượt `answered_len_at_last_turn + 1`.
- `answered`, `emitted_docs`, `gates_passed` là append-only trong một phiên; không xoá phần tử để "lùi" lịch sử âm thầm.
- `answered` không được chứa `id` ngoài `interview-script`.
- `branch` là `null` hoặc một `<shape-id>` có thật trong registry hình-hài; một khi đã khác `null` thì **không được đổi** trong cùng phiên — rẽ nhánh là quyết định một chiều, muốn đổi shape phải sửa doc có chủ đích rồi chỉnh state tường minh.
- Nếu `branch != null` thì câu chọn hình-hài `S7` phải nằm trong `answered`.
- Nếu `phase = "ready-for-validation"` thì mọi gate artifact cần cho build phải xuất hiện trong `gates_passed`; điều này không thay thế semantic validation.

## 6. Luật validate

1. Mọi field ở mục 2 đều bắt buộc phải tồn tại, kể cả khi mang giá trị `null`.
2. `phase` chỉ nhận một trong ba giá trị đã khoá.
3. `updated_at` phải là chuỗi ISO-8601 UTC hợp lệ.
4. `answered`, `emitted_docs`, `gates_passed` không chứa phần tử trùng lặp.
5. `current_step` là `null` hoặc phải là `id` có thật trong `interview-script`.
6. `last_user_turn_id` là `null` khi chưa nhận lượt người thật nào; nếu có giá trị thì phải là string không rỗng.
7. `emitted_docs` và `gates_passed` chỉ được chứa tên tài nguyên có thật trong taxonomy và gate-policy lõi.
8. `answered_len_at_last_turn` là số nguyên `>= 0` và `<= answered.length`.
9. `calibrate_mode` ∈ {`deep`, `fast`, `null`}; chỉ khác `null` sau khi `CAL0` ∈ `answered`.

## V3 Execution Expansion — target 4.0.0

Trong khuôn khổ mở rộng thực thi V3, tệp `progress.json` giữ nguyên mục đích quản lý lịch sử phỏng vấn. Toàn bộ thông tin thực thi được theo dõi độc lập qua tệp `.design-everything/execution-state.json`.

## B3d/B3e — quan hệ với emit manifest và deepen (2026-07-24)

Từ B3d, tier-1 doc set không còn được coi là "đã emit" chỉ vì `progress.emitted_docs` khớp danh sách — nguồn xác thực là `.design-everything/emit-manifest.json` (`activated_at !== null`), xem [emitManifest.ts](../../../src/core/schemas/emitManifest.ts). `progress.json` vẫn là state phỏng vấn; nó không tự chứa manifest, nhưng bất kỳ luồng nào cần biết "tier-1 đã sẵn sàng để mở deepen chưa" phải đọc cả hai: `progress.current_step === null` (phỏng vấn xong) VÀ `emit-manifest.json.activated_at` (đã activate) — xem [`canStartDeepen`](../../../src/core/deepenLifecycle.ts) và [taxonomy-tier2.md](../../Content/taxonomy-tier2.md#vòng-đời-deepen-và-ảnh-hưởng-lên-execution-state-b3e). Tier-2 dùng manifest riêng theo từng module (`emit-manifest-tier2-${module}.json`, kênh `tier2-${module}` — xem [`tier2ChannelFor`](../../../src/core/emitTier2.ts)) qua cùng cơ chế transaction ở B3d, không lẫn với manifest tier-1 lẫn giữa các module tier-2 với nhau.

`.design-everything/deepen-state.json` (schema: [deepenState.ts](../../../src/core/schemas/deepenState.ts)) là canonical store riêng cho tier-2, ghi qua [`transactDeepenStore`](../../../src/core/deepenState.ts) — CAS + cùng workspace lock (`interview-state.lock`) với B1b's `transactInterviewStore`, nên một commit interview và một commit deepen không bao giờ race nhau. Mỗi entry trong `modules[x].answered` (B3e §3, 2026-08-08) mang `generation` (bắt đầu từ 1) và `supersedes` (generation nó thay thế, `null` cho generation 1): commit đầu tiên của một instance push generation 1; một **rerun** (amendment, không phải overwrite) push generation mới, giữ nguyên entry cũ trong mảng — "đã answered" cho một instance nghĩa là tồn tại ≥1 entry, "hiện hành" là entry có `generation` cao nhất. Nội dung answer text vẫn chỉ có một bản "hiện hành" trong `Design/.interview/answers.json` (mọi reader hiện có — renderers, `computeSourceDigest`, `emitTier2` — không đổi cách đọc); mỗi generation (kể cả bản đầu) còn được ghi append-only vào `Design/.interview/deepen-answer-history.json` nên bản cũ không bao giờ bị ghi đè mất.

Cấu trúc chi tiết của `execution-state.json`:
- `version`: string (e.g. "4.0.0")
- `phase`: `plan-validating` | `ready-to-execute` | `executing` | `verifying` | `repairing` | `blocked` | `ready-to-ship`
- `active_task`: string | null (id của task đang chạy)
- `active_milestone`: string | null (id của milestone đang chạy)
- `completed_tasks`: array<string> (danh sách id các task đã hoàn thành)
- `evidence`: array<evidence_record> (bằng chứng nghiệm thu append-only)
- `block_reason`: `BlockRecord` | null. `BlockRecord` gồm `kind`, `reason_code`, `origin_phase`, `task_id`, `recoverable_by`, `detail`, `created_at` và `remediation` bind chính xác `actions`, `paths`, `command`, `task_id`, `plan_revision`.
- `handoff` (tùy chọn chỉ để đọc state cũ): binding emit Tier-1 mới gồm `manifest_generation_id`, manifest/plan/docs digest, canonical interview revision và thời điểm activate. State mới tạo từ emit luôn có binding này.
- `updated_at`: string (ISO-8601 UTC)

### B1c — handoff invariant

- `ready-to-build` là tên legacy duy nhất được `migrateInterviewStore` đổi một chiều thành `ready-for-validation`; canonical store không nhận tên cũ.
- Tier-1 emit production ghi journal `handoff-pending` trước khi tạo `.design-everything/execution-state.json`; journal chỉ chuyển `done` sau khi state `plan-validating` mang binding manifest/plan/docs/interview revision đã bền vững.
- Recovery chỉ rollback execution state khi binding của nó khớp đúng journal đang dang dở. Không có manifest-only self-heal: manifest active nhưng state thiếu/corrupt là lỗi sức khỏe và mọi code action phải deny.
- `validated_*_digest` để trống tại handoff. Chúng chỉ được lấp khi semantic validation trả đủ plan/docs/validation digest; artifact gate pass không đồng nghĩa plan validation pass.

### B1d — blocked remediation invariant

- Chỉ `validation`, `artifact-integrity`, `snapshot-stale` có thể được validation recovery gỡ. `verification-failed`, `verification-aborted`, `review-incomplete` và `policy-corrupt` giữ nguyên task/evidence và đi theo `recoverable_by` đã persist.
- Blocked action chỉ nhận action/path/command đã bind trong `remediation`; mismatch task, revision hay command fail closed. Một boolean `pass=true` thiếu ba validation digest không thể mở `ready-to-execute`.

Định nghĩa `evidence_record`:
- `task_id`: string
- `command`: string (lệnh kiểm chứng đã chạy)
- `exit_code`: number (exit code của lệnh)
- `expected_result`: string (kết quả kỳ vọng)
- `observed_result`: string (kết quả thực tế quan sát được)
- `timestamp`: string (ISO-8601 UTC)
- `artifact_paths`: array<string> (đường dẫn các file thay đổi/bằng chứng)
- `actor`: string

## Changelog
| Version | Thay đổi |
|---|---|
| 0.1.0 | Khoá schema ổn định cho Batch 1: chốt field `progress.json`, quy tắc chuyển bước và bất biến một-lượt-người-thật-một-bước. |
| 0.1.0 (amend, FB1, 2026-06-26, pre-code) | Thêm field `answered_len_at_last_turn`; tách rõ lớp **skill** (commit ngữ nghĩa: append `answered`, set `branch`) vs lớp **hook** (giới hạn nhịp + gate artifact, không advance, không đọc ý định); chốt `branch` do skill set và là một chiều. Không bump vì chưa có code tiêu thụ. Xem DecisionLog D14. |
| 2.0.0 | 2026-07-09 | `branch` mở thành `<shape-id>` theo registry hình-hài (không còn enum web/mobile); rẽ nhánh chuyển từ sau `S6` sang sau câu chọn hình-hài `S7`; thêm field `calibrate_mode` (chế độ giải thích do câu meta `CAL0` set, D23). MAJOR đồng bộ với interview-script. Xem DecisionLog D21–D23. |
| 4.0.0 | 2026-07-13 | Thêm tệp độc lập `execution-state.json` và cấu trúc state machine cho thực thi task & lưu evidence nghiệm thu. |
