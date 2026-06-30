import { describe, it, expect } from "vitest";
import { haversineKm, withDistanceFrom, filterWithinRadius } from "../src/core/geo.js";
import type { GeoLocation, Place } from "../spec/types.js";

const wangjing: GeoLocation = { lat: 39.995, lng: 116.47, address: "望京", city: "北京" };

function place(id: string, lat: number, lng: number): Place {
  return {
    id,
    name: id,
    type: "attraction",
    crowdTags: [],
    localFeatures: [],
    address: id,
    distanceKm: 999, // 故意写错，验证会被重算覆盖
    location: { lat, lng, address: id, city: "北京" },
    rating: 4.5,
  };
}

describe("geo / Haversine", () => {
  it("同点距离为 0", () => {
    expect(haversineKm(wangjing, wangjing)).toBeCloseTo(0, 5);
  });

  it("望京→国贸约 9-11km（量级正确）", () => {
    const guomao: GeoLocation = { lat: 39.91, lng: 116.46, address: "国贸", city: "北京" };
    const d = haversineKm(wangjing, guomao);
    expect(d).toBeGreaterThan(8);
    expect(d).toBeLessThan(12);
  });

  it("withDistanceFrom 重算静态 distanceKm 并按距离升序", () => {
    const near = place("near", 39.996, 116.471);
    const far = place("far", 40.1, 116.6);
    const out = withDistanceFrom(wangjing, [far, near]);
    expect(out[0].id).toBe("near");
    expect(out[1].id).toBe("far");
    expect(out[0].distanceKm).toBeLessThan(1); // 不再是写死的 999
    expect(out[0].distanceKm).not.toBe(999);
  });

  it("filterWithinRadius 截断半径外地点", () => {
    const near = place("near", 39.996, 116.471);
    const far = place("far", 40.3, 116.9);
    const out = filterWithinRadius(wangjing, [near, far], 5);
    expect(out.map((p) => p.id)).toEqual(["near"]);
  });
});
