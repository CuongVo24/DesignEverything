# G0 — Interface note: emit warning-acknowledgement capability

> Không phải contract, không đổi trạng thái Spec/Implementation/Proof của B3b. Đây là chữ ký chung
> để A1-01 (capability), A1-02 (provenance renderer), A1-03 (core gate), A1-04 (CLI protocol),
> A1-05 (fixture), A1-06 (skill) code khớp nhau mà không phải đợi nhau merge trước mới biết shape.
> Nguồn quyết định: `Design/RoadMap/MasterSequencingPlan.md` Wave A1 (kế hoạch mở lane 8.1.0,
> 2026-08-09) và `Design/ContractForAI/Core/v1-fix-bugs/B3/b3b_derived_content_provenance_quality_contract.md` §7.

## 0. Vì sao cần văn bản này

`activateTier1Emit` ([emitTier1.ts:98](../../../../src/core/emitTier1.ts:98)) hiện tính
`provenanceWarnings` ([dòng 173](../../../../src/core/emitTier1.ts:173)) nhưng chỉ ghi log
append-only *sau khi* `activateEmit` đã chạy ([dòng 233](../../../../src/core/emitTier1.ts:233)) —
không nhánh nào chặn. Comment tại dòng 46-58 tự khai lý do: một bản chặn cứng trước đó phá ~11 test
dùng chung fixture `seedEmitReadyWorkspace`. Việc này khoá lại shape đúng một lần, để A1-03 dựng gate
thật và A1-05 sửa fixture cùng lúc, không phải patch hẹp lần nữa.

**Quyết định đã khoá ở phiên duyệt plan 8.1.0 (không mở lại ở đây):**
- Provenance thiếu = **deterministic reject** theo
  [QualityRubric.md §G](../../../Content/QualityRubric.md) (dòng 68 liệt kê `thiếu source_refs`
  dưới nhóm reject, không phải `needs_user_ack`). Ack **không được phép** đè việc này.
- Vì vậy: **A1-02 phải sửa renderer** để derived block sinh `source_refs` machine-readable thật
  trước — không chỉ tin cậy regex `/^>\s*Nguồn:/m` hiện có ở
  [emitTransactionValidate.ts:125](../../../../src/core/emitTransactionValidate.ts:125). Sau khi
  A1-02 xong, cảnh báo `derived-recipe-provenance-missing` được nâng từ `severity: 'warning'` lên
  `'error'` tại [emitTransactionValidate.ts:131-137](../../../../src/core/emitTransactionValidate.ts:131)
  — trở thành `validation.pass = false`, tự động chặn ở nhánh `EMIT_VALIDATION_FAILED`
  ([emitTier1.ts:145-152](../../../../src/core/emitTier1.ts:145)) mà **không cần** capability gì cả.
- **Capability ack (A1-01) chỉ áp cho lớp warning còn lại là chủ quan/overrideable** — tức nhóm
  `needs_user_ack` mà rubric G đã liệt: persona chung chung (S2), mọi mục Must (S3), offline/sync
  (M2), lên store thật (M5), realtime (W5), phân phối đa nền tảng (C5) — các cảnh báo này tới từ
  `warning_rules` trong `script.yaml`, được `validateAnswer` phát hiện ở bước **commit** (đã có
  capability thật qua `--ack-warnings` boolean, xem §5 dưới — cũng cần nâng cấp) và không phải thứ
  `activateTier1Emit` tự phát hiện lúc emit.

Nói cách khác: **A1-03 không dựng "ack gate cho provenance ở emit".** A1-03 dựng đúng một việc —
đảm bảo `EMIT_VALIDATION_FAILED` (sau khi A1-02 nâng severity) chặn *trước* `activateEmit` và dọn
sạch staging, không rò rỉ docs thiếu nguồn ra `docs/`. Không có token nào cho nhánh này vì đây là
reject cứng, không phải ack.

## 1. Nơi capability ack thật sự cần (phạm vi đã thu hẹp)

Ack capability áp dụng cho **hai nơi hiện dùng boolean flag thô**, cả hai đã tồn tại production
nhưng đúng như bonus-plan tự ghi nhận
([plan-v1-bonus-tasks.md:919-925](../plan-v1-bonus-tasks.md:919)): *"không có gì chặn model tự ý"*
set flag.

1. **`commitInterviewAnswer`** ([interviewApplicationServices.ts:182,229](../../../../src/core/interviewApplicationServices.ts:182))
   — nhận `ackWarnings?: boolean` thô; CLI `commit --ack-warnings` chỉ là `argv.includes(...)`
   ([cliOps/commit.ts:12](../../../../src/adapters/shared/cliOps/commit.ts:12)).
2. Bất kỳ nhánh `needs_user_ack` nào tương lai muốn tái dùng pattern này ở emit-adjacent flow
   (ví dụ nếu B3b sau này quyết định một số derived warning không phải deterministic reject).

A1-01 dựng **một** module capability dùng chung cho cả hai, không phải hai bản riêng.

## 2. Schema token (khoá cho A1-01)

Mirror đúng shape đã có ở `turnCapability.ts`
([turnCapabilityRecordSchema](../../../../src/core/turnCapability.ts:4)), không phát minh format
mới:

```ts
interface AckCapabilityRecord {
  token_hash: string;            // sha256(token), không lưu token thô — giống turnCapability
  workspace_root: string;        // absolute path đã canonicalize, chống nhầm workspace
  session_id: string;
  warning_digest: string;        // sha256(JSON.stringify(sorted warning ids + messages))
  interview_state_revision: number; // bind vào canonical.state_revision tại thời điểm phát hành
  input_digest: string;          // digest answers/branch — đã có sẵn ở emitTier1.ts:133 cho emit;
                                  // với commit là digest của chính answer đang xét
  generation_id: string | null;  // với emit: StagedGeneration.generation_id; với commit: null
  issued_at: string;              // ISO datetime
  expires_at: string;             // ISO datetime, TTL mặc định 1800s (giống turnCapability)
  consumed_at: string | null;
  status: 'active' | 'consumed' | 'invalidated' | 'expired';
  nonce: string;                  // randomBytes(16).toString('hex') — chống đoán generation kế tiếp
}
```

**Verify phải kiểm đủ, theo đúng thứ tự lỗi của `verifyTurnCapability`
([turnCapability.ts:91-190](../../../../src/core/turnCapability.ts:91)):** missing → forged (hash
mismatch) → replay (đã consumed) → expired → wrong workspace/session → **wrong warning_digest**
(input đổi sau khi phát hành token) → **wrong interview_state_revision** (interview mutate song
song) → wrong generation_id (chỉ với emit). Mỗi nhánh một `reason_code` riêng, không gộp.

## 3. Issuer + consume flow

- **Issue:** khi `commit`/`emit` phát hiện `needs_user_ack`/warning overrideable lần đầu (không có
  token hợp lệ trong request), trả typed refusal kèm token mới — **không** activate/commit gì.
- **Consume:** caller gửi lại với `--ack-token <token>`. Verify pass → tiêu thụ đúng một lần
  (`status: 'consumed'`, `consumed_at` set) **trong cùng transaction** với hành động chính (commit
  answer / activate emit) — không tách hai bước ghi riêng để tránh cửa sổ race.
- **Input đổi sau khi issue:** nếu answer/derived content thay đổi (digest lệch) hoặc
  `interview_state_revision` lệch (interview bị mutate song song) → token cũ **tự động invalid**,
  không cần session nào chủ động revoke.
- **Lưu trữ:** theo đúng convention hiện có của B3b's log — file JSON riêng dưới
  `.design-everything/`, ví dụ `.design-everything/ack-challenges.json` (mirror
  `emit-warning-acknowledgements.json`/`deepen-answer-history.json` đã có). Không lưu trong
  `interviewStore.ts`'s canonical envelope — ack challenge không phải interview turn, không cần CAS
  chung với answer transaction, chỉ cần file riêng + `expected_revision` field để tự phát hiện stale.

## 4. Side effect khi `--slots-file` đã ingest mà emit bị deny

`emitTier1`/CLI có thể nhận `--slots-file` để nạp slot trước khi validate. Nếu validate fail
(provenance reject cứng theo §0, hoặc warning cần ack chưa có token): **slots đã ingest vẫn được
giữ** (đó là input hợp lệ, không phải lỗi) nhưng **không** activate. Response phải phân biệt rõ hai
việc: "input của bạn đã ghi nhận" vs "output chưa được publish" — không để caller hiểu nhầm slots
ingest = docs đã activate.

## 5. Typed envelope + exit code + cleanup staging

- **Provenance reject cứng (A1-02/A1-03):** `reason_code: 'EMIT_VALIDATION_FAILED'`
  (đã có sẵn, [emitTier1.ts:146-151](../../../../src/core/emitTier1.ts:146)) — không đổi tên, chỉ
  đổi điều kiện trigger (severity error thay vì chỉ warning). Exit class validation/policy (`2`) qua
  `cliResult.ts`, không đổi.
- **Warning cần ack chưa có token:** `reason_code: 'EMIT_NEEDS_WARNING_ACK'` (mới, A1-04) —
  cùng exit class `2`. Với `commit`, giữ `ANSWER_NEEDS_USER_ACK` đã có
  ([interviewApplicationServices.ts:234](../../../../src/core/interviewApplicationServices.ts:234)),
  chỉ nâng cấp để nó nhận `--ack-token` thay vì `--ack-warnings` boolean.
- **Cleanup staging:** mọi nhánh deny ở emit phải xoá `staging/<generation_id>/` đã tạo ở
  `prepareEmit` ([emitTransactionStage.ts:44-45](../../../../src/core/emitTransactionStage.ts:44)) —
  A1-03 sở hữu việc này. Không để staged generation rác lại khi bị từ chối.

## 6. Điều kiện đóng A1-07 (nhắc lại, không lặp full DoD)

A1-07 **không được** nâng B3b lên `IMPLEMENTED` nếu thiếu bất kỳ điều nào: (a) A1-02 chứng minh
`source_refs` machine-readable sinh thật từ renderer, không phải test giả; (b) A1-03 chứng minh deny
chạy trước `activateEmit` và dọn staging; (c) capability ack ở §2-3 có test single-use + expiry +
digest-mismatch-invalidates; (d) A1-05 không sửa production template để né warning.
