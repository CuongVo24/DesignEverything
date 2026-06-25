# TechStack — Vũ khí công nghệ (KHOÁ CỨNG)

> **Cấm import lậu.** Không thêm dependency ngoài file này mà không xin approve rõ ràng (VibeCode Step 4).

## Tại sao cần file này
Dự án nhẹ code nhưng nếu mỗi adapter chọn stack khác → "lõi béo adapter gầy" vỡ. File này khoá ngôn ngữ + công cụ chung để mọi adapter đồng nhất.

## Quyết định nền (chốt 2026-06-25 — xem [../DecisionLog.md](../DecisionLog.md) D9)
**Ngôn ngữ: Node.js + TypeScript.** Lý do: cùng hệ với ReportSupporter (TS), type-safe, parse YAML/JSON dễ, hệ sinh thái npm mạnh, hợp khi sau này lên CLI/bot cho tính năng maintain.

## Stack khoá

| Lớp | Lựa chọn | Ghi chú |
|---|---|---|
| Runtime | **Node.js** (LTS) | Hook Claude Code chạy script qua `node`. |
| Ngôn ngữ | **TypeScript** | `strict: true`. Cấm `any` — dùng `unknown` + validate ở ranh giới. |
| Parse schema | **YAML** (`yaml`) + **JSON** | `interview-script` & `gate-policy` viết YAML; `progress.json` là JSON. |
| Validate | **zod** | Validate `script.yaml` / `progress.json` ở ranh giới I/O. Schema TS sinh từ đây. |
| Test | **Vitest** | 3 tầng test (xem [TestStrategy.md](TestStrategy.md)). |
| Lint/Format | **ESLint + Prettier** | Giống ReportSupporter. |
| Package manager | **npm** | Khoá bằng `package-lock.json`. |

## Phụ thuộc theo nhu cầu (xin approve khi cần)
- Parser symbol cho anchor (`file::symbol`) → có thể cần TS compiler API (`typescript`) hoặc tree-sitter. **Quyết khi làm anchor resolver, chưa cài sớm.**
- Git blame SHA → gọi `git` CLI qua child_process (không cần lib).

## Cấm
- Không UI framework (không UI — PRD Non-goals).
- Không backend/DB/auth lib (MVP không có).
- Không nhúng nội dung câu hỏi vào code (đọc từ `script.yaml`).

## Nguyên tắc
Code **đọc** schema/script làm nguồn sự thật. Logic chung ở lõi (TS module dùng chung), adapter chỉ gọi lõi + map sang cơ chế harness của mình.
