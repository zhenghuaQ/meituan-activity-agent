// ============================================================
// src/core/cache.ts — 轻量 LRU + TTL 缓存
//
// 用于收敛重复的高德 POI / 地理编码 / 通勤矩阵请求。
// 零依赖：基于 Map 的插入顺序实现 LRU，配合软过期 TTL。
// ============================================================

interface Entry<V> {
  value: V;
  expireAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
}

/**
 * 固定容量 + TTL 的 LRU 缓存。
 * - 读命中会把键移到最近使用端；
 * - 写满后淘汰最久未使用键；
 * - 过期键惰性删除（读时校验 expireAt）。
 */
export class TtlLruCache<V> {
  private store = new Map<string, Entry<V>>();
  private hits = 0;
  private misses = 0;

  constructor(
    private readonly maxSize: number = 500,
    private readonly ttlMs: number = 5 * 60 * 1000
  ) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() > entry.expireAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    // LRU: 触达即移到末尾（最近使用）
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key: string, value: V, ttlMs?: number): void {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expireAt: Date.now() + (ttlMs ?? this.ttlMs) });
    // 容量淘汰：删除最旧（Map 头部）
    while (this.store.size > this.maxSize) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  stats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.store.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * 包装异步取数：命中直接返回，未命中执行 loader 并写回。
   * 这是 Provider 收敛重复请求的统一入口。
   */
  async wrap(key: string, loader: () => Promise<V>, ttlMs?: number): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await loader();
    this.set(key, value, ttlMs);
    return value;
  }
}
