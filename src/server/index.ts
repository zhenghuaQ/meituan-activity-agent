// ============================================================
// src/server/index.ts — 网关启动入口
// ============================================================

import "dotenv/config";
import { buildServer } from "./app.js";
import { getAppConfig } from "../core/config.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("server");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

async function main() {
  const app = buildServer();
  try {
    await app.listen({ port: PORT, host: HOST });
    const cfg = getAppConfig();
    log.info(
      { port: PORT, host: HOST, env: cfg.env, flags: cfg.flags },
      `网关已启动 → http://localhost:${PORT}（文档 /docs）`
    );
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : String(err) }, "网关启动失败");
    process.exit(1);
  }
}

main();
