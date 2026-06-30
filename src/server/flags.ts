// ============================================================
// src/server/flags.ts — 运行时降级开关（演示/路演可热切）
//
// 在 config 静态特性开关之上叠加一层「运行时 overlay」，
// 让路由真正消费这些开关：可一键强制 Mock 解析、关限流等，
// 便于现场演示「降级策略」而无需重启。
// ============================================================

import { getAppConfig } from "../core/config.js";

export interface RuntimeFlags {
  /** 限流开关 */
  rateLimit: boolean;
  /** 降级：跳过 LLM，强制关键词解析（可观测的降级演示） */
  forceMockIntent: boolean;
  /** 缓存开关（信息性，反映配置） */
  cache: boolean;
}

let overlay: Partial<RuntimeFlags> = {};

export function getRuntimeFlags(): RuntimeFlags {
  const cfg = getAppConfig();
  return {
    rateLimit: overlay.rateLimit ?? cfg.flags.rateLimit,
    // 无 LLM Key 时本就走 Mock；overlay 可强制开启
    forceMockIntent: overlay.forceMockIntent ?? !cfg.flags.llm,
    cache: overlay.cache ?? cfg.flags.cache,
  };
}

export function setRuntimeFlags(patch: Partial<RuntimeFlags>): RuntimeFlags {
  overlay = { ...overlay, ...patch };
  return getRuntimeFlags();
}

export function resetRuntimeFlags(): void {
  overlay = {};
}
