# Contract — B15b Pilot claim and release gate

> Tầng: QA/Process. Nguồn: V4-NewbieExpansionPlan B15b, D40. Phụ thuộc: B15a.

## 1. Micro-task target

Đặt release gate audit được cho claim “newbie vibe-code” đa runtime: pilot có consent/raw artifacts, metric provenance và wording chỉ mạnh bằng evidence.

## 2. Scope

**In scope**

- Protocol pilot tối thiểu 6 người không phải tác giả; phân bố ít nhất 2 session cho mỗi profile được claim và ít nhất 3 session có Codex, 3 có Claude nếu cả hai adapter được claim.
- Thu raw rows đã ẩn danh: participant alias, self-rated experience band, harness/capability, fixture/profile, timestamp, task status, human intervention count/category, amendment/blocked reason, evidence/replay artifact IDs và consent version.
- Công bố completion, time-to-M0, intervention và failure rate theo harness/profile; metric thiếu sample/artefact phải là `not measured`, không nội suy.
- Marketing/README chỉ được dùng “hard gate” nơi B15a có intercepted replay; `newbie completes M0` chỉ khi pilot completion ≥80% trên sample đã nói rõ và không có external operator làm hộ task.
- Versioning/ConformanceMatrix/release note nêu support matrix/known gaps và rollback wording khi regression fails.

**Out of scope**

- Không thu tên, email, project riêng, token hay screen/video record mặc định.
- Không hứa production readiness, deploy autonomy hoặc universal enforcement từ pilot nhỏ.

## 3. Checklist

- [ ] Pilot protocol, consent/redaction rules, raw rows, aggregate report và replay report liên kết qua stable artifact ID.
- [ ] Claim lint rejects unsupported adapter/profile, hard enforcement without intercept evidence, or newbie completion without threshold/provenance.
- [ ] Report splits results by harness/profile and records hook trusted/soft state; no blended metric hides a weak adapter.
- [ ] Every failed/blocked run has outcome taxonomy and evidence pointer; no deleted negative result.
- [ ] Release checklist changes status to DONE only after B15a evidence and pilot materials are reviewable.

## 4. Interfaces / Files expected to change

- [NEW] `Design/RoadMap/evidence/v4-pilot-protocol.md`, ≤160 dòng: consent, task script, metric definitions, intervention taxonomy.
- [NEW] `Design/RoadMap/evidence/v4-pilot-raw.md`, ≤200 dòng: anonymized structured participant rows.
- [NEW] `Design/RoadMap/v4-newbie-evaluation-report.md`, ≤200 dòng: aggregate tables, limitation and artifact links.
- [NEW] `scripts/check-v4-claims.mjs`, ≤200 dòng and test: claim/provenance/support matrix lint.
- [MODIFY] README, quickstart, Versioning, ConformanceMatrix, MasterRoadMap and release note surfaces, ≤120 dòng/file: truthful claims/status.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Metric bị gaming bằng trợ giúp ẩn | Cao | Intervention taxonomy, raw rows and no-operator-completes criterion. |
| Sample nhỏ bị đọc quá mức | TB | Show n/profile/harness and limitation; claim only scoped behavior. |
| PII leak | Cao | Alias-only raw file, review checklist and redaction lint. |

## 6. Verification plan

- `node scripts/check-v4-claims.mjs`
- `node scripts/run-cross-runtime-replay.mjs && npm test && npm run typecheck && npm run lint && npm run build`
- Independent reviewer samples three aggregate metrics and traces each to raw row + replay/evidence artifact; verify claimed support matrix equals B15a matrix.

## 7. Status

WAITING_FOR_APPROVAL
