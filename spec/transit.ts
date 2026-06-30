// spec/transit.ts — 交通与通勤模型
// 核心原则：用户要最短耗时，不是最低拥堵等级
// 真实API → 直接返回多条路线的预估耗时，Agent选最快的

import type { GeoLocation } from "./types.js";

// ─── 拥堵等级（仅用于展示，不作为排序依据） ────────

/** 
 * 拥堵等级 —— 展示用，不作为方案排序依据。
 * 真实地图API（高德/百度）会同时返回 拥堵等级 + 预估耗时。
 * 排序只看 totalMinutes。
 */
export type CongestionLevel =
  | "smooth"     // 畅通（绿色）
  | "slow"       // 缓行（黄色）
  | "congested"  // 拥堵（红色）
  | "blocked";   // 严重拥堵（深红/不建议）

/** 拥堵等级 → 展示图标 */
export const CongestionIcon: Record<CongestionLevel, string> = {
  smooth:    "🟢",
  slow:      "🟡",
  congested: "🔴",
  blocked:   "⛔",
};

// ─── 路线预估 ─────────────────────────────────────────

/** 
 * 一条备选通勤路线预估。
 * 真实API会返回多条路线（不走高速/最快/最短），Agent选 totalMinutes 最小的。
 */
export interface TransitRoute {
  distanceKm: number;
  congestionLevel: CongestionLevel;
  /** 预估耗时（分钟）—— 排序唯一依据 */
  estimatedMinutes: number;
  /** 拥堵导致的额外耗时（分钟） */
  congestionDelayMinutes: number;
  /** 路线描述，如"望京→三里屯 经北四环" */
  description: string;
}

/** 通勤预估结果（含多条备选路线） */
export interface TransitEstimate {
  from: GeoLocation;
  to: GeoLocation;
  departureTime: string;
  /** 备选路线列表，按 estimatedMinutes 升序排列 */
  routes: TransitRoute[];
  /** 最佳路线（耗时最短的那条） */
  best: TransitRoute;
  /** 预留缓冲（分钟）—— 最佳路线耗时的 20%，最低 5min */
  bufferMinutes: number;
  /** 总耗时 = best.estimatedMinutes + bufferMinutes */
  totalMinutes: number;
}

// ─── 约束检查（独立，不依赖 types.ts 的 ConstraintCheck） ──

export interface TransitConstraintCheck {
  passed: boolean;
  rule: string;
  detail: string;
}

export function checkTransitFeasible(
  transit: TransitEstimate,
  availableMinutes: number
): TransitConstraintCheck {
  const passed = transit.totalMinutes <= availableMinutes;
  const icon = CongestionIcon[transit.best.congestionLevel];
  return {
    passed,
    rule: "transit_feasible",
    detail: passed
      ? `${icon} ${transit.totalMinutes}min通勤 ≤ ${availableMinutes}min可用间隔`
      : `${icon} ${transit.totalMinutes}min通勤 > ${availableMinutes}min可用间隔，时间不够`,
  };
}

export function checkTransitReasonable(transit: TransitEstimate): TransitConstraintCheck {
  const passed = transit.totalMinutes <= 60;
  return {
    passed,
    rule: "transit_reasonable",
    detail: passed
      ? `通勤${transit.totalMinutes}min 合理`
      : `单段通勤${transit.totalMinutes}min较长，建议选择更近的地点`,
  };
}

export function transitScorePenalty(totalMinutes: number): number {
  if (totalMinutes <= 15) return 0;
  if (totalMinutes <= 30) return 5;
  if (totalMinutes <= 45) return 10;
  return 20;
}

// ─── Mock 生成逻辑 ─────────────────────────────────────

export function mockEstimateTransit(
  from: GeoLocation,
  to: GeoLocation,
  departureTime: string
): TransitEstimate {
  const dLat = (to.lat - from.lat) * 111;
  const dLng = (to.lng - from.lng) * 111 * Math.cos(((from.lat + to.lat) / 2) * Math.PI / 180);
  const distanceKm = Math.sqrt(dLat ** 2 + dLng ** 2);

  const hour = parseInt(departureTime.split(":")[0], 10);
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  const baseSpeed = isRushHour ? 18 : 35;
  const estimatedMinutes = Math.round((distanceKm / baseSpeed) * 60);

  const congestionLevel: CongestionLevel = isRushHour
    ? (estimatedMinutes > 45 ? "congested" : "slow")
    : "smooth";

  const congestionDelayMinutes = isRushHour
    ? Math.round(estimatedMinutes * 0.4)
    : 0;

  const best: TransitRoute = {
    distanceKm: Math.round(distanceKm * 10) / 10,
    congestionLevel,
    estimatedMinutes,
    congestionDelayMinutes,
    description: `${from.address} → ${to.address}`,
  };

  const bufferMinutes = Math.max(5, Math.round(estimatedMinutes * 0.2));
  const totalMinutes = estimatedMinutes + bufferMinutes;

  const altRoute: TransitRoute = {
    distanceKm: Math.round(distanceKm * 1.3 * 10) / 10,
    congestionLevel: "smooth",
    estimatedMinutes: estimatedMinutes + 5,
    congestionDelayMinutes: 0,
    description: `${from.address} → ${to.address}(绕行)`,
  };

  return {
    from,
    to,
    departureTime,
    routes: [best, altRoute].sort((a, b) => a.estimatedMinutes - b.estimatedMinutes),
    best,
    bufferMinutes,
    totalMinutes,
  };
}

