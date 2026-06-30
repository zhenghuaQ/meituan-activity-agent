// ============================================================
// src/planner/scheduler.ts — 时间线编排器
// 输入：活动列表 → 输出：带时间线的 Activity[]
// ============================================================

import type {
  Activity,
  Place,
  GeoLocation,
  LeadRole,
  BreakSubtype,
} from "../../spec/types.js";
import type { TransitEstimate } from "../../spec/transit.js";
import { LeadRoleStrategy } from "../../spec/types.js";
import { minutesToTime, timeToMinutes } from "../../spec/constraints.js";
import { estimateTransitWithAmap } from "../transit/amap.js";

/**
 * 将一组 Place 编排为完整的 Activity[] 时间线。
 *
 * 编排逻辑：
 * 1. 按 '玩 → 茶歇 → 吃 → 附加' 顺序排列
 * 2. 每两个环节间插入通勤预估
 * 3. 用顺推法：上一环节结束 + 通勤耗时 → 下一环节开始
 */
export async function scheduleActivities(
  places: Place[],
  startTime: string,
  home: GeoLocation
): Promise<{ activities: Activity[]; totalMinutes: number }> {
  let currentTime = timeToMinutes(startTime);
  let lastLocation: GeoLocation = home;
  const activities: Activity[] = [];

  for (let i = 0; i < places.length; i++) {
    const place = places[i];

    // 通勤预估
    let transitTo: TransitEstimate | null = null;
    if (i > 0 || place.location.lat !== home.lat || place.location.lng !== home.lng) {
      transitTo = await estimateTransitWithAmap(
        lastLocation,
        place.location,
        minutesToTime(currentTime)
      );
      currentTime += transitTo.totalMinutes;
    }

    const scheduledStart = minutesToTime(currentTime);

    // 提取该Place的建议时长（分钟）
    const durationMin = getPlaceDuration(place);
    const scheduledEnd = minutesToTime(currentTime + durationMin);

    activities.push({
      order: i + 1,
      place,
      scheduledStart,
      scheduledEnd,
      status: "pending",
      transitTo: i === 0 ? null : transitTo,
    });

    currentTime += durationMin;
    lastLocation = place.location;
  }

  const totalMinutes = currentTime - timeToMinutes(startTime);

  return { activities, totalMinutes };
}

/** 从Place提取建议活动时长（分钟） */
function getPlaceDuration(place: Place): number {
  if (place.type === "attraction") {
    return (place as import("../../spec/types.js").Attraction).durationMinutes;
  }
  if (place.type === "break") {
    return (place as import("../../spec/types.js").BreakPlace).durationMinutes;
  }
  if (place.type === "restaurant") {
    return (place as import("../../spec/types.js").Restaurant).avgDurationMinutes;
  }
  return 60; // 默认1小时
}

/**
 * 根据 LeadRole 确定茶歇子类型
 */
export function getBreakSubtype(leadRole: LeadRole): BreakSubtype {
  const strategy = LeadRoleStrategy[leadRole];
  switch (strategy.breakPreference) {
    case "tea_house": return "tea_house";
    case "kids_play": return "kids_indoor_play";
    case "cafe_dessert": return "cafe";
    default: return "cafe";
  }
}

