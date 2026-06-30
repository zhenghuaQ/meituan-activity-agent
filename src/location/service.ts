// ============================================================
// src/location/service.ts — 定位服务
//
// 把多种定位来源统一解析为 GeoLocation：
//   1) 显式经纬度（浏览器 Geolocation 上报，前端 M5 接入）
//   2) 手输地址 → 高德地理编码（无 Key 降级 Mock 名称匹配）
//   3) 高德 IP 定位（仅服务端可用）
//   4) 兜底默认点（望京 HOME），保证零配置可演示
// ============================================================

import type { GeoLocation } from "../../spec/types.js";
import { getDataSource } from "../data/index.js";
import { HOME } from "../data/mock.js";
import { getAppConfig } from "../core/config.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("location");
const AMAP_IP = "https://restapi.amap.com/v3/ip";

export type LocationInput =
  | { kind: "coords"; lat: number; lng: number; address?: string; city?: string }
  | { kind: "address"; address: string }
  | { kind: "ip"; ip?: string }
  | { kind: "default" };

export interface ResolvedLocation {
  location: GeoLocation;
  /** 实际命中的来源，便于可观测与降级提示 */
  source: "coords" | "geocode" | "ip" | "default";
}

/** 高德 IP 定位：返回城市级中心点（精度有限，作为粗定位） */
async function locateByIp(ip?: string): Promise<GeoLocation | null> {
  const key = process.env.AMAP_API_KEY;
  if (!key || !getAppConfig().flags.amap) return null;
  try {
    const url = new URL(AMAP_IP);
    url.searchParams.set("key", key);
    if (ip) url.searchParams.set("ip", ip);
    const resp = await fetch(url.toString());
    const json = (await resp.json()) as {
      status?: string;
      city?: string | string[];
      rectangle?: string;
    };
    // rectangle: "lng,lat;lng,lat" 取中心
    if (json.status !== "1" || !json.rectangle || !json.rectangle.includes(";")) {
      return null;
    }
    const [p1, p2] = json.rectangle.split(";");
    const [lng1, lat1] = p1.split(",").map(Number);
    const [lng2, lat2] = p2.split(",").map(Number);
    const city = Array.isArray(json.city) ? json.city[0] : json.city || "";
    return {
      lat: (lat1 + lat2) / 2,
      lng: (lng1 + lng2) / 2,
      address: `${city}（IP 粗定位）`,
      city,
    };
  } catch (err) {
    log.warn({ err: err instanceof Error ? err.message : String(err) }, "IP 定位失败");
    return null;
  }
}

/**
 * 解析定位输入为坐标。任何来源失败都会逐级降级，最终回落默认点，
 * 永不抛错——定位失败不应阻断决策主流程。
 */
export async function resolveLocation(
  input: LocationInput = { kind: "default" }
): Promise<ResolvedLocation> {
  if (input.kind === "coords") {
    return {
      source: "coords",
      location: {
        lat: input.lat,
        lng: input.lng,
        address: input.address || "用户当前位置",
        city: input.city || HOME.city,
      },
    };
  }

  if (input.kind === "address") {
    const geo = await getDataSource().geocode(input.address);
    if (geo) return { source: "geocode", location: geo };
    log.warn({ address: input.address }, "地址解析失败，降级默认点");
    return { source: "default", location: { ...HOME } };
  }

  if (input.kind === "ip") {
    const geo = await locateByIp(input.ip);
    if (geo) return { source: "ip", location: geo };
    return { source: "default", location: { ...HOME } };
  }

  return { source: "default", location: { ...HOME } };
}
