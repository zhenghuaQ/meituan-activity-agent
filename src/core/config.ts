// ============================================================
// src/core/config.ts — 应用配置中心
//
// 统一管理：运行环境（dev/demo/production）+ 特性开关（feature flags）。
// 设计原则：
// - 无 Key 自动关闭对应能力（LLM / 高德），保证零配置可演示。
// - 所有开关可被环境变量显式覆盖（FEATURE_*=on|off）。
// - 单例 + reset()，便于测试隔离。
//
// 目录约定（同仓前后端）：
//   后端 / Harness / 引擎  → 仓库根（src、spec、eval）
//   前端看板               → web/ 子目录（M5 建立，Vite+React）
//   一键并行启动           → M6 的 npm 脚本编排（concurrently）
// ============================================================

export type AppEnv = "dev" | "demo" | "production";

/** 特性开关 */
export interface FeatureFlags {
  /** LLM 意图解析（无 Key 自动关，降级关键词匹配） */
  llm: boolean;
  /** 高德真实数据（无 Key 自动关，降级 Mock） */
  amap: boolean;
  /** 结果缓存（搜索 / 通勤矩阵） */
  cache: boolean;
  /** 限流 */
  rateLimit: boolean;
  /** 降级策略总开关 */
  degrade: boolean;
}

export interface AppConfig {
  env: AppEnv;
  isDev: boolean;
  isDemo: boolean;
  isProd: boolean;
  logLevel: string;
  flags: FeatureFlags;
}

/** 读取布尔型环境变量；未设置时取默认值。on/1/true 为真，off/0/false 为假。 */
function envBool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const s = v.trim().toLowerCase();
  if (["on", "1", "true", "yes"].includes(s)) return true;
  if (["off", "0", "false", "no"].includes(s)) return false;
  return fallback;
}

function resolveEnv(): AppEnv {
  const raw = (process.env.APP_ENV || process.env.NODE_ENV || "dev").toLowerCase();
  if (raw === "production" || raw === "prod") return "production";
  if (raw === "demo") return "demo";
  return "dev";
}

let _config: AppConfig | null = null;

export function getAppConfig(): AppConfig {
  if (_config) return _config;

  const env = resolveEnv();

  // 能力可用性先验：依赖密钥是否存在
  const llmKeyPresent = !!(process.env.LLM_BASE_URL && process.env.LLM_API_KEY);
  const amapKeyPresent = !!process.env.AMAP_API_KEY;

  const flags: FeatureFlags = {
    // 显式开关优先；否则依据密钥是否存在
    llm: envBool("FEATURE_LLM", llmKeyPresent),
    amap: envBool("FEATURE_AMAP", amapKeyPresent),
    cache: envBool("FEATURE_CACHE", true),
    rateLimit: envBool("FEATURE_RATE_LIMIT", true),
    degrade: envBool("FEATURE_DEGRADE", true),
  };

  _config = {
    env,
    isDev: env === "dev",
    isDemo: env === "demo",
    isProd: env === "production",
    logLevel: process.env.LOG_LEVEL || "info",
    flags,
  };
  return _config;
}

/** 重置缓存（测试用） */
export function resetAppConfig(): void {
  _config = null;
}
