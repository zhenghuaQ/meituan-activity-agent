// ============================================================
// src/core/geo.ts — 地理计算工具
//
// 提供 Haversine 实时距离计算，替代 Mock 数据里写死的 distanceKm。
// 距离永远相对「用户真实出发点」动态计算，而非固定基准点。
// ============================================================

import type { GeoLocation } from "../../spec/types.js";
import type { Place } from "../../spec/types.js";

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine 公式计算两个经纬度之间的球面距离（km）。
 * 精度足够城市内通勤场景，避免引入重型地理库。
 */
export function haversineKm(a: GeoLocation, b: GeoLocation): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

/** 距离保留 1 位小数 */
export function roundKm(km: number): number {
  return Math.round(km * 10) / 10;
}

/**
 * 以 origin 为出发点，重算一组地点的 distanceKm，并按距离升序返回。
 * 返回浅拷贝，不修改入参对象（保持数据源不可变）。
 */
export function withDistanceFrom<T extends Place>(
  origin: GeoLocation,
  places: T[]
): T[] {
  return places
    .map((p) => ({ ...p, distanceKm: roundKm(haversineKm(origin, p.location)) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** 过滤半径内的地点（先重算距离，再按 maxKm 截断） */
export function filterWithinRadius<T extends Place>(
  origin: GeoLocation,
  places: T[],
  radiusKm: number
): T[] {
  return withDistanceFrom(origin, places).filter((p) => p.distanceKm <= radiusKm);
}
