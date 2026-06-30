// ============================================================
// web/src/constants.ts — 前端常量（与 spec/ 对齐）
// ============================================================

import type { PlanObjective, PlanningStage, ScoreDimension } from "./types.js";

export const DimensionLabel: Record<ScoreDimension, string> = {
  time: "时间契合",
  transit: "通勤效率",
  preference: "偏好契合",
  crowd: "人群适配",
  budget: "预算契合",
  popularity: "口碑热度",
};

export const ObjectiveLabel: Record<PlanObjective, string> = {
  balanced: "均衡推荐",
  time_saver: "省时之选",
  budget_saver: "经济之选",
  experience: "体验之选",
};

export const STAGE_ORDER: PlanningStage[] = [
  "intent_parsing",
  "follow_up_questions",
  "candidate_generation",
  "feasibility_check",
  "fine_scheduling",
];

export const STAGE_LABEL: Record<PlanningStage, string> = {
  intent_parsing: "Stage 1 · 意图解析",
  follow_up_questions: "Stage 2 · 追问确认",
  candidate_generation: "Stage 3 · 候选生成",
  feasibility_check: "Stage 4 · 可行性校验",
  fine_scheduling: "Stage 5 · 精细编排",
};

// SegmentLabel 在 SegmentInfo 来自后端时已有 label 字段，这里仅作 fallback
export const SegmentLabelFallback: Record<string, string> = {
  balanced: "均衡型",
  family_first: "亲子优先",
  comfort_senior: "舒适陪老",
  quality_seeker: "品质体验党",
  budget_conscious: "精打细算",
  explorer: "尝鲜打卡",
  efficiency: "高效省时",
};
