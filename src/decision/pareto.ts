// ============================================================
// src/decision/pareto.ts — 帕累托多目标方案输出（M2）
//
// 同一候选池，按不同决策目标各取最优，产出 2-4 个互补方案：
//   balanced（均衡）/ time_saver（省时）/ budget_saver（省钱）/ experience（体验）
// 首推为 balanced，并为其生成「为何不选其它」的对比解释。
// ============================================================

import type { PlanCandidate } from "../../spec/types.js";
import type {
  DecisionResult,
  PlanObjective,
  ScoreDimension,
} from "../../spec/decision.js";
import { ObjectiveLabel } from "../../spec/decision.js";
import { explainPlan, compareAgainst } from "./explain.js";

function dimScore(c: PlanCandidate, d: ScoreDimension): number {
  return c.plan.score?.dimensions.find((x) => x.dimension === d)?.score ?? 0;
}

/** 各目标的打分函数（越大越优） */
const OBJECTIVE_SCORERS: Record<PlanObjective, (c: PlanCandidate) => number> = {
  balanced: (c) => c.plan.score?.total ?? 0,
  time_saver: (c) => dimScore(c, "transit") * 0.6 + dimScore(c, "time") * 0.4,
  budget_saver: (c) => dimScore(c, "budget"),
  experience: (c) => dimScore(c, "preference") * 0.55 + dimScore(c, "popularity") * 0.45,
};

function pickBest(
  cands: PlanCandidate[],
  scorer: (c: PlanCandidate) => number
): PlanCandidate | null {
  if (cands.length === 0) return null;
  return cands.reduce((best, c) => (scorer(c) > scorer(best) ? c : best));
}

/**
 * 从已评分的候选生成帕累托方案集。
 * 要求每个候选的 plan.score 已由 scorePlan 填好。
 */
export function buildPareto(
  scored: PlanCandidate[],
  notes: string[] = []
): DecisionResult | null {
  if (scored.length === 0) return null;

  // 目标优先级：balanced 必在，其余去重补充
  const order: PlanObjective[] = ["balanced", "experience", "time_saver", "budget_saver"];
  const chosen: PlanCandidate[] = [];
  const seen = new Set<string>();

  for (const obj of order) {
    const winner = pickBest(scored, OBJECTIVE_SCORERS[obj]);
    if (!winner) continue;
    if (seen.has(winner.plan.id)) continue;
    seen.add(winner.plan.id);
    winner.objective = obj;
    winner.plan.explanation = explainPlan(winner.plan.score!);
    chosen.push(winner);
  }

  const recommended = chosen[0];

  // 为首推补充「为何不选其它」
  const others = chosen.slice(1).map((c) => ({
    plan: c.plan,
    label: ObjectiveLabel[c.objective ?? "balanced"],
  }));
  if (recommended.plan.explanation) {
    recommended.plan.explanation.whyNotOthers = compareAgainst(recommended.plan, others);
  }

  return {
    recommended,
    pareto: chosen,
    confidence: recommended.plan.score?.confidence ?? 0.5,
    notes,
  };
}
