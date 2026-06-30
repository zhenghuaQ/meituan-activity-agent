import { describe, it, expect } from "vitest";
import { MockProvider } from "../src/data/providers/mock-provider.js";
import { HOME } from "../src/data/mock.js";
import type { GeoLocation } from "../spec/types.js";

const mock = new MockProvider();

describe("MockProvider", () => {
  it("以 HOME 为出发点，景点按距离升序且 distanceKm 已重算", async () => {
    const list = await mock.searchAttractions({ origin: HOME, radiusKm: 15 });
    expect(list.length).toBeGreaterThan(0);
    // 升序
    for (let i = 1; i < list.length; i++) {
      expect(list[i].distanceKm).toBeGreaterThanOrEqual(list[i - 1].distanceKm);
    }
  });

  it("换出发点后距离随之改变（证明动态计算）", async () => {
    const far: GeoLocation = { lat: 39.91, lng: 116.46, address: "国贸", city: "北京" };
    const fromHome = await mock.searchAttractions({ origin: HOME, radiusKm: 50 });
    const fromFar = await mock.searchAttractions({ origin: far, radiusKm: 50 });
    const sameId = fromHome[0].id;
    const a = fromHome.find((p) => p.id === sameId)!;
    const b = fromFar.find((p) => p.id === sameId)!;
    expect(a.distanceKm).not.toBe(b.distanceKm);
  });

  it("半径过滤生效", async () => {
    const tight = await mock.searchAttractions({ origin: HOME, radiusKm: 1 });
    const wide = await mock.searchAttractions({ origin: HOME, radiusKm: 50 });
    expect(wide.length).toBeGreaterThanOrEqual(tight.length);
  });

  it("按 id 取餐厅", async () => {
    const r = await mock.getRestaurantById("rest_001");
    expect(r?.name).toContain("望京");
  });
});
