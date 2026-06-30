// ============================================================
// src/decision/explain.ts — 决策可解释模块（M2）
//
// 把多维得分翻译成人话：亮点（高分维度）+ 取舍（低分维度），
// 以及「为何不选其它候选」（多方案对比时由 pareto 注入）。
// ============================================================

import type { Plan } from "../../spec/types.js";
import type { PlanExplanation, PlanScore } from "../../spec/decision.js";
import { DimensionLabel } from "../../spec/decision.js";

const HIGH = 72;
const LOW = 52;

/** 由单方案得分生成亮点/取舍 */
export function explainPlan(score: PlanScore): PlanExplanation {
  const sorted = [...score.dimensions].sort((a, b) => b.score - a.score);

  const highlights = sorted
    .filter((d) => d.score >= HIGH)
    .slice(0, 3)
    .map((d) => `${DimensionLabel[d.dimension]}强：${d.reason}`);

  const tradeoffs = sorted
    .filter((d) => d.score <= LOW)
    .slice(-2)
    .map((d) => `${DimensionLabel[d.dimension]}偏弱：${d.reason}`);

  if (highlights.length === 0) {
    highlights.push(`综合表现均衡（总分 ${score.total}）`);
  }

  return { highlights, tradeoffs };
}

/**
 * 生成「为何首推它，而非其它方案」的对比说明。
 * 对每个对比方案，找出其相对首推的最大优势维度与最大劣势维度。
 */
export function compareAgainst(
  recommended: Plan,
  others: Array<{ plan: Plan; label: string }>
): string[] {
  const recScore = recommended.score;
  if (!recScore) return [];
  const out: string[] = [];

  for (const o of others) {
    const oScore = o.plan.score;
    if (!oScore) continue;
    let bestGain = { dim: "", delta: 0 };
    let worstLoss = { dim: "", delta: 0 };
    for (const d of oScore.dimensions) {
      const rec = recScore.dimensions.find((x) => x.dimension === d.dimension);
      if (!rec) continue;
      const delta = d.score - rec.score;
      if (delta > bestGain.delta) bestGain = { dim: DimensionLabel[d.dimension], delta };
      if (delta < worstLoss.delta) worstLoss = { dim: DimensionLabel[d.dimension], delta };
    }
    const gain = bestGain.dim ? `${bestGain.dim}+${bestGain.delta}` : "无明显优势";
    const loss = worstLoss.dim ? `${worstLoss.dim}${worstLoss.delta}` : "";
    out.push(`「${o.label}」${gain}${loss ? `，但${loss}` : ""}，综合不及首推`);
  }
  return out;
}
