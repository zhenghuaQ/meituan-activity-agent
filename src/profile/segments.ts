// ============================================================
// src/profile/segments.ts — 用户分层定义与权重先验
//
// 每个分层给出「相对默认权重的乘子」，体现该人群的决策侧重：
//   亲子优先 → 抬人群适配/降通勤敏感；精打细算 → 抬预算；品质党 → 抬偏好+口碑…
// 乘子施加到 DEFAULT_WEIGHTS 后再归一化（见 weights.ts）。
// ============================================================

import type { SegmentProfile, UserSegment } from "../../spec/profile.js";

export const SEGMENT_PROFILES: Record<UserSegment, SegmentProfile> = {
  balanced: {
    segment: "balanced",
    label: "均衡型",
    description: "各维度均衡权衡，无明显偏好",
    weightMultipliers: {},
  },
  family_first: {
    segment: "family_first",
    label: "亲子优先",
    description: "以孩子体验为中心，看重人群适配与通勤省心",
    weightMultipliers: { crowd: 1.5, transit: 1.3, preference: 1.1, popularity: 0.8 },
    defaults: { maxDistanceKm: 12 },
  },
  comfort_senior: {
    segment: "comfort_senior",
    label: "舒适陪老",
    description: "陪老人出游，看重通勤短、人少、节奏舒缓",
    weightMultipliers: { transit: 1.5, crowd: 1.4, time: 1.1, popularity: 0.7 },
    defaults: { maxDistanceKm: 10 },
  },
  quality_seeker: {
    segment: "quality_seeker",
    label: "品质体验党",
    description: "追求高口碑与偏好契合，对价格不敏感",
    weightMultipliers: { preference: 1.5, popularity: 1.4, budget: 0.5 },
    defaults: { budget: "high" },
  },
  budget_conscious: {
    segment: "budget_conscious",
    label: "精打细算",
    description: "预算敏感，优先高性价比",
    weightMultipliers: { budget: 1.8, popularity: 0.9, preference: 0.9 },
    defaults: { budget: "low" },
  },
  explorer: {
    segment: "explorer",
    label: "尝鲜打卡",
    description: "热衷网红打卡与新鲜体验，乐于多走一点",
    weightMultipliers: { popularity: 1.5, preference: 1.2, transit: 0.7 },
  },
  efficiency: {
    segment: "efficiency",
    label: "高效省时",
    description: "时间宝贵，优先省时与短通勤",
    weightMultipliers: { transit: 1.6, time: 1.4, crowd: 1.1, popularity: 0.8 },
  },
};

export function getSegmentProfile(segment: UserSegment): SegmentProfile {
  return SEGMENT_PROFILES[segment] ?? SEGMENT_PROFILES.balanced;
}

export const ALL_SEGMENTS: UserSegment[] = Object.keys(SEGMENT_PROFILES) as UserSegment[];
