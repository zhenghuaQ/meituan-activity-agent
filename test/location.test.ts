import { describe, it, expect } from "vitest";
import { resolveLocation } from "../src/location/service.js";
import { HOME } from "../src/data/mock.js";

describe("resolveLocation", () => {
  it("coords 直接透传经纬度", async () => {
    const r = await resolveLocation({ kind: "coords", lat: 31.23, lng: 121.47, city: "上海" });
    expect(r.source).toBe("coords");
    expect(r.location.lat).toBe(31.23);
    expect(r.location.city).toBe("上海");
  });

  it("default 回落 HOME", async () => {
    const r = await resolveLocation({ kind: "default" });
    expect(r.source).toBe("default");
    expect(r.location.address).toBe(HOME.address);
  });

  it("无 Key 时 address 经 Mock 名称匹配或降级，不抛错", async () => {
    const r = await resolveLocation({ kind: "address", address: "望京" });
    expect(r.location).toBeTruthy();
    expect(["geocode", "default"]).toContain(r.source);
  });
});
