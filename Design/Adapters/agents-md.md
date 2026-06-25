# Adapter — AGENTS.md (bậc B, mềm)

> Một adapter phủ mềm **nhiều harness cùng lúc** (Codex CLI, Cursor, Cline... nhiều cái hội tụ về `AGENTS.md`). Ra mắt **thứ hai**.

## Tại sao cần file này
Sau Claude Code, đây là bước rẻ nhất để đạt "chạy mọi agent" ở mức dùng được — chỉ viết 1 adapter mà phủ một nắm harness (kèm DeepSeek/GLM chạy trong chúng).

## INJECT
- Ghi kịch bản phỏng vấn + 4 quy tắc vàng vào `AGENTS.md` (hoặc `.cursorrules`).

## GATE (mềm — không bảo đảm)
- Viết câu lệnh trong rules: "Không sinh code khi `02-scope.md` chưa tồn tại" theo [../Core/Schemas/gate-policy.md](../Core/Schemas/gate-policy.md).
- ⚠️ Harness có thể bỏ qua → đây là **khuyến nghị mạnh**, không xác định.

## EMIT
- Giống mọi nơi: cây [../Content/taxonomy.md](../Content/taxonomy.md) + mỏ neo.

## Giới hạn cần ghi rõ cho người dùng
"Trên harness này, việc cấm nhảy vào code là khuyến nghị, không chặn cứng. Muốn ép cứng → dùng Claude Code."

## TODO
- [ ] Mẫu `AGENTS.md` sinh ra từ lõi.
- [ ] Test trên ≥2 harness đọc `AGENTS.md`.
