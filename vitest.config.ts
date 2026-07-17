import { defineConfig, configDefaults } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    environment: 'node',
    // Worktree của agent nằm trong .claude/worktrees/ và mang theo bản sao đầy đủ
    // của bộ test. Không loại trừ thì mỗi lần chạy sẽ gom cả bộ test của worktree
    // khác — chạy trùng, và chạy đúng bản mã nguồn cũ đang nằm trong worktree đó.
    exclude: [...configDefaults.exclude, '**/.claude/worktrees/**'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
