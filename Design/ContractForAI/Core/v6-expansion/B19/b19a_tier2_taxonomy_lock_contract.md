# Contract — B19a Khoá taxonomy tầng 2 + template

> Tầng: Nội dung. Nguồn: [V6-DetailedDesignPlan](../V6-DetailedDesignPlan.md) B19a, đề xuất D48/D49, [taxonomy-decision](../../../../RoadMap/Month3/taxonomy-decision.md) §3–§4. Phụ thuộc: gate mở lane (xem plan).

## 1. Micro-task target

Khoá cây `docs/design/` (4 module: `glossary`, `feature-spec`, `adr`, `test-strategy`) thành spec + template + rubric, đủ để B19b viết câu hỏi và B20b viết renderer mà không phải tự chế cấu trúc.

## 2. Scope

**In scope**

- `Design/Content/taxonomy-tier2.md`: cây `docs/design/` đầy đủ — vị trí file, điều kiện kích hoạt từng module (bind đúng taxonomy-decision §3: `adr` ↔ 2+ dev, `test-strategy` ↔ CI/CD, contract-lane ghi rõ HOÃN sang bản sau vì điều kiện multi-agent chưa sản phẩm hoá), quan hệ với taxonomy tầng 1 (chỉ pointer, không sửa cây mặc định). Ghi rõ **cardinality**: `glossary`/`test-strategy` = 1 file; `feature-spec` = 1 file/Must (`design/features/<must-slug>.md`); `adr` = 1 file/quyết định (`design/adr/ADR-{NNN}-{slug}.md`).
- **Khoá grammar SourceRef** (trong taxonomy-tier2.md, mục riêng): mỗi khối nội dung tầng 2 kết thúc bằng ĐÚNG MỘT dòng nguồn theo grammar đóng — renderer (B20b), rubric, eval (B21b) cùng parse grammar này, không ai tự chế biến thể:

  ```text
  > Nguồn: answers:<question_id>[@<subject_id>]     # trả lời phỏng vấn (tầng 1 hoặc DS)
  > Nguồn: doc:docs/<file>.md#<anchor>              # doc tầng 1 đã emit
  > ⚠ unknown — cần hỏi người                        # không truy được nguồn (fail-closed, không bịa)
  ```
- 4 template mới trong `Design/Content/doc-templates/`: `design-glossary.md`, `design-feature-spec.md`, `design-adr.md`, `design-test-strategy.md`. Mỗi template BẮT BUỘC có: mục "Tại sao cần file này", anchor placeholder theo [AnchorFormat](../../../../Core/AnchorFormat.md), chỗ ghi nguồn (answers id / doc tầng 1) cho từng khối nội dung.
- `Design/Content/QualityRubric.md`: thêm mục chấm tầng 2, trong đó có tiêu chí "mọi câu khẳng định truy được nguồn; câu không nguồn phải mang cờ `unknown — cần hỏi người`".
- Golden mẫu tay: `Design/Content/golden-example-web/docs-design/` cho ĐÚNG MỘT dự án (web) — viết tay theo đúng cardinality trên: `glossary.md`, `test-strategy.md`, ≥1 `adr/ADR-001-*.md`, và 1 `features/<must-slug>.md` cho TỪNG Must của golden web tầng 1 (không phải "4 file" cứng — số file feature theo số Must).

**Out of scope**

- Không sửa `Design/Content/taxonomy.md` ngoài một pointer sang taxonomy-tier2.
- Không đụng code (`src/`), không đụng script phỏng vấn (B19b), không sinh golden mobile/cli (B21b lo sau khi có render tự động).

## 3. Checklist

- [ ] `taxonomy-tier2.md` định nghĩa đủ 4 module + cardinality + điều kiện kích hoạt + grammar SourceRef + ví dụ cây output hoàn chỉnh (có ≥2 file features/ để thấy tính per-Must).
- [ ] 4 template đều có "Tại sao cần file này" + anchor placeholder + dòng nguồn ĐÚNG grammar SourceRef (template feature-spec/adr ghi rõ là per-subject).
- [ ] Rubric có thang chấm tầng 2 và tiêu chí chống-bịa-nguồn, cite đúng grammar SourceRef.
- [ ] Golden web `docs-design/` đủ theo cardinality (mỗi Must một feature file, ≥1 ADR), tự nhất quán với golden tầng 1 sẵn có của cùng dự án; mọi khối trong golden dùng đúng grammar SourceRef.
- [ ] Không file nào của cây tầng 1 mặc định bị đổi nội dung (diff = pointer duy nhất trong taxonomy.md).

## 4. Interfaces / Files expected to change

- [NEW] `Design/Content/taxonomy-tier2.md` ≤180 dòng.
- [NEW] `Design/Content/doc-templates/design-{glossary,feature-spec,adr,test-strategy}.md` ≤120 dòng/file.
- [MODIFY] `Design/Content/QualityRubric.md` ≤40 dòng thêm.
- [MODIFY] `Design/Content/taxonomy.md` ≤10 dòng (pointer + điều kiện opt-in).
- [NEW] `Design/Content/golden-example-web/docs-design/**/*.md` (glossary + test-strategy + ≥1 ADR + 1 feature/Must của golden web), ≤150 dòng/file.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Template thành khung rỗng generic | Cao | Mỗi khối template ghi rõ nguồn dữ liệu bắt buộc (answers id/doc tầng 1); rubric chấm được. |
| Cây tầng 2 phình quá 4 module | TB | D49 khoá danh sách; module mới = quyết định mới trong DecisionLog, không lách qua contract. |
| Golden tay lệch giọng với golden tầng 1 | Thấp | Viết golden tầng 2 cho đúng dự án web đã có golden tầng 1, đối chiếu chéo khi viết. |

## 6. Verification plan

- `npx vitest run contentIntegrity loadShapes loadScript` (content không vỡ hợp đồng loader hiện có).
- `npm test` xanh toàn bộ; đặc biệt golden test tầng 1 không đổi output.
- Review tay của manager theo rubric mới cho 4 file golden (ghi kết quả vào cuối contract khi DONE).

## 7. Status

WAITING_FOR_APPROVAL
