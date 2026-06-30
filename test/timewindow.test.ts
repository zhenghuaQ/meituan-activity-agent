// ============================================================
// test/timewindow.test.ts — 时间窗一致性（回归：end 截断后 durationHours 同步）
// ============================================================

import { describe, it, expect } from "vitest";
import { parseIntent } from "../src/intent/parser.js";
import { timeToMinutes } from "../spec/constraints.js";

/** 不变量：end - start 的小时数必须等于 durationHours */
function assertConsistent(rawText: string) {
  const { timeWindow: tw } = parseIntent(rawText);
  const diffHours = (timeToMinutes(tw.end) - timeToMinutes(tw.start)) / 60;
  expect(diffHours).toBeCloseTo(tw.durationHours, 5);
  expect(timeToMinutes(tw.end)).toBeLessThanOrEqual(21 * 60);
}

describe("时间窗一致性", () => {
  it("晚上出发且会超过21点时，end 截断且 durationHours 同步收敛", () => {
    const { timeWindow: tw } = parseIntent("晚上想出去玩，待5个小时");
    expect(tw.start).toBe("18:00");
    expect(tw.end).toBe("21:00");
    expect(tw.durationHours).toBe(3);
  });

  it("多种输入下 end/start/durationHours 始终自洽", () => {
    assertConsistent("今天下午和朋友出去玩4-6个小时");
    assertConsistent("晚上想出去玩，待5个小时");
    assertConsistent("下午带孩子出去转转");
    assertConsistent("晚上8点出去待4小时");
  });
});
