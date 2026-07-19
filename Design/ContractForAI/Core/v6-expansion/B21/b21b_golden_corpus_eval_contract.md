# Contract — B21b Eval tầng 2 trên golden corpus

> Tầng: QA. Nguồn: [V6-DetailedDesignPlan](../V6-DetailedDesignPlan.md) B21b, đề xuất D51, [02-golden-corpus-protocol](../prep-brownfield/02-golden-corpus-protocol.md). Phụ thuộc: B21a.
>
> **Sửa 2026-07-19 theo review mở lane:** (1) khôi phục metric **hallucinated-rationale = 0** đúng protocol 02 (bản trước thay bằng consistency — protocol ghi "không thương lượng"); (2) thêm **substance floor** chống output gần-rỗng pass (unknown được tính trung thực cho grounding, nhưng một file toàn heading + unknown vẫn phải FAIL); (3) ngưỡng chốt TRƯỚC khi đo và `ref-sha` freeze trước lần đo đầu — không còn "chốt số khi DONE".

## 1. Micro-task target

Đo được — bằng lệnh chạy lại được — chất lượng của `docs/design/` sinh tự động cho chính DesignEverything, đối chiếu cây `Design/` viết tay đã freeze, theo đúng 5 số liệu và ngưỡng khoá sẵn trong contract này.

## 2. Scope

**In scope**

- [NEW] fixture `test/fixtures/de-self-answers.json`: bộ answers tầng 1 + DS* (theo key instance `<qid>@<sid>` như B21a) cho CHÍNH DesignEverything, chưng cất từ FirstIdea.md/README — mỗi answer ghi chú nguồn (mục nào của FirstIdea). Đây là lần dogfood đệ quy đầu tiên: DE tự thiết kế DE.
- [NEW] `test/fixtures/de-golden-map.json`: bảng ánh xạ mục-tay ↔ khối-sinh (vd `Design/Glossary.md` ↔ `design/glossary.md`; các dòng kiến trúc của `Design/DecisionLog.md` ↔ `design/adr/`). BẮT BUỘC có field `ref_sha` (commit của cây `Design/` tay dùng làm reference — freeze TRƯỚC lần đo đầu, đúng protocol 02 §Nguyên tắc 1). Chỉ map cái CÓ tương đương; ghi rõ cái cố ý không map (PRD, RoadMap) + lý do.
- [NEW] `test/eval/tier2-golden-corpus.test.ts`: chạy renderer B20b trên fixture → đo 5 số liệu, ngưỡng KHOÁ TẠI ĐÂY (đổi ngưỡng = amend contract này + đo lại từ đầu + ghi lý do, KHÔNG chốt hậu nghiệm):

  | # | Số liệu | Cách tính | Ngưỡng |
  |---|---|---|---|
  | 1 | Structural coverage | % mục trong golden-map có mặt ở bản sinh | ≥70% |
  | 2 | Grounding rate | % khối nội dung cite nguồn đúng grammar SourceRef B19a (cờ `unknown` hợp lệ ĐƯỢC tính — trung thực) | 100% |
  | 3 | Hallucinated-rationale | Số câu "vì sao/bởi vì/để" không truy được nguồn và không mang cờ (protocol 02) | 0 |
  | 4 | Unknown rate | % khối nội dung mang cờ `unknown` trên tổng khối toàn corpus | ≤30% |
  | 5 | Substance floor | MỖI file sinh có ≥3 khối nội dung (không tính heading) cite nguồn THẬT (không phải `unknown`) | pass/fail từng file |

  Số liệu 4+5 tồn tại để một output "chủ yếu heading + unknown" không thể pass dù grounding 100%.
- Kết quả mỗi lần chạy ghi báo cáo `Design/RoadMap/evidence/v6-tier2-eval.md` (ngày + `ref_sha` + 5 số liệu + ví dụ khối tốt/khối `unknown`/khối thiếu + nhận xét tay của manager).
- ReportSupport/Univillage: KHÔNG chạy trong batch này — chỉ kiểm tra protocol 02 đã sẵn chỗ trống điền (chạy thật thuộc lane brownfield).

**Out of scope**

- Không chấm chất lượng văn (đó là review tay theo rubric); không sửa renderer để "học vẹt" golden (eval đo, không fit); không sửa golden-map sau khi đã thấy số (protocol 02 §Chống gian lận).

## 3. Checklist

- [ ] Fixture answers có chú nguồn từng câu; không câu nào bịa ngoài FirstIdea/README; DS* đúng key instance.
- [ ] `ref_sha` ghi trong golden-map TRƯỚC lần chạy eval đầu tiên (kiểm bằng lịch sử commit: golden-map commit trước/ cùng commit với test).
- [ ] Golden-map được manager duyệt tay trước khi viết test (map sai thì số vô nghĩa).
- [ ] Test eval deterministic: chạy 2 lần liên tiếp ra số y hệt (renderer pure).
- [ ] Đủ 5 số liệu trong báo cáo evidence; file nào fail substance floor được nêu đích danh.
- [ ] Nếu số không đạt ngưỡng: ghi nguyên vẹn vào evidence + mở break_task — KHÔNG hạ ngưỡng, KHÔNG sửa map.

## 4. Interfaces / Files expected to change

- [NEW] `test/fixtures/de-self-answers.json` ≤200 dòng; `test/fixtures/de-golden-map.json` ≤120 dòng (có `ref_sha`).
- [NEW] `test/eval/tier2-golden-corpus.test.ts` ≤220 dòng.
- [NEW] `Design/RoadMap/evidence/v6-tier2-eval.md` (sinh khi chạy, commit bản đầu).

## 5. Risks & mitigations

| Risk | Mức | Mitigation |
|---|---:|---|
| Đo cấu trúc mà tưởng đo chất lượng | Cao | Báo cáo bắt buộc kèm review tay ≥5 khối ngẫu nhiên theo rubric B19a; coverage chỉ là điều kiện cần. |
| Golden-map thiên vị làm số đẹp giả | TB | Manager duyệt map trước; `ref_sha` freeze; ghi rõ cái không map và vì sao; map đổi = đo lại từ đầu. |
| Fixture answers "viết cho renderer dễ" | TB | Mỗi answer chú nguồn FirstIdea; reviewer đối chiếu ngẫu nhiên 5 câu. |
| Substance floor chọn sai (3 khối/file quá thấp/cao) | Thấp | Là ngưỡng khởi điểm có chủ đích; muốn đổi phải amend contract + đo lại, có ghi lý do — không chỉnh trong lúc nhìn số. |

## 6. Verification plan

- `npx vitest run test/eval/tier2-golden-corpus.test.ts` (chạy 2 lần, đối chiếu số y hệt).
- `npm test` xanh toàn bộ; báo cáo evidence tồn tại và đủ mục checklist.

## 7. Status

WAITING_FOR_APPROVAL
