# Contract — B15a Cross-runtime replay benchmark

> Tầng: QA. Nguồn: V4-NewbieExpansionPlan B15a, D37, D40. Phụ thuộc: B12b, B13b, B14a, B14b.

## 1. Micro-task target

Tạo replay benchmark tái chạy được trên Claude và Codex cho folder trống/stack profile, chứng minh plan, gate coverage và evidence thực tế thay vì mock state.

## 2. Scope

**In scope**

- Tạo replay manifest cho mỗi run: adapter/surface version, hook trust/capability state, profile fixture, plan/state digest, actions, expected decisions, runner evidence hashes và redacted output paths.
- Fixture matrix: empty Node CLI, Vite Web, Python CLI; mỗi fixture chạy happy path M0 và mutation state missing/stale, out-of-scope write, fake evidence, unregistered Bash command, amendment approval/reject.
- Claude replay invokes actual hook wrapper; Codex replay invokes official hook JSON input/output fixtures and a trusted local smoke where available. Surface không support hook phải report soft/unsupported, không tính vào hard-pass.
- Tạo deterministic comparison report semantic decision/reason/evidence, allowing known adapter coverage differences explicitly.
- Lưu artifacts in-repo size-capped/redacted; no account identifiers, home paths, API key or full transcript.

**Out of scope**

- Không benchmark model intelligence, speed, cost hoặc claim user-study outcome.
- Không require cloud Codex/Claude access or bypass hook trust in CI.

## 3. Checklist

- [ ] Một command/CI target replay toàn bộ fixture matrix và report pass/fail/unsupported by adapter capability.
- [ ] No replay manually sets `ready-to-execute`, completed tasks or evidence; all derive from emit/doctor/validate/start/verify flow.
- [ ] Each hard-gate claim has an actual intercepted tool test; each gap has explicit unsupported row.
- [ ] Artifacts prove real runner command and output hashes for success/failure; fake evidence flag test fails.
- [ ] Report diff catches semantic drift between Claude/Codex on shared B12 request.

## 4. Interfaces / Files expected to change

- [NEW] `test/replay/fixtures/{node-cli,vite-web,python-cli}/`, ≤200 dòng/file: clean workspace inputs only.
- [NEW] `test/replay/manifests/*.json`, ≤160 dòng/file: expected decisions/artifact IDs/capability state.
- [NEW] `scripts/run-cross-runtime-replay.mjs`, ≤200 dòng: execute/report/redact helper.
- [NEW] `test/replay/crossRuntimeReplay.test.ts`, ≤200 dòng: deterministic semantic assertions.
- [NEW] `Design/RoadMap/evidence/v4-replay-report.md`, ≤180 dòng: matrix/results/unsupported rows.
- [MODIFY] CI/test scripts and TestStrategy, ≤100 dòng: replay target and local prerequisites.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| CI cannot trust/run local Codex hooks | TB | Fixture protocol tests always run; trusted smoke is labeled environment-dependent, never silently pass. |
| Replay logs leak local data | Cao | Dedicated clean fixtures, redact/cap outputs and schema test no forbidden patterns. |
| Parity requirement hides valid coverage differences | TB | Compare shared decision semantics; manifest declares tool coverage variance. |

## 6. Verification plan

- `node scripts/run-cross-runtime-replay.mjs`
- `npm test && npm run typecheck && npm run lint && npm run build`
- Review generated report: all claimed hard actions have intercept evidence, all non-intercepted actions are explicitly unsupported/soft.

## 7. Status

WAITING_FOR_APPROVAL
