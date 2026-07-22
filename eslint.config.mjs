import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    // .claude/worktrees/ chứa bản sao repo của agent worktree — lint bản chính là đủ.
    ignores: [
      'dist/**',
      'node_modules/**',
      '.claude/**',
      'adapter/codex-plugin/dist/**',
      'adapter/codex-plugin/node_modules/**',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['adapter/**/*.mjs', 'scripts/**/*.mjs', '*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        URL: 'readonly',
      },
    },
  }
);
