// ============================================================
// eslint.config.js — ESLint 扁平配置（轻量工程规范）
// 仅启用必要规则，避免过度约束拖慢交付。
// ============================================================

import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "web/**", "coverage/**"],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // 允许下划线前缀的未使用参数（接口占位）
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // 渐进收口：as any 暂以告警提示，后续模块逐步消除
      "@typescript-eslint/no-explicit-any": "warn",
    },
  }
);
