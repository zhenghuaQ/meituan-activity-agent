// ============================================================
// src/decision/score.ts — 多维加权评分引擎（M2 核心）
//
// 6 维度（时间/通勤/偏好/人群/预算/口碑）各自归一到 0-100，
// 按归一化权重加权求总分；同时给出每维度理由（可解释）与综合置信度。
// 评分过程会把拥挤度预测回填到 activity.crowd，供解释/看板使用。
// ============================================================

import type { Restaurant } from "../../spec/types.js";
import type {
  DimensionScore,
  PlanScore,
  ScoringInput,
} from "../../spec/decision.js";
import { ALL_DIMENSIONS, normalizeWeights } from "../../spec/decision.js";
import { timeToMinutes } from "../../spec/constraints.js";
import { predictCrowd } from "../data/crowd.js";
import { getDataSource } from "../data/index.js";
import type { CrowdPrediction } from "../../spec/datasource.js";

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/** 预算档对应的人均参考上限（元） */
const BUDGET_TARGET: Record<"low" | "medium" | "high", number> = {
  low: 120,
  medium: 280,
  high: 600,
};

interface DimResult {
  score: number;
  reason: string;
}

// ─── 各维度评分 ────────────────────────────────────────

function scoreTime(input: ScoringInput): DimResult {
  const acts = input.plan.activities;
  if (acts.length === 0) return { score: 0, reason: "无活动" };
  const span =
    timeToMinutes(acts[acts.length - 1].scheduledEnd) -
    timeToMinutes(acts[0].scheduledStart);
  const available = Math.max(1, input.constraints.timeWindow.durationHours * 60);
  const u = span / available;

  let score: number;
  if (u > 1) score = clamp(100 - (u - 1) * 150);
  else score = clamp(40 + (u / 0.85) * 60);

  return {
    score,
    reason: `行程占用窗口 ${Math.round(u * 100)}%（${(span / 60).toFixed(1)}/${input.constraints.timeWindow.durationHours}h）`,
  };
}

function scoreTransit(input: ScoringInput): DimResult {
  const total = input.plan.totalTransitMinutes;
  const score = clamp(100 - (total / 90) * 100);
  return { score, reason: `总通勤 ${total} 分钟` };
}

function scorePreference(input: ScoringInput): DimResult {
  const prefs = input.constraints.group.preferences;
  const restaurants = input.plan.activities
    .map((a) => a.place)
    .filter((p): p is Restaurant => p.type === "restaurant");

  let score = 60;
  const hits: string[] = [];

  for (const r of restaurants) {
    if (prefs.preferredCuisine?.some((c) => r.cuisine.includes(c) || c.includes(r.cuisine))) {
      score += 15;
      hits.push(`命中偏好菜系「${r.cuisine}」`);
    }
    if (prefs.dieting && r.tags.some((t) => ["轻食", "低卡", "健康餐", "少油盐", "清淡"].includes(t))) {
      score += 12;
      hits.push("满足轻食/减脂");
    }
    if (prefs.dietaryRestrictions.length > 0 && r.dietaryOptions) {
      score += 8;
      hits.push("支持忌口定制");
    }
  }

  const hasLocalFeature = input.plan.activities.some((a) => a.place.localFeatures.length > 0);
  if (hasLocalFeature) {
    score += 10;
    hits.push("含当地特色");
  }

  return {
    score: clamp(score),
    reason: hits.length > 0 ? hits.join("；") : "偏好匹配一般",
  };
}

function scoreCrowd(input: ScoringInput, crowds: CrowdPrediction[]): DimResult {
  if (crowds.length === 0) return { score: 70, reason: "无拥挤度数据" };
  const penalty: Record<string, number> = { low: 0, medium: 15, high: 35, packed: 55 };
  const avg =
    crowds.reduce((s, c) => s + (penalty[c.level] ?? 20), 0) / crowds.length;
  const worst = crowds.reduce((w, c) => (penalty[c.level] > penalty[w.level] ? c : w));
  return {
    score: clamp(100 - avg),
    reason: `平均客流${avg <= 10 ? "平稳" : avg <= 25 ? "适中" : "偏高"}，最挤：${worst.factors[0] ?? "常规"}`,
  };
}

function scoreBudget(input: ScoringInput): DimResult {
  const perPerson = input.plan.activities.reduce(
    (s, a) => s + (a.place.pricePerPerson ?? 0),
    0
  );
  const band = input.constraints.group.preferences.budget ?? "medium";
  const target = BUDGET_TARGET[band];
  const ratio = perPerson / target;

  let score: number;
  if (ratio <= 1) score = clamp(100 - ratio * 18); // 越省略好，但留 18 分弹性
  else score = clamp(100 - (ratio - 1) * 120);

  return {
    score,
    reason: `人均 ¥${Math.round(perPerson)} / ${band} 档参考 ¥${target}`,
  };
}

function scorePopularity(input: ScoringInput): DimResult {
  const places = input.plan.activities.map((a) => a.place);
  if (places.length === 0) return { score: 0, reason: "无地点" };
  const avg = places.reduce((s, p) => s + p.rating, 0) / places.length;
  const score = clamp(((avg - 3) / 2) * 100);
  return { score, reason: `平均口碑 ${avg.toFixed(1)} 分` };
}

// ─── 总评分 ────────────────────────────────────────────

/**
 * 对单个方案做多维评分。会把拥挤度预测回填到 plan.activities[i].crowd。
 */
export function scorePlan(input: ScoringInput): PlanScore {
  // 拥挤度预测（同时回填到 activity）
  const crowds: CrowdPrediction[] = input.plan.activities.map((a) => {
    const c = predictCrowd(a.place, {
      arrivalTime: a.scheduledStart,
      isWeekend: input.context.isWeekend,
    });
    a.crowd = c;
    return c;
  });

  const weights = normalizeWeights(input.weights);
  const raw: Record<string, DimResult> = {
    time: scoreTime(input),
    transit: scoreTransit(input),
    preference: scorePreference(input),
    crowd: scoreCrowd(input, crowds),
    budget: scoreBudget(input),
    popularity: scorePopularity(input),
  };

  const dimensions: DimensionScore[] = ALL_DIMENSIONS.map((d) => {
    const w = weights[d];
    const s = raw[d].score;
    return {
      dimension: d,
      score: Math.round(s),
      weight: Math.round(w * 1000) / 1000,
      weighted: Math.round(s * w * 10) / 10,
      reason: raw[d].reason,
    };
  });

  const total = Math.round(dimensions.reduce((sum, d) => sum + d.weighted, 0));

  // 置信度：数据源 + 拥挤度置信度 + 行程完整度
  const avgCrowdConf =
    crowds.length > 0 ? crowds.reduce((s, c) => s + c.confidence, 0) / crowds.length : 0.5;
  const usingAmap = getDataSource().name.includes("amap");
  const complete = input.plan.activities.every((a) => a.transitTo !== undefined);
  const confidence = Math.max(
    0,
    Math.min(1, 0.5 + 0.25 * avgCrowdConf + (usingAmap ? 0.15 : 0.05) + (complete ? 0.1 : 0))
  );

  return { total, dimensions, confidence: Math.round(confidence * 100) / 100 };
}
