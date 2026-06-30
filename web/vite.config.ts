import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ============================================================
// Vite 配置：开发态 proxy 到后端 Fastify（localhost:3000），
// 生产态由后端静态托管或独立部署，需配置 CORS 或反代。
// ============================================================

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 同步决策与 SSE 流式决策
      "/api/decide": {
        target: "http://localhost:3000",
        changeOrigin: true,
        // SSE 长连接需要
        ws: false,
      },
      // 画像 / 分层 / 指标 / 降级开关 / 健康
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/openapi.json": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
