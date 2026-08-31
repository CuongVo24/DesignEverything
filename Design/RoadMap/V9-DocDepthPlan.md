# V9 Doc Depth — từ 12 file docs tới bộ tài liệu đủ dày để code không phải đoán

> Target phát hành: **9.0.0**. MAJOR vì thêm artifact tier-1 bắt buộc (`docs/Guideline.md`), mở
> `artifactKindSchema` (thêm `tool`), và thêm hai module deepen mới — breaking với adapter/validator
> cũ. Lane dir: [`../ContractForAI/Core/v9-expansion/`](../ContractForAI/Core/v9-expansion/README.md).

## Tại sao cần file này

Người dùng đối chiếu output của DesignEverything với bộ tài liệu viết tay của một dự án thật
(`SlideAmNhac` — ứng dụng Android cho giáo viên âm nhạc tiểu học, 12 tuần) và hỏi: *tài liệu tôi
nhận được bao giờ mới có dáng dấp như thế?*

Đối chiếu 2026-08-31 cho ra bảng dưới. Cột "DE hôm nay" là 8.1.0.

| Nhóm tài liệu (SlideAmNhac) | DE hôm nay | Mức |
|---|---|---|
| `Decisions/` — 11 ADR | tier-2 `adr` → `docs/design/adr/ADR-{seq}.md` | ✅ Có thật |
| `ProductPRD.md` | `00-vision` + `01-personas` + `02-scope` | ✅ Có, tách 3 file |
| `Guideline.md` — cửa vào, thứ tự đọc, bảng file khoá cứng | `docs/README.md` — mới là mục lục | 🟡 **Mục 1** |
| `ContractForAI/` — 98 contract + INDEX + RUNBOOK | `Contract[]` sống trong `execution-plan.json`, không đổ ra `.md` | 🟡 **Mục 2** |
| `Modules/` — 8 module + 4 file nguồn chân lý | `03-data-model` + `05-architecture` | ❌ **Mục 3** |
| `tools/docs/check_docs.py` + CI | `checkDocsConsistency` chỉ chạy lúc emit, không ở lại | 🟡 **Mục 4** |
| `Frontend/` — 22 file design system | không có gì | ❌ **Mục 5** |
| `Conventions/` — 8 file | `docs/conventions/` 4 file, mỏng | 🟡 ngoài phạm vi lane này |
| `RoadMap/` theo tuần · `TaskBrief/` · `QA/` · `Security/` | rải trong `08`/`09` + `break-tasks/` | 🟡 ngoài phạm vi lane này |

Năm mục đánh số ở trên là phạm vi lane V9. Bốn nhóm còn lại **cố ý để sau** — xem §Phạm vi.

Khoảng cách không nằm ở phương pháp: `Design/` của chính DE **đã** đúng dáng đó (352 file,
`Guideline.md`, `ContractForAI/` 153 file, `DecisionLog.md`). Khoảng cách nằm ở chỗ **tool chưa emit
ra cái nó tự dùng**. V9 đóng đúng khoảng cách đó.

## Mục tiêu sản phẩm

Sau V9, một dự án đi hết `/design-everything` + `/build` phải nhận được:

```text
docs/
  Guideline.md              ← MỚI (mục 1): cửa vào, thứ tự đọc, bảng file khoá cứng
  00-vision.md … 09-execution-plan.md, decisions.md, README.md
  conventions/
  contracts/                ← MỚI (mục 2)
    CONTRACT_INDEX.md
    EXECUTOR_RUNBOOK.md
    M4-{feature}/{id}_contract.md
  design/                   ← opt-in tier-2
    glossary.md  test-strategy.md  adr/  features/
    modules/                ← MỚI (mục 3)
      {must-slug}.md
      CanonicalTypes.md  ApiContract.md  ErrorCodes.md  ModuleTypeMap.md
    frontend/               ← MỚI (mục 5, chỉ shape web/mobile/hybrid)
      art-direction.md
      foundations/{color,typography,spacing,iconography}.md
      components/{component}.md
tools/check-docs.mjs        ← MỚI (mục 4)
.github/workflows/docs-check.yml
```

## Nguyên tắc cầm lái

- **Không hỏi thêm câu nào cho mục 1 và 2.** Cả hai suy hoàn toàn từ dữ liệu đã có (`Contract[]`,
  catalog, docs tầng 1). Batch nào cần câu hỏi mới thì phải khai rõ — đó là chi phí thật của mục 3
  và 5.
- **Bảy field của contract map thẳng bảy mục `CONTRACT_STRUCTURE_RULE` §3.** D43 đã khoá schema
  máy đọc đúng bằng bảy mục đó; mục 2 vì vậy là **bộ render, không phải thiết kế lại**.
- **Frontend cắt xuống ba tầng.** SlideAmNhac có sáu tầng (ArtDirection → Foundations → Components →
  Patterns → Layouts → Flows). Ba tầng sau trùng phần lớn với `04-flows.md` đã có; nhân đôi nội dung
  ở hai chỗ là công thức tạo drift. Xem D66.
- **Một bộ kiểm, hai nơi dùng.** `scripts/check-docs.mjs` (đã viết trong đợt dọn 2026-08-31) là bản
  gốc; B26a emit chính nó vào dự án đích. Không viết hai bản. Xem D67.
- **Chất lượng không dựa vào bộ sinh.** Giữ nguyên nguyên tắc V5: grounding vào docs đã khoá + bind
  vào Conventions + vòng review/break-task. V9 không thêm lưới mới, chỉ thêm artifact.

## Quyết định cần khoá (D62–D67)

Đã ghi vào [../DecisionLog.md](../DecisionLog.md), trạng thái `WAITING_FOR_APPROVAL` cho tới khi chủ
repo duyệt (Gate E1).

| ID | Quyết định | Vì sao |
|---|---|---|
| D62 | `docs/Guideline.md` là artifact **tier-1 bắt buộc**, cửa vào duy nhất của cây docs | Không có cửa vào thì 12+ file chỉ là một đống; bảng "file khoá cứng" là thứ chặn agent tự chế kiểu dữ liệu |
| D63 | Contract thành artifact markdown ở `docs/contracts/`, đăng ký catalog `required: false` | Sinh ở pha **build**, không phải pha emit — `required: true` sẽ vỡ catalog-completeness ở [emitTransactionValidate.ts](../../src/core/emitTransactionValidate.ts) |
| D64 | Thêm `'tool'` vào `artifactKindSchema` | Emit script + workflow vào dự án đích cần một `kind` không phải `doc`; mở public schema → MAJOR |
| D65 | Module deepen `modules` + 4 file nguồn chân lý khoá cứng | Đây là thứ khiến tài liệu "đủ để code": agent tra `ApiContract`/`ErrorCodes` thay vì bịa |
| D66 | Module deepen `frontend` **rút gọn 3 tầng**, chỉ shape `web`/`mobile`/`hybrid` | Patterns/Layouts/Flows trùng `04-flows.md`; nhân đôi = drift |
| D67 | Một bộ kiểm tài liệu duy nhất cho cả `Design/` của DE và dự án đích | Hai bản sẽ lệch — đúng bệnh `.clauderules` vừa mắc |

## Phạm vi

**In scope** — năm mục đánh số ở bảng đối chiếu.

**Out of scope** (cố ý, không phải quên):

- **Không** mở rộng `docs/conventions/` từ 4 lên 8 file (GitFlow, RepoStructure, WorkFlow,
  VerificationCommands, ConfigAndSecrets). Lane riêng — chúng phụ thuộc câu hỏi về quy trình team mà
  kịch bản hiện chưa hỏi.
- **Không** sinh `TaskBrief/` theo tuần hay `RoadMap/Week-*.md`. `08-build-plan` + `09-execution-plan`
  đã phủ; thêm lớp thứ ba là nhân bản.
- **Không** sinh `QA/` và `Security/` riêng. Giữ trong `test-strategy` tier-2.
- **Không** đổi cây `docs/` tầng 1 hiện có ngoài việc **thêm** `Guideline.md`.
- **Không** multi-agent, dashboard, ticket (giữ D30/D31).

## Batch và phụ thuộc

Thứ tự bắt buộc theo [VibeCode.md](../VibeCode.md): **Nội dung → Lõi → Adapter → QA**.

| Batch | Mục | Tầng | Phụ thuộc | Kết quả |
|---|---|---|---|---|
| B25a | 1 | Lõi | — | `docs/Guideline.md`: template + renderer + entry catalog |
| B25b | 2 | Lõi | B25a | `Contract[]` → cây `docs/contracts/` + INDEX + RUNBOOK |
| B26a | 4 | Adapter | B25b | Emit `tools/check-docs.mjs` + workflow CI vào dự án đích |
| B26b | 3 | Nội dung + Lõi | B25b | Module deepen `modules` + 4 file khoá cứng |
| B27a | 5 | Nội dung + Lõi | B26b | Module deepen `frontend` rút gọn |
| B27b | — | QA | tất cả | Golden 3 shape, taxonomy, ConformanceMatrix, Versioning, bump 9.0.0 |

`B26a` và `B26b` chạy song song được (khác tầng, không đụng file chung).

## Rủi ro

| Rủi ro | Giảm bằng |
|---|---|
| Thêm artifact tier-1 bắt buộc làm vỡ mọi dự án đã emit bằng 8.x | `Guideline.md` sinh được **hoàn toàn** từ dữ liệu đã có → re-emit tạo ra nó, không cần hỏi lại người dùng. B27b phải có ca test re-emit trên golden 8.x |
| Cây `docs/contracts/` phình to ở dự án lớn | Sizing đã có sẵn từ D42 (hàm của Must × entity × flow-step) — không thêm cơ chế mới |
| Hai module deepen mới kéo dài phỏng vấn | Cả hai **opt-in** như tier-2 hiện tại; `frontend` còn bị gate thêm theo shape |
| Bộ kiểm emit vào dự án đích rồi mục theo bản gốc | D67: cùng một file, B27b khoá bằng test so khớp nội dung hai bản |
| Lane dài, lặp lại bệnh v6 (contract DONE mà README nói chưa mở) | `scripts/check-docs.mjs` nay đối chiếu status thật từng contract với `CONTRACT_INDEX.md` |

## Điều kiện mở lane (Gate E0)

- [x] Đợt dọn `Design/` đóng: `check-docs.mjs` xanh trong `npm test`, 750 link resolve, 129 contract
      có mục lục, 14 lane có bản đồ.
- [ ] D62–D67 được duyệt vào `DecisionLog.md` (Gate E1).

Chi tiết gate: [MasterSequencingPlan.md](MasterSequencingPlan.md) §Gate E.
