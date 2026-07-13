# Contract — B11d Emitted-plan executability

> Tầng: Lõi. Nguồn: V3 Post-implementation Review F11-04, D36. Phụ thuộc: B11a.

## 1. Micro-task target

Ngăn emitter tạo execution plan không thể chạy ở folder trống: không command/path/manifest giả và không mở implementation khi môi trường chưa được chứng minh.

## 2. Scope

**In scope**

- Thay task hardcode `node --version`, `npm run build`, `npm test` và `src/**` bằng một task discovery/preflight trung lập, chỉ đọc workspace và ghi evidence dưới `.design-everything/`.
- Plan emitted không có task implementation, verification command hay `allowed_paths` cho source/config cho đến khi có capability evidence hoặc profile đã xác nhận; trạng thái hợp lệ là `blocked` với remediation, không phải pass giả.
- Capability evidence tối thiểu có `source` (`existing-manifest`, `installed-runtime`, `user-confirmed`) và `checked_at`; command/path phải tham chiếu capability id đó.
- Khi plan được phép scaffold theo capability, `allowed_paths` chứa chính xác manifest/config/source cần tạo (ví dụ không cấp `src/**` nhưng lại đòi package script); không thêm glob rộng hơn task.
- 09-execution-plan prose và JSON cùng nói rõ discovery đang block điều gì, không mô tả task generic là build-ready.

**Out of scope**

- Không chọn framework/package manager từ câu trả lời mơ hồ; V4 B13a/B13b sẽ tạo ProjectProfile và stack-specific synthesis.
- Không auto-install runtime/dependency hay thực hiện network action.

## 3. Checklist

- [ ] Empty CLI/Web/Mobile fixture không còn nhận command `npm run build`/`npm test` hoặc source path giả trước discovery.
- [ ] Mọi `VerificationCommand`, allowed path và expected artifact trong emitted JSON có capability source truy ngược được; validator B11a reject thiếu reference.
- [ ] Không có task scaffold nào thiếu path cho manifest/config mà command của task/sau đó cần.
- [ ] 09 và JSON dùng cùng task id/status/capability wording; snapshot test so sánh semantic fields chứ không chỉ file tồn tại.
- [ ] User nhận một remediation rõ: kiểm môi trường, xác nhận stack, hoặc amend plan — không tự bịa lệnh cài đặt.

## 4. Interfaces / Files expected to change

- [MODIFY] `src/core/schemas/executionPlan.ts`, ≤120 dòng: `CapabilityEvidence`, task capability references và blocked discovery status.
- [MODIFY] `src/core/emit.ts`, ≤200 dòng: sinh discovery plan/capability links, bỏ Node/npm/path hardcode.
- [MODIFY] `Design/Content/doc-templates/09-execution-plan.md`, ≤100 dòng: wording discovery/block/remediation đồng bộ JSON.
- [MODIFY] `src/core/emitTree.test.ts` và fixtures web/mobile/cli, ≤200 dòng/file: empty workspace and capability mutations.
- [MODIFY] `src/core/validatePlan.ts`, ≤80 dòng: reject phantom command/path/capability reference.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Bản vá biến thành full stack detector | TB | Chỉ discovery/capability boundary; profile/synthesis bị hoãn rõ sang B13. |
| Block sớm làm luồng có vẻ chậm | TB | Một task discovery nhỏ có next action dễ hiểu; tốt hơn lệnh thất bại mơ hồ. |
| Existing workspace bị coi như folder trống | Cao | Fixture manifest/runtime hiện hữu tạo capability evidence và plan tiếp tục hợp lệ. |

## 6. Verification plan

- `npx vitest run emitTree validatePlan`
- `npm run typecheck && npm run lint && npm run build`
- E2E ba folder trống: emit → validate → status chỉ mở discovery; sau fixture capability xác nhận, command/path scope hợp lệ và không thiếu manifest/config.
- `rg "npm run build|npm test|node --version" src/core/emit.ts` không còn default unconditional trong generator.

## 7. Status

WAITING_FOR_APPROVAL
