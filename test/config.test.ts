// ============================================================
// test/config.test.ts — 配置中心：环境解析与特性开关
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAppConfig, resetAppConfig } from "../src/core/config.js";

const SNAPSHOT_KEYS = [
  "APP_ENV", "NODE_ENV", "FEATURE_LLM", "FEATURE_AMAP", "FEATURE_CACHE",
  "FEATURE_RATE_LIMIT", "FEATURE_DEGRADE", "LLM_BASE_URL", "LLM_API_KEY", "AMAP_API_KEY",
];

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const k of SNAPSHOT_KEYS) saved[k] = process.env[k];
  for (const k of SNAPSHOT_KEYS) delete process.env[k];
  resetAppConfig();
});

afterEach(() => {
  for (const k of SNAPSHOT_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  resetAppConfig();
});

describe("应用配置中心", () => {
  it("默认环境为 dev", () => {
    expect(getAppConfig().env).toBe("dev");
  });

  it("APP_ENV=demo 被正确解析", () => {
    process.env.APP_ENV = "demo";
    resetAppConfig();
    const c = getAppConfig();
    expect(c.isDemo).toBe(true);
    expect(c.isDev).toBe(false);
  });

  it("无密钥时 LLM/高德 自动关闭", () => {
    const c = getAppConfig();
    expect(c.flags.llm).toBe(false);
    expect(c.flags.amap).toBe(false);
  });

  it("有密钥时 LLM/高德 自动开启", () => {
    process.env.LLM_BASE_URL = "https://x";
    process.env.LLM_API_KEY = "k";
    process.env.AMAP_API_KEY = "k";
    resetAppConfig();
    const c = getAppConfig();
    expect(c.flags.llm).toBe(true);
    expect(c.flags.amap).toBe(true);
  });

  it("显式 FEATURE_LLM=off 覆盖密钥先验", () => {
    process.env.LLM_BASE_URL = "https://x";
    process.env.LLM_API_KEY = "k";
    process.env.FEATURE_LLM = "off";
    resetAppConfig();
    expect(getAppConfig().flags.llm).toBe(false);
  });

  it("缓存/限流/降级 默认开启", () => {
    const c = getAppConfig();
    expect(c.flags.cache).toBe(true);
    expect(c.flags.rateLimit).toBe(true);
    expect(c.flags.degrade).toBe(true);
  });
});
