# Project Profile Schema & Privacy Boundary

Tài liệu này đặc tả cấu trúc `ProjectProfile` và các nguyên tắc bảo mật thông tin máy cục bộ của người dùng trong phân hệ chuẩn đoán (`doctor`).

## 1. Heuristics & Support Matrix

Hệ thống tự động phát hiện loại dự án dựa trên cấu trúc các tệp tin cấu hình đặc trưng (markers):

| Project Target | Runtime | Package Manager | Language | Markers |
|---|---|---|---|---|
| `node-cli` | Node.js | `npm` / `pnpm` / `yarn` | TS / JS | `package.json` (không có vite), lockfiles |
| `vite-web` | Node.js | `npm` / `pnpm` / `yarn` | TS / JS | `package.json` (chứa vite), `vite.config.*` |
| `python-cli` | Python | `pip` | Python | `requirements.txt`, `pyproject.toml` |
| `unsupported` | - | - | - | `go.mod`, `Cargo.toml`, v.v. |

## 2. Privacy Boundary (Quy tắc bảo mật)

Để tránh rò rỉ dữ liệu nhạy cảm của người dùng cục bộ ra các mô hình AI hoặc lưu trữ cấu hình:
1. **Redact absolute paths**: Toàn bộ đường dẫn tuyệt đối (chứa tên thư mục gốc của user, ví dụ: `C:/Users/username/work/project/...`) sẽ bị cắt bỏ, chỉ giữ lại phần tương đối trong workspace hoặc tên file cơ bản (basename).
2. **Không quét thư mục hệ thống**: Doctor chỉ thực thi quét bên trong thư mục workspace hiện tại. Không truy cập `~/` hay các cấu hình IDE toàn cục.
3. **Không thu thập biến môi trường (env)**: Không xuất nội dung các biến môi trường nhạy cảm ra tệp tin cấu hình.

## 3. Profile Schema

```typescript
export interface ProjectProfile {
  workspace_kind: 'empty' | 'existing-supported' | 'existing-unsupported';
  target: 'node-cli' | 'vite-web' | 'python-cli' | 'unsupported' | null;
  runtime: string | null;
  package_manager: 'npm' | 'pnpm' | 'yarn' | 'pip' | null;
  framework: 'vite' | 'none' | null;
  language: 'typescript' | 'javascript' | 'python' | null;
  source_root: string | null;
  manifest_paths: string[];
  capabilities: string[];
  confirmation: {
    confirmed: boolean;
    confirmed_by?: string;
    confirmed_at?: string;
  };
  evidence: Array<{
    name: string;
    path?: string;
    observed_at: string;
    confidence: number;
  }>;
}
```
