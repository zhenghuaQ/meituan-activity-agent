// ============================================================
// spec/tools.ts — Tool 输入输出签名（SDD 契约）
// 仅保留「决策相关」工具：定位 / 搜索 / 可用性查询 / 追问 / 通勤估算。
// 不含任何下单、预订、取号、配送下单等交易/履约动作。
// ============================================================

import type {
  Attraction,
  BreakPlace,
  BreakSubtype,
  CrowdTag,
  DistanceConstraint,
  FollowUpQuestion,
  GeoLocation,
  Group,
  LocalFeatureTag,
  Restaurant,
  TimeWindow,
} from "./types.js";

// ─── Tool 0: get_user_location ─────────────────────────
// 🆕 获取用户真实定位（Mock → 真实API）

export interface GetUserLocationInput {
  /** 用户ID或设备标识（Demo可忽略） */
  userId?: string;
}

export type GetUserLocationOutput = GeoLocation;

// ─── Tool 1: search_attractions ─────────────────────────
// 🔄 增加 localFeatures 参数

export interface SearchAttractionsInput {
  crowdTags: CrowdTag[];
  timeWindow: TimeWindow;
  distance: DistanceConstraint;
  keywords?: string[];
  /** 🆕 当地特色标签 */
  localFeatures?: LocalFeatureTag[];
}

export type SearchAttractionsOutput = Attraction[];

// ─── Tool 2: search_restaurants ─────────────────────────
// 🔄 增加 dietaryRestrictions, localFeatures

export interface SearchRestaurantsInput {
  group: Group;
  timeWindow: TimeWindow;
  distance: DistanceConstraint;
  preferenceTags?: string[];
  /** 🆕 忌口关键词 */
  dietaryRestrictions?: string[];
  /** 🆕 当地特色标签 */
  localFeatures?: LocalFeatureTag[];
}

export type SearchRestaurantsOutput = Restaurant[];

// ─── Tool 3: search_break_places ────────────────────────
// 🆕 搜索茶歇地点（茶馆/咖啡厅/儿童小乐园）

export interface SearchBreakPlacesInput {
  /** 茶歇子类型偏好 */
  breakSubtype: BreakSubtype;
  /** 是否有老年人（需要无障碍设施） */
  hasElderly: boolean;
  /** 是否有幼年儿童 */
  hasYoungChildren: boolean;
  distance: DistanceConstraint;
  /** 期望的时间段 */
  afterTime: string;
}

export type SearchBreakPlacesOutput = BreakPlace[];

// ─── Tool 4: check_attraction_availability ───────────────

export interface CheckAttractionAvailabilityInput {
  attractionId: string;
  arrivalTime: string;
}

export interface AttractionAvailability {
  attractionId: string;
  available: boolean;
  remainingTickets?: number;
  estimatedQueueMinutes: number;
}

export type CheckAttractionAvailabilityOutput = AttractionAvailability;

// ─── Tool 5: check_restaurant_availability ───────────────

export interface CheckRestaurantAvailabilityInput {
  restaurantId: string;
  diningTime: string;
  partySize: number;
}

export interface RestaurantAvailability {
  restaurantId: string;
  available: boolean;
  hasTable: boolean;
  queueCount: number;
  estimatedWaitMinutes: number;
}

export type CheckRestaurantAvailabilityOutput = RestaurantAvailability;

// ─── Tool 6: generate_followup_questions ────────────────
// 🆕 根据解析结果生成追问

export interface GenerateFollowUpInput {
  constraints: import("./types.js").StructuredConstraints;
}

export type GenerateFollowUpOutput = FollowUpQuestion[];

// ─── Tool: estimate_transit ─────────────────────────────

export interface EstimateTransitInput {
  from: GeoLocation;
  to: GeoLocation;
  departureTime: string;
}

export type EstimateTransitOutput = import("./transit.js").TransitEstimate;
// ─── Agent 顶层输入 ─────────────────────────────────────

export interface AgentInput {
  rawText: string;
  group: Group;
  timeWindow: TimeWindow;
  distance: DistanceConstraint;
}


