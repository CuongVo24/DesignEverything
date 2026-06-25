# Tuần 2/16 — Engine lõi + zod schemas + gate-policy.yaml + unit test

> Tháng 1 · Mốc: Bản chạy được · Phụ thuộc: Tuần 1 (repo scaffold + golden web)

## Tại sao cần file này
{{Lõi béo/adapter gầy: viết và test phần logic chung trước khi gắn vào hook Claude Code.}}

## Mục tiêu tuần (Definition of Done)
{{loadScript / advanceState / evaluateGate chạy đúng + có unit test xanh trên fixture.}}

## Việc chi tiết
- [ ] Viết zod schema mirror đúng 3 schema đã khoá (interview-script, state, gate-policy).
- [ ] `core/loadScript.ts` đọc + validate `script.yaml`.
- [ ] `core/advanceState.ts` theo quy tắc chuyển bước trong [../../Core/Schemas/state-schema.md](../../Core/Schemas/state-schema.md).
- [ ] `core/evaluateGate.ts` đối chiếu `requires_docs` ↔ artifact.
- [ ] Emit `gate-policy.yaml` máy-đọc-được song song `script.yaml`.
- [ ] Unit test bằng golden web + golden mobile làm fixture.
- [ ] {{task bổ sung}}

## Đầu vào / Phụ thuộc
{{3 schema .md, script.yaml, golden examples.}}

## Đầu ra / Artifact
{{core/*.ts, gate-policy.yaml, test/*.}}

## Rủi ro & cạm bẫy
{{Lệch giữa zod và .md schema; nhồi logic phỏng vấn vào engine.}}

## Nghiệm thu
- [ ] {{tiêu chí đo được}}
