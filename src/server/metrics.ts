// ============================================================
// src/server/metrics.ts — 运行时指标采集（零依赖）
//
// 进程内累计：请求量/错误/按路由统计/决策数/降级数/限流拦截/时延。
// 时延用环形缓冲算 avg 与 p95，供监控面板与 /api/metrics 展示。
// ============================================================

interface RouteStat {
  count: number;
  errors: number;
  totalMs: number;
}

const MAX_SAMPLES = 500;

class Metrics {
  readonly startedAt = Date.now();
  private requests = 0;
  private errors = 0;
  private decisions = 0;
  private degraded = 0;
  private rateLimited = 0;
  private byRoute = new Map<string, RouteStat>();
  private latencies: number[] = [];

  recordRequest(route: string, ms: number, ok: boolean): void {
    this.requests++;
    if (!ok) this.errors++;
    const s = this.byRoute.get(route) ?? { count: 0, errors: 0, totalMs: 0 };
    s.count++;
    s.totalMs += ms;
    if (!ok) s.errors++;
    this.byRoute.set(route, s);

    this.latencies.push(ms);
    if (this.latencies.length > MAX_SAMPLES) this.latencies.shift();
  }

  recordDecision(degraded: boolean): void {
    this.decisions++;
    if (degraded) this.degraded++;
  }

  recordRateLimited(): void {
    this.rateLimited++;
  }

  private percentile(p: number): number {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return Math.round(sorted[idx]);
  }

  snapshot() {
    const avg =
      this.latencies.length > 0
        ? Math.round(this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length)
        : 0;
    return {
      uptimeMs: Date.now() - this.startedAt,
      requests: this.requests,
      errors: this.errors,
      decisions: this.decisions,
      degraded: this.degraded,
      rateLimited: this.rateLimited,
      latency: { avgMs: avg, p95Ms: this.percentile(95), samples: this.latencies.length },
      routes: Object.fromEntries(
        [...this.byRoute.entries()].map(([k, v]) => [
          k,
          { count: v.count, errors: v.errors, avgMs: v.count ? Math.round(v.totalMs / v.count) : 0 },
        ])
      ),
    };
  }

  reset(): void {
    this.requests = 0;
    this.errors = 0;
    this.decisions = 0;
    this.degraded = 0;
    this.rateLimited = 0;
    this.byRoute.clear();
    this.latencies = [];
  }
}

export const metrics = new Metrics();
export type MetricsSnapshot = ReturnType<Metrics["snapshot"]>;
