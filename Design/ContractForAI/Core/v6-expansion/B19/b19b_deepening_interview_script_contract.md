# Contract — B19b Kịch bản phỏng vấn đào sâu (deepen)

> Tầng: Nội dung. Nguồn: [V6-DetailedDesignPlan](../V6-DetailedDesignPlan.md) B19b, đề xuất D49/D50, taxonomy-tier2 (B19a). Phụ thuộc: B19a.
>
> **Sửa 2026-07-19 theo review mở lane.** Bản trước chèn DS* vào `script.yaml` và thêm gate vào `gate-policy.yaml` — không chạy được trên runtime hiện hành: `commitStep` ([advanceState.ts:77](../../../../../src/core/advanceState.ts)) chọn câu kế tiếp chỉ theo `branch` + `depends_on`, không có predicate opt-in, nên DS hoặc hiện với mọi người hoặc không bao giờ được chọn; CLI còn từ chối `commit` khi tầng 1 đã xong (`current_step === null`); còn gate trong `gate-policy.yaml` được `evaluatePreAction` duyệt TẤT CẢ và schema bắt buộc hard-block Write/Edit/Bash — trái bất biến "module dở chỉ chặn emit của chính nó". Vì vậy: **deepen có file kịch bản riêng + đường commit riêng (B20a); không đụng một byte nào của script.yaml/gate-policy.yaml.**

## 1. Micro-task target

Viết kịch bản phỏng vấn deepen thành file nội dung MỚI `deepen-script.yaml` — mỗi câu neo đúng file `docs/design/`, chỉ hỏi cái tầng 1 CHƯA có, khai báo được "mỗi Must / mỗi quyết định một bộ câu" — đủ cụ thể để B20a viết schema/loader mà không phải đoán.

## 2. Scope

**In scope**

- [NEW] `Design/Content/interview-script/deepen-script.yaml` — TÁCH KHỎI `script.yaml`. Format khai báo (B20a khoá zod schema đúng theo format này, không được đổi shape):

  ```yaml
  version: 1.0.0
  questions:
    - id: DS2a                    # duy nhất trong file, prefix DS
      module: feature-spec        # glossary | feature-spec | adr | test-strategy
      per_subject: must           # none | must | adr
                                  #   none → 1 instance duy nhất
                                  #   must → nhân bản 1 instance cho TỪNG Must (02-scope)
                                  #   adr  → nhân bản 1 instance cho TỪNG quyết định (05-architecture)
      ask: "Với tính năng {subject}: ca biên nào ..."   # {subject} bắt buộc khi per_subject ≠ none
      kind: anchored              # anchored | meta (giữ nghĩa như tầng 1)
      target_doc: design/features/{subject-slug}.md     # null cho câu meta
      default_from: [S2, S4]      # id câu tầng 1 dùng suy default; cách suy ghi trong comment
      depends_on_tier1: [S2]      # câu tầng 1 phải đã answered thì instance mới hỏi được
      translate_back: true
  ```

- Bộ câu (danh sách đóng cho 7.0.0; mỗi lượt deepen một module hỏi ≤4 câu):
  - `DS0-<module>` (4 câu meta, `per_subject: none`, `target_doc: null`): câu opt-in + điều kiện kích hoạt — hỏi quy mô team / CI / cách dùng agent, map đúng taxonomy-decision §3 (`adr` ↔ 2+ dev, `test-strategy` ↔ CI/CD).
  - `DS1a/DS1b` glossary (2 câu, `per_subject: none`, `target_doc: design/glossary.md`): thuật ngữ hay dùng sai/lẫn; từ nào PHẢI hiểu đúng thì sản phẩm mới đúng.
  - `DS2a/DS2b/DS2c` feature-spec (3 câu, `per_subject: must`, `target_doc: design/features/{subject-slug}.md`): ca biên, trạng thái lỗi phải xử tử tế, tiêu chí "xong thật" — hỏi RIÊNG cho từng Must.
  - `DS3a/DS3b` adr (2 câu, `per_subject: adr`, `target_doc: design/adr/ADR-{NNN}-{subject-slug}.md`): phương án đã cân nhắc rồi LOẠI và vì sao; điều gì xảy ra thì phải xét lại — hỏi RIÊNG cho từng quyết định.
  - `DS4a/DS4b` test-strategy (2 câu, `per_subject: none`, `target_doc: design/test-strategy.md`): hỏng kiểu gì đau nhất; phần nào sợ nhất khi sửa.
- Mỗi câu có comment YAML ngay trên đầu: (1) vì sao tầng 1 CHƯA hỏi câu này (đối chiếu S0–S8), (2) default suy từ `default_from` như thế nào.
- Mọi khối nội dung câu sinh ra sau này phải cite nguồn theo grammar SourceRef đã khoá ở B19a (taxonomy-tier2) — ghi nhắc trong header file.
- [MODIFY] `Design/Content/interview-script/S0-S6-core.md`: thêm mục mô tả nhánh deepen (doc người đọc) — nói rõ deepen là kênh riêng, opt-in, không thuộc luồng S0–S8.

**Out of scope**

- KHÔNG sửa `script.yaml` — một byte cũng không (golden/dogfood tầng 1 là lưới chặn).
- KHÔNG sửa `gate-policy.yaml`, KHÔNG thêm gate PreToolUse cho deepen dưới mọi hình thức. Enforcement deepen = fail-closed trong core (`canEmitModule`/`emitTier2` — B20a/B20b) + exit ≠ 0 ở CLI (B21a) + card mềm (B21a). Đây là quyết định thiết kế, không phải thiếu sót.
- Không đụng loader code (schema/loader là việc B20a; nếu B20a thấy format thiếu field phải quay lại amend contract này trước).
- Không viết câu cho module contract-lane (đã hoãn ở B19a).

## 3. Checklist

- [ ] Từng câu DS* có comment "vì sao tầng 1 chưa hỏi" + cách suy default; reviewer đối chiếu với S0–S8.
- [ ] Câu `per_subject ≠ none` đều có `{subject}` trong `ask` và `{subject-slug}` trong `target_doc`; câu `per_subject: none` không chứa placeholder.
- [ ] Không câu nào `target_doc` trỏ ra ngoài `design/`; không câu nào trùng `id`.
- [ ] `deepen-script.yaml` parse được bằng lib `yaml` repo đang dùng (lệnh ở mục 6).
- [ ] `git diff` của `script.yaml` và `gate-policy.yaml` RỖNG; dogfood tầng 1 chạy không đổi một byte output.
- [ ] Mỗi module: đúng số câu như In scope; một lượt hỏi ≤4 câu.

## 4. Interfaces / Files expected to change

- [NEW] `Design/Content/interview-script/deepen-script.yaml` ≤180 dòng (kể cả comment).
- [MODIFY] `Design/Content/interview-script/S0-S6-core.md` ≤30 dòng thêm.
- KHÔNG file nào khác — đặc biệt KHÔNG `script.yaml`, KHÔNG `gate-policy.yaml`, KHÔNG `src/`.

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Câu deepen trùng ý câu tầng 1 → người dùng bực | Cao | Comment đối chiếu từng câu với S0–S8 là bắt buộc; default suy từ answers cũ để người dùng chỉ xác nhận/sửa. |
| Format khai báo thiếu field, B20a phải tự chế | Cao | Format khoá ngay trong contract này; B20a thiếu gì phải amend ở đây trước khi viết code. |
| Câu hỏi quá "kỹ sư", newbie không trả lời nổi | TB | Giữ giọng đời thường như S0–S6; mỗi câu có default cụ thể; pilot B18a feedback chỉnh chữ. |

## 6. Verification plan

- Parse thử file mới: `node -e "const {parse}=require('yaml');const fs=require('fs');parse(fs.readFileSync('Design/Content/interview-script/deepen-script.yaml','utf8'));console.log('OK')"`
- `git diff --stat Design/Content/interview-script/script.yaml Design/Content/interview-script/gate-policy.yaml` → rỗng.
- `npx vitest run loadScript loadShapes contentIntegrity` (nội dung tầng 1 không vỡ hợp đồng loader).
- `npx vitest run test/regression/run-dogfood.test.ts` + `npm test` xanh toàn bộ.

## 7. Status

DONE (2026-07-21)

### Kết quả review manager (2026-07-21)
`deepen-script.yaml` parse OK (lib `yaml`), 13 câu, không trùng id, mọi ref tầng 1 (`S1,S3,S4,S5,S6,S8`) đều tồn tại trong `script.yaml`; mỗi module ≤4 câu/lượt; placeholder `{subject}`/`{subject-slug}` đúng ràng buộc `per_subject`. `git diff` của `script.yaml`/`gate-policy.yaml` rỗng. Mục deepen trong `S0-S6-core.md` mô tả đúng kênh opt-in độc lập. Không phát hiện lỗi cần sửa ở B19b.
