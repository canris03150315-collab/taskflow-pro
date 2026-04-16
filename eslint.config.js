import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx,cjs,mjs}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
        ...globals.commonjs,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // ============================================================
      // 抓真正的 bugs（error 級別）
      // ============================================================
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'no-redeclare': 'error',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',

      // ============================================================
      // 提醒可疑寫法（warning 級別）
      // ============================================================

      // 防 `as string` 斷言（過往造成頭像上傳 bug）
      '@typescript-eslint/consistent-type-assertions': [
        'warn',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],

      // console 留在 production 不該（warn 提醒，不擋）
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],

      // React Hooks 依賴遺漏
      'react-hooks/exhaustive-deps': 'warn',

      // 未使用的變數
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-unused-vars': 'off', // 用 TS 版本

      'prefer-const': 'warn',

      // ============================================================
      // 關閉：對現有 code 太嚴會炸或不適用
      // ============================================================
      'no-undef': 'off', // TypeScript 自己檢查
      'react/react-in-jsx-scope': 'off', // React 17+
      'react/prop-types': 'off', // 用 TypeScript
      '@typescript-eslint/no-explicit-any': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-useless-escape': 'warn',
      'no-async-promise-executor': 'warn',
      'no-prototype-builtins': 'off',
    },
  },
  // 忽略這些路徑
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'frontend/dist/**',
      'backend/dist/**',
      'backend/node_modules/**',
      'backend/data/**',
      '*.config.js',
      'archive-backups/**',
      'archive-scripts/**',
      'backups/**',
      'docs/**',
      'PROJECT_BRAIN.md',
      'WORK_LOG_CURRENT.md',
      // Snapshot/backup JS files dumped from server (often have BOM or non-UTF8)
      '*-current.js',
      '*-current-*.js',
      '*-original.js',
      '*-backup.js',
      '*-compiled-backup.js',
      'ai-assistant.js',
      'tasks-current.js',
      'add-finance-confirm-api.cjs',
      'current-reports.js',
    ],
  },
  // Prettier 必須最後
  prettier,
];
