# Contract — W1A Scaffold repo + tooling

> **Tầng:** Adapter/infra (chỉ dựng runway, KHÔNG logic engine). Nguồn: [Week-01](../../../../RoadMap/Month1/Week-01.md) + [TechStack.md](../../../../Conventions/TechStack.md) + [claude-code.md](../../../../Adapters/claude-code.md) §"Cấu trúc module khuyến nghị".

## 1. Micro-task target
Dựng một repo Node.js + TypeScript `strict` chạy được (lint/typecheck/test/build xanh) với đúng stack đã khoá — **chưa có logic sản phẩm**. Đây là nền để W2 đổ engine vào mà không phải đụng lại cấu hình.

## 2. Scope
**In scope**
- `package.json` + scripts: `build`, `typecheck`, `lint`, `test`.
- Cài **đúng** ma trận TechStack, **pin chính xác** (không `^`/`~`): `typescript`, `zod`, `yaml`, `vitest`, `eslint`, `prettier`, `@types/node`. Commit `package-lock.json`.
- `tsconfig.json`: `strict: true`, cấm `any`, path alias `@/* -> src/*`.
- `vitest.config.ts`: environment `node`, resolve alias `@/`.
- `eslint.config.mjs` (flat) với `@typescript-eslint/no-explicit-any` = **error** + Prettier; `.prettierrc`.
- Khung thư mục rỗng: `src/core/`, `src/adapters/claude/`, `test/fixtures/` (mỗi cái có `.gitkeep`).
- 1 smoke test chứng minh runner + alias `@/` chạy.

**Out of scope**
- Mọi loader/engine (`loadScript`, `advanceState`, `evaluateGate`…) → W2.
- Mọi hook + skill → W3.
- Nội dung golden web → W1C. Bố trí fixture test → W1D.

## 3. Checklist
- [x] `package.json` deps pin chính xác + 4 scripts; lockfile committed.
- [x] `tsconfig.json` `strict`, alias `@/*`.
- [x] `vitest.config.ts` env `node` + alias.
- [x] `eslint.config.mjs` flat, `no-explicit-any` error; `.prettierrc`.
- [x] `src/core/.gitkeep`, `src/adapters/claude/.gitkeep`, `test/fixtures/.gitkeep`.
- [x] `src/smoke.test.ts` import qua `@/` và pass.
- [x] `npm run typecheck` / `lint` / `build` / `npx vitest run` đều xanh.

## 4. Interfaces / Files expected to change
- `[NEW]` `package.json`, `package-lock.json`
- `[NEW]` `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `.prettierrc`
- `[NEW]` `src/core/.gitkeep`, `src/adapters/claude/.gitkeep`, `test/fixtures/.gitkeep`
- `[NEW]` `src/smoke.test.ts`

> Không định nghĩa type sản phẩm ở đây (W2 sở hữu `src/core/schemas`). Không cài UI/backend/DB (TechStack §Cấm).

## 5. Risks & mitigations
| Risk | Mức | Mitigation |
|---|---:|---|
| Version trôi phá determinism | TB | Pin chính xác, commit lockfile. |
| Vitest không resolve `@/` | TB | Cấu hình alias trong `vitest.config.ts`; smoke test import qua `@/` để chứng minh. |
| Kéo lậu dependency ngoài TechStack | TB | Chỉ cài đúng ma trận; thêm gì phải xin approve (VibeCode Step 4). |
| File vượt 200 dòng | Thấp | Chỉ lockfile (generated) vượt; file tay nhỏ. |

## 6. Verification plan
- `npm install` thành công, lockfile pin chính xác.
- `npm run typecheck` sạch dưới `strict`.
- `npm run lint` không lỗi (`no-explicit-any` active).
- `npm run build` xanh.
- `npx vitest run` xanh (smoke test xác nhận runner + alias).

## 7. Status
`DONE`

### Quyết định thực tế & Nghiệm thu
- Repo Node.js + TypeScript strict đã được dựng thành công và tích hợp ESLint flat config & Prettier.
- Đã cài và ghim chính xác các dependency: `yaml`, `zod`, `typescript`, `@types/node`, `eslint`, `eslint-config-prettier`, `prettier`, `typescript-eslint`, `vitest`.
- Đã kiểm tra tính năng typecheck, lint, build và vitest chạy xanh với test runner resolve path alias `@/` qua `src/smoke.test.ts`.
