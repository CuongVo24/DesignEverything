# Contract — B13a ProjectProfile doctor

> Tầng: Lõi. Nguồn: V4-NewbieExpansionPlan B13a, D38. Phụ thuộc: B11f.

## 1. Micro-task target

Tạo doctor deterministic biến trạng thái folder và lựa chọn user thành `ProjectProfile` có evidence, để plan không đoán runtime, package manager hay framework.

## 2. Scope

**In scope**

- Định nghĩa `ProjectProfile { workspace_kind, target, runtime, package_manager, framework, language, source_root, manifest_paths, capabilities, confirmation }`; enum `workspace_kind` là `empty | existing-supported | existing-unsupported`.
- Doctor chỉ đọc marker allowlist (`package.json`, lockfiles, `pyproject.toml`, `requirements.txt`, `go.mod`, `Cargo.toml`, `vite.config.*`, source roots) và runtime version command đã đăng ký; mỗi finding chứa source/path/observed_at/confidence.
- Khi folder trống hoặc finding mâu thuẫn, doctor trả `questions` nhỏ và recommended default, nhưng profile chỉ `confirmed` sau explicit user answer/CLI flag có audit.
- Initial supported profiles được khoá: Node CLI (npm/pnpm), Vite Web (npm/pnpm), Python CLI (`venv` + `pip`); mọi profile khác trả `existing-unsupported` với explanation, không fallback Node.
- `doctor` CLI/status lưu profile snapshot dưới `.design-everything/project-profile.json` và redact environment values; profile change invalidates plan snapshot.

**Out of scope**

- Không scan home directory, secret files, registry/network, Docker, IDE configs hay tự cài runtime.
- Không tạo source/manifests hoặc synthesis task; B13b làm sau profile confirmed.
- Không cố hỗ trợ mọi framework trong first release.

## 3. Checklist

- [ ] Folder trống luôn trả `empty` + tối đa các câu hỏi để chọn một profile supported; không tự gán Node/npm.
- [ ] Existing fixture Node/Vite/Python produce exact profile/capability evidence; conflict lockfiles/manifest return confirmation question.
- [ ] Unsupported project produces explicit unsupported result, no build command generated and no source write gate opened.
- [ ] `ProjectProfile` schema validates paths inside workspace and strips secrets; changing confirmed field invalidates plan/state snapshot.
- [ ] Doctor output đủ ngắn cho newbie: detected, recommendation, why, one next answer/action.

## 4. Interfaces / Files expected to change

- [NEW] `src/core/schemas/projectProfile.ts`, ≤180 dòng: profile/capability/question schemas.
- [NEW] `src/core/inspectProjectProfile.ts`, ≤200 dòng: marker inspection and runtime probe descriptors.
- [NEW] `src/core/projectProfileState.ts`, ≤140 dòng: profile persistence/digest/redaction.
- [MODIFY] `src/core/index.ts`, schemas exports và core CLI entry, ≤120 dòng: `doctor` verb/status integration.
- [NEW] `src/core/inspectProjectProfile.test.ts`, ≤200 dòng and fixtures for empty/Node/Vite/Python/conflict/unsupported.
- [NEW] `Design/Core/Schemas/project-profile.md`, ≤140 dòng: support matrix and privacy boundary.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Marker heuristic chọn nhầm stack | Cao | Evidence/confidence + user confirmation, never hidden fallback. |
| Scope nổ vì mọi framework | Cao | Fixed initial matrix; unsupported is product-valid outcome. |
| Doctor lộ dữ liệu máy user | Cao | Allowlist names/version only, no arbitrary file content/env dump. |

## 6. Verification plan

- `npx vitest run inspectProjectProfile projectProfileState`
- `npm run typecheck && npm run lint && npm run build`
- Fixture matrix empty/Node CLI/Vite/Python/conflicting/unsupported; assert profile, questions, redaction and stale-plan behavior.

## 7. Status

WAITING_FOR_APPROVAL
