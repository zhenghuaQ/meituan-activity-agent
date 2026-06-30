import { describe, it, expect } from "vitest";
import { TtlLruCache } from "../src/core/cache.js";

describe("TtlLruCache", () => {
  it("命中与未命中统计正确", () => {
    const c = new TtlLruCache<number>(10, 1000);
    expect(c.get("a")).toBeUndefined();
    c.set("a", 1);
    expect(c.get("a")).toBe(1);
    const s = c.stats();
    expect(s.hits).toBe(1);
    expect(s.misses).toBe(1);
  });

  it("TTL 过期后惰性失效", () => {
    const c = new TtlLruCache<number>(10, 1);
    c.set("a", 1, 1);
    return new Promise((r) => setTimeout(r, 5)).then(() => {
      expect(c.get("a")).toBeUndefined();
    });
  });

  it("超容量淘汰最久未使用", () => {
    const c = new TtlLruCache<number>(2, 1000);
    c.set("a", 1);
    c.set("b", 2);
    c.get("a"); // a 变最近使用
    c.set("c", 3); // 淘汰 b
    expect(c.get("a")).toBe(1);
    expect(c.get("b")).toBeUndefined();
    expect(c.get("c")).toBe(3);
  });

  it("wrap 仅在未命中时调用 loader", async () => {
    const c = new TtlLruCache<number>(10, 1000);
    let calls = 0;
    const loader = async () => {
      calls++;
      return 42;
    };
    expect(await c.wrap("k", loader)).toBe(42);
    expect(await c.wrap("k", loader)).toBe(42);
    expect(calls).toBe(1);
  });
});
