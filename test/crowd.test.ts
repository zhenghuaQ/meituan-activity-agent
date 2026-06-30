import { describe, it, expect } from "vitest";
import { predictCrowd } from "../src/data/crowd.js";
import type { Restaurant, Attraction } from "../spec/types.js";

const restaurant: Restaurant = {
  id: "r1",
  name: "测试餐厅",
  type: "restaurant",
  crowdTags: ["friends"],
  localFeatures: [],
  address: "x",
  distanceKm: 1,
  location: { lat: 39.99, lng: 116.47, address: "x", city: "北京" },
  rating: 4.6,
  cuisine: "火锅",
  tags: [],
  avgDurationMinutes: 80,
  hasQueue: true,
  queueCount: 20,
  dietaryOptions: true,
};

const attraction: Attraction = {
  id: "a1",
  name: "测试景点",
  type: "attraction",
  crowdTags: ["family_kids"],
  localFeatures: ["popular_checkin"],
  address: "x",
  distanceKm: 1,
  location: { lat: 39.99, lng: 116.47, address: "x", city: "北京" },
  rating: 4.8,
  durationMinutes: 120,
  indoor: true,
  availableSlots: [],
};

describe("predictCrowd", () => {
  it("用餐高峰比非高峰更拥挤、等待更久", () => {
    const peak = predictCrowd(restaurant, { arrivalTime: "12:00", isWeekend: true });
    const off = predictCrowd(restaurant, { arrivalTime: "15:00", isWeekend: false });
    expect(peak.estimatedWaitMinutes).toBeGreaterThan(off.estimatedWaitMinutes);
  });

  it("真实排队数提升置信度", () => {
    const p = predictCrowd(restaurant, { arrivalTime: "12:00", isWeekend: false });
    expect(p.confidence).toBeGreaterThan(0.7);
    expect(p.factors.join("")).toContain("排队");
  });

  it("网红景点周末午后被判为高拥挤", () => {
    const p = predictCrowd(attraction, { arrivalTime: "14:00", isWeekend: true });
    expect(["high", "packed"]).toContain(p.level);
    expect(p.factors.length).toBeGreaterThan(0);
  });

  it("confidence 始终落在 0-1", () => {
    const p = predictCrowd(attraction, { arrivalTime: "09:00", isWeekend: false });
    expect(p.confidence).toBeGreaterThan(0);
    expect(p.confidence).toBeLessThanOrEqual(1);
  });
});
