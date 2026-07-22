# Eval tầng 2 — Golden corpus (DesignEverything tự thiết kế)

> Ngày đo: 2026-07-22 · ref_sha: `676925ee48a5f857c67442fa01d23fa3ae7d9a0b` · fixture: test/fixtures/de-self-answers.json

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
- `design/features/ph-ng-v-n-thi-t-k.md` — 5 khối nguồn thật ✅
- `design/features/sinh-t-i-li-u-n-n-m-ng.md` — 5 khối nguồn thật ✅
- `design/adr/ADR-001-kh-ng-l-u.md` — 5 khối nguồn thật ✅
- `design/adr/ADR-002-quy-m-c-nh.md` — 5 khối nguồn thật ✅
- `design/test-strategy.md` — 3 khối nguồn thật ✅

## Khối mẫu

- **Khối có nguồn thật:** xem `design/glossary.md` §Thực Thể Từ Data Model → `doc:docs/03-data-model.md#03-data-model/core-entities`.
- **Khối unknown:** `design/test-strategy.md` §Phạm Vi & Tầng Kiểm Thử → `⚠ unknown` (chưa có conventions/test-tiers.md).

## Nhận xét tay của manager

_(Điền khi review: chọn ≥5 khối ngẫu nhiên, đối chiếu rubric B19a — grounding, chống bịa, đúng cardinality.)_
