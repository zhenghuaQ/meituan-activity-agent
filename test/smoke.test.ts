// ============================================================
// test/smoke.test.ts — 冒烟测试，验证 Vitest 链路与基础工具函数
// ============================================================

import { describe, it, expect } from "vitest";
import { timeToMinutes, minutesToTime, timeDiff } from "../spec/constraints.js";

describe("时间工具函数", () => {
  it("timeToMinutes 正确换算", () => {
    expect(timeToMinutes("14:30")).toBe(14 * 60 + 30);
    expect(timeToMinutes("00:00")).toBe(0);
  });

  it("minutesToTime 正确换算并补零", () => {
    expect(minutesToTime(0)).toBe("00:00");
    expect(minutesToTime(14 * 60 + 5)).toBe("14:05");
  });

  it("timeToMinutes 与 minutesToTime 互逆", () => {
    for (const t of ["09:00", "14:09", "21:00", "23:59"]) {
      expect(minutesToTime(timeToMinutes(t))).toBe(t);
    }
  });

  it("timeDiff 计算分钟差", () => {
    expect(timeDiff("14:00", "16:30")).toBe(150);
  });
});
