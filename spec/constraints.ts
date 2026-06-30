// ============================================================
// spec/constraints.ts — 约束与验证规则 v2
// ============================================================

import type { AgeGroup, Activity, Plan, PlanCandidate } from "./types.js";
import { transitScorePenalty, checkTransitFeasible } from "./transit.js";

// ─── 约束检查结果 ──────────────────────────────────────

export interface ConstraintCheck {
  passed: boolean;
  rule: string;
  detail: string;
}

// ─── 时间检查 ──────────────────────────────────────────

export function checkTimeConflict(a: Activity, b: Activity): ConstraintCheck {
  const aEnd = timeToMinutes(a.scheduledEnd);
  const bStart = timeToMinutes(b.scheduledStart);
  const passed = aEnd <= bStart;
  return {
    passed,
    rule: "no_time_conflict",
    detail: passed
      ? `"${a.place.name}"结束(${a.scheduledEnd}) <= "${b.place.name}"开始(${b.scheduledStart})`
      : `"${a.place.name}"与"${b.place.name}"时间冲突(${a.scheduledEnd} > ${b.scheduledStart})`,
  };
}

// ─── 距离检查 ──────────────────────────────────────────

export function checkDistance(
  placeName: string,
  distanceKm: number,
  maxKm: number
): ConstraintCheck {
  const passed = distanceKm <= maxKm;
  return {
    passed,
    rule: "within_distance",
    detail: `${placeName} ${distanceKm}km ${passed ? "✓" : "✗超出" + maxKm + "km限制"}`,
  };
}

// ─── 年龄-餐饮匹配检查 ─────────────────────────────────

export function checkAgeDietaryFit(
  placeName: string,
  placeTags: string[],
  ageGroup: AgeGroup
): ConstraintCheck {
  const issues: string[] = [];

  if (ageGroup.seniors > 0) {
    const elderlyOk = placeTags.some(t =>
      ["少油盐", "清淡", "老年餐", "软食"].includes(t)
    );
    if (!elderlyOk) issues.push("缺老年友好标签");
  }

  if (ageGroup.youngChildren > 0) {
    const kidsOk = placeTags.some(t =>
      ["儿童友好", "亲子", "kids"].includes(t)
    );
    if (!kidsOk) issues.push("缺儿童友好标签");
  }

  const passed = issues.length === 0;
  return {
    passed,
    rule: "age_dietary_fit",
    detail: passed ? `${placeName} ✓` : `${placeName}: ${issues.join("，")}`,
  };
}

// ─── 方案完整性检查 ──────────────────────────────────────

export function checkPlanCompleteness(plan: Plan): ConstraintCheck[] {
  const types = plan.activities.map(a => a.place.type);
  const results: ConstraintCheck[] = [];

  if (!types.includes("attraction") && !types.includes("walking")) {
    results.push({ passed: false, rule: "has_attraction", detail: "方案缺少游玩/景点环节" });
  }
  if (!types.includes("restaurant")) {
    results.push({ passed: false, rule: "has_restaurant", detail: "方案缺少用餐环节" });
  }
  if (plan.leadRole === "elderly" || plan.leadRole === "mixed_family") {
    if (!types.includes("break")) {
      results.push({ passed: false, rule: "has_break_for_elderly", detail: "有老年人但缺少茶歇休息环节" });
    }
  }

  return results;
}

// ─── 可行性总评分 (0-100) ─────────────────────────────

export function calcFeasibilityScore(plan: Plan): number {
  let score = 100;

  // 1. 时间冲突扣分
  for (let i = 0; i < plan.activities.length - 1; i++) {
    if (!checkTimeConflict(plan.activities[i], plan.activities[i + 1]).passed) {
      score -= 30;
    }
  }

  // 2. 方案完整性扣分
  for (const c of checkPlanCompleteness(plan)) {
    if (!c.passed) score -= 20;
  }

  // 3. 🆕 通勤耗时惩罚（逐段累加）
  let totalTransitPenalty = 0;
  for (const act of plan.activities) {
    if (act.transitTo) {
      totalTransitPenalty += transitScorePenalty(act.transitTo.totalMinutes);
      // 通勤不可行直接 -40
      if (act.transitTo.totalMinutes > 90) {
        score -= 40;
      }
      // 检查通勤合理性和可行性
      const available = timeToMinutes(act.scheduledStart) - timeToMinutes(
        plan.activities[act.order - 2]?.scheduledEnd ?? "00:00"
      );
      if (available > 0) {
        if (!checkTransitFeasible(act.transitTo, available).passed) {
          score -= 30;
        }
      }
    }
  }
  score -= totalTransitPenalty;

  return Math.max(0, Math.min(100, score));
}

// ─── 排序与选择 ────────────────────────────────────────

export function rankCandidates(candidates: PlanCandidate[]): PlanCandidate[] {
  return [...candidates].sort((a, b) => b.feasibilityScore - a.feasibilityScore);
}

export function selectBestPlan(candidates: PlanCandidate[]): PlanCandidate | null {
  const ranked = rankCandidates(candidates);
  if (ranked.length === 0) return null;
  return ranked[0].feasibilityScore > 60 ? ranked[0] : null;
}

// ─── 工具函数 ──────────────────────────────────────────

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeDiff(a: string, b: string): number {
  return timeToMinutes(b) - timeToMinutes(a);
}

export function totalDuration(start: string, end: string): number {
  return timeDiff(start, end) / 60;
}
