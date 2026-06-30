// ============================================================
// src/server/ratelimit.ts — 固定窗口限流（零依赖）
//
// 按 key（默认客户端 IP）在 windowMs 内限制 limit 次请求。
// 内存实现，单实例足够；惰性清理过期窗口。
// ============================================================

interface Window {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

const windows = new Map<string, Window>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  let w = windows.get(key);

  if (!w || now >= w.resetAt) {
    w = { count: 0, resetAt: now + windowMs };
    windows.set(key, w);
  }

  w.count++;
  const ok = w.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - w.count),
    resetAt: w.resetAt,
    limit,
  };
}

/** 测试/维护用：清空所有限流窗口 */
export function resetRateLimit(): void {
  windows.clear();
}
