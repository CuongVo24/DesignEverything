# Contract — B20b Renderer + emit tầng 2 (`docs/design/`)

> Tầng: Lõi. Nguồn: [V6-DetailedDesignPlan](../V6-DetailedDesignPlan.md) B20b, đề xuất D50, template B19a, state B20a. Phụ thuộc: B20a. Được phép tách `-a/-b` theo D42 khi thực thi (renderer ≠ emit wiring).
>
> **Sửa 2026-07-19 theo review mở lane:** (1) hàm slug dùng chung giờ TỒN TẠI THẬT — `src/core/slugify.ts` do B20a trích từ `synthesizeExecutionPlan` (bản trước yêu cầu import một hàm chưa được export); (2) `emitTier2` khoá thứ tự **transaction**: render thuần → consistency check → chỉ khi sạch lỗi mới ghi file + cập nhật state (bản trước ghi file/`emitted_at` trước consistency, có thể để lại state "đã emit" cùng output lỗi); (3) ký đầy đủ kiểu trả về, ConsistencyIssue có severity typed, mỗi artifact có identity trong manifest state.

## 1. Micro-task target

Từ answers (tầng 1 + DS* theo instance) và docs tầng 1 đã emit, sinh các file `docs/design/` đúng template B19a, có anchor, có nguồn theo grammar SourceRef (B19a) cho từng khối — và `emitTier2` chỉ ghi ra đĩa khi consistency pass sạch lỗi, all-or-nothing theo module.

## 2. Scope

**In scope**

- Kiểu dữ liệu chung (đặt tại `src/core/schemas/tier2Render.ts`):

  ```ts
  interface Tier2RenderInput {
    answers: unknown;                       // kho answers hiện hành (tầng 1 + DS theo key instance, xem B21a)
    profile: ProjectProfile;
    tier1Docs: Record<string, string>;      // path → nội dung docs/ đã emit
    subjects: string[];                     // từ listDeepenSubjects (B20a) — [] với module none
  }
  interface RenderedArtifact {
    path: string;                           // vd 'design/features/dang-nhap.md' — identity của artifact
    content: string;
    sources: string[];                      // mọi SourceRef xuất hiện, đúng grammar B19a
    unknown_blocks: number;                 // số khối mang cờ unknown
  }
  interface ConsistencyIssue { severity: 'error' | 'warning'; code: string; path: string; message: string }
  ```

- 4 renderer thuần (pure function, không I/O), chữ ký thống nhất `(input: Tier2RenderInput) => RenderedArtifact[]`:
  - `renderGlossary` → `[design/glossary.md]`: hợp nhất entity từ `parseDataModel(03-data-model)` + thuật ngữ DS1; mỗi term có định nghĩa + SourceRef.
  - `renderFeatureSpec` → 1 artifact cho TỪNG Must (`extractMustFeatures`): mô tả từ 02-scope, flow từ `parseFlows(04-flows)`, edge case + error state + acceptance từ DS2 **của đúng subject đó** (instance `{question_id, subject_id}` — không tái dùng chéo Must). Slug: import `slugify` (B20a) — KHÔNG chế bản thứ hai; collision/rỗng theo luật đã khoá ở B20a.
  - `renderAdr` → 1 artifact cho TỪNG quyết định trong 05-architecture + DS3 của đúng subject: `design/adr/ADR-{NNN}-{slug}.md`, `NNN` = thứ tự xuất hiện quyết định trong 05-architecture, 3 chữ số từ `001` — deterministic: cùng input cùng số, không phụ thuộc thời gian/lần chạy.
  - `renderTestStrategy` → `[design/test-strategy.md]`: DS4 + profile (stack quyết định tầng test khả dụng) + 04-flows (flow chính = ca e2e ưu tiên).
- Khối không truy được nguồn → renderer ghi đúng cờ `> ⚠ unknown — cần hỏi người` theo grammar B19a, KHÔNG bịa. Anchor theo AnchorFormat, `status=planned`, nối về file/mục tầng 1 nguồn.
- [MODIFY] `checkDocsConsistency.ts`: nhận thêm bản render tầng 2 (in-memory, chưa ghi đĩa), trả `ConsistencyIssue[]`: feature ∉ Must của 02-scope → `error`; entity lạ ∉ 03-data-model → `warning`.
- [NEW] `emitTier2` — thứ tự BẮT BUỘC, all-or-nothing theo module:

  ```ts
  emitTier2(args: { workspace: string; modules: DeepenModuleId[]; script: DeepenScript; state: DeepenState }): EmitTier2Result
  // Với từng module theo thứ tự yêu cầu:
  //  (1) canEmitModule — !ok → skipped {reason:'missing-answers', missing}; chưa opt-in → skipped {reason:'not-opted-in'};
  //  (2) render thuần trong bộ nhớ (KHÔNG ghi gì);
  //  (3) checkDocsConsistency trên bản render + docs tầng 1;
  //  (4) có issue severity 'error' → skipped {reason:'consistency-error', issues}; KHÔNG ghi file, KHÔNG đổi state;
  //  (5) sạch lỗi → ghi từng file (mkdir -p, atomic tmp+rename như saveDeepenState), rồi cập nhật
  //      emitted_at + source_digest (computeSourceDigest B20a) + artifacts (path đã ghi) và saveDeepenState MỘT lần.
  //  Warning không chặn — trả kèm trong emitted để CLI in ra.

  interface EmitTier2Result {
    emitted: { module: DeepenModuleId; files: string[]; warnings: ConsistencyIssue[] }[];
    skipped: { module: DeepenModuleId; reason: 'not-opted-in' | 'missing-answers' | 'consistency-error';
               missing?: QuestionInstance[]; issues?: ConsistencyIssue[] }[];
  }
  ```

- Re-emit: chạy lại module đã emit là hợp lệ (idempotent) — ghi đè đúng các path trong render mới; file cũ có trong `artifacts` nhưng không còn trong render mới (vd Must bị xoá) → xoá file đó và ghi nhận trong kết quả (manifest là nguồn sự thật về file do engine sinh).

**Out of scope**

- Không CLI/skill (B21a); không sửa renderer tầng 1; không sinh module chưa opt-in; không network; không đụng gate-policy.

## 3. Checklist

- [ ] Mỗi renderer pure, unit test với fixture answers thật từ dogfood (không fixture bịa tay rời thực tế).
- [ ] Feature spec: đúng 1 file/Must, slug khớp `slugify` của plan (test đối chiếu trực tiếp); DS2 của must A không rò sang file của must B (test 2 subject).
- [ ] ADR: numbering ổn định qua 2 lần render cùng input; đổi thứ tự quyết định trong fixture → số đổi theo đúng thứ tự mới.
- [ ] Khối thiếu nguồn ra cờ `unknown` đúng grammar B19a, KHÔNG ra văn mẫu (test: xoá 1 answer DS → xuất hiện cờ, `unknown_blocks` tăng).
- [ ] `emitTier2` consistency-error → không file nào được ghi, state không đổi (test đọc lại đĩa + state); missing-answers → skipped đúng `missing`.
- [ ] Re-emit ghi đè sạch; Must bị xoá khỏi fixture → file mồ côi bị dọn theo manifest.
- [ ] Golden/dogfood tầng 1 không đổi output.

## 4. Interfaces / Files expected to change

- [NEW] `src/core/schemas/tier2Render.ts` ≤60 dòng.
- [NEW] `src/core/renderGlossary.ts`, `renderFeatureSpec.ts`, `renderAdr.ts`, `renderTestStrategy.ts` ≤160 dòng/file + test ≤200 dòng/file.
- [NEW] `src/core/emitTier2.ts` ≤180 dòng + `emitTier2.test.ts` ≤220 dòng.
- [MODIFY] `src/core/checkDocsConsistency.ts` ≤60 dòng thêm.
- [MODIFY] `src/core/index.ts`, `src/core/schemas/index.ts` ≤12 dòng.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Renderer thành máy chép template rỗng | Cao | Test cờ-unknown + rubric; eval B21b đo grounding + substance floor. |
| Emit nửa chừng để lại state/đĩa lệch nhau | Cao | Thứ tự transaction khoá ở trên: consistency trước, ghi sau, state cập nhật cuối cùng một lần. |
| Consistency pass quá gắt chặn oan | TB | Feature lạ = error, entity lạ = warning (đúng "thà gắn cờ nghi ngờ"); ngưỡng chỉnh sau pilot. |
| Contract quá một đơn vị | TB | Tách -a (renderer) / -b (emit + consistency) ngay khi executor thấy vượt trần; mỗi mảnh vẫn đủ 7 mục. |

## 6. Verification plan

- `npx vitest run renderGlossary renderFeatureSpec renderAdr renderTestStrategy emitTier2 checkDocsConsistency`
- `npm run build && npm run lint && npm test`
- E2e tay trong temp workspace: dogfood tầng 1 → opt-in `glossary` + `feature-spec` → trả lời DS (đủ instance từng Must) → emit → mở file soi theo rubric B19a (ghi kết quả khi DONE).

## 7. Status

WAITING_FOR_APPROVAL
