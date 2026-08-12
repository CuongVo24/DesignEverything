# Eval tầng 2 — Golden corpus (DesignEverything tự thiết kế)

> Ngày đo: 2026-08-10 · ref_sha: `676925ee48a5f857c67442fa01d23fa3ae7d9a0b` · fixture: test/fixtures/de-self-answers.json

## 5 số liệu (ngưỡng khoá ở test)

| # | Số liệu | Kết quả | Ngưỡng | Đạt |
|---|---|---|---|---|
| 1 | Structural coverage | 100.0% | ≥70% | ✅ |
| 2 | Grounding rate | 100.0% | 100% | ✅ |
| 3 | Hallucinated-rationale | 0 | 0 | ✅ |
| 4 | Unknown rate | 3.7% | ≤30% | ✅ |
| 5 | Substance floor | 6/6 file đạt | mỗi file ≥3 | ✅ |

Tổng khối: 27 · khối unknown: 1

## File sinh ra & khối nguồn thật

- `design/glossary.md` — 3 khối nguồn thật ✅
- `design/features/phong-van-thiet-ke.md` — 5 khối nguồn thật ✅
- `design/features/sinh-tai-lieu-nen-mong.md` — 5 khối nguồn thật ✅
- `design/adr/ADR-001-khong-luu-du-lieu.md` — 5 khối nguồn thật ✅
- `design/adr/ADR-002-quy-mo-ca-nhan.md` — 5 khối nguồn thật ✅
- `design/test-strategy.md` — 3 khối nguồn thật ✅

## Khối mẫu

- **Khối có nguồn thật:** xem `design/glossary.md` §Thực Thể Từ Data Model → `doc:docs/03-data-model.md#03-data-model/core-entities`.
- **Khối unknown:** `design/test-strategy.md` §Phạm Vi & Tầng Kiểm Thử → `⚠ unknown` (chưa có conventions/test-tiers.md).

## Nhận xét tay của manager

**Người review: Claude (agent phiên 2026-08-10), không phải người thứ hai độc lập.** Khác với yêu cầu
"hai reviewer độc lập" của B5c/R14, checklist B21b chỉ đòi một lượt review tay theo rubric B19a —
nhưng minh bạch để không lẫn với sign-off của chủ repo. Chọn 5 khối ngẫu nhiên, đối chiếu rubric B19a
(grounding, chống bịa, đúng cardinality):

1. `design/glossary.md` §Thực Thể Từ Data Model → `doc:docs/03-data-model.md#03-data-model/core-entities`. Grounded đúng, nội dung "Answer, Document, Contract" khớp entity thật của data model. ✅
2. `design/features/ph-ng-v-n-thi-t-k.md` §3 Ca Biên & Lỗi → `answers:DS2a@ph-ng-v-n-thi-t-k`. Cardinality đúng (1 file/Must); nội dung riêng cho Must "Phỏng vấn thiết kế", không lẫn với Must khác. ✅
3. `design/adr/ADR-001-kh-ng-l-u.md` §5 Phương Án Đã Cân Nhắc & Loại → `answers:DS3a@adr-001`. So với ADR-002 cùng mục: nội dung khác nhau theo đúng subject ("không thu thập dữ liệu nhạy cảm" vs "quy mô nhỏ, thêm cache/queue sớm chỉ tốn thời gian") — xác nhận không rò giữa hai quyết định. ✅
4. `design/test-strategy.md` §1 Phạm Vi & Các Tầng Kiểm Thử → `⚠ unknown — cần hỏi người`. Đây là khối unknown duy nhất (1/27) — đúng: không có nguồn nào cho "test tiers" trong docs tầng 1/answers, renderer gắn cờ thay vì bịa. Chống-bịa-nguồn hoạt động đúng thiết kế. ✅
5. `design/adr/ADR-002-quy-m-c-nh.md` §3 Quyết Định & Giải Pháp → `doc:docs/05-architecture.md#05-architecture/decision-rationale`. Grounded đúng, nội dung không lặp lại ADR-001 dù cùng anchor nguồn (vì trích đoạn khác nhau trong cùng doc tầng 1). ✅

**Kết luận:** 5/5 khối đạt rubric B19a (grounding đúng grammar SourceRef, không bịa, cardinality per-Must/per-decision đúng). Không phát hiện lỗi chặn.

**Quan sát phụ, không chặn:** slug của 2 file feature (`ph-ng-v-n-thi-t-k`, `sinh-t-i-li-u-n-n-m-ng`) mất dấu tiếng Việt kiểu lạ — nguyên âm có dấu bị xoá thay vì chuyển về không dấu (kỳ vọng `phong-van-thiet-ke`, thực tế `ph-ng-v-n-thi-t-k`). Không phải lỗi grounding/bịa nguồn nên không chặn B21b, nhưng đáng một ticket nhỏ riêng ở `src/core/slugify.ts` trước khi tính năng deepen ra mắt người dùng thật — slug xấu sẽ lộ ra trong tên file thật.
