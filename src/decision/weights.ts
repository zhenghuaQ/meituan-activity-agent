// ============================================================
// src/decision/weights.ts — 权重归一化与群体判断
//
// 从 spec/decision.ts 迁出，保持 spec 层只有类型和常量。
// ============================================================

import type { Group } from "../../spec/types.js";
import type { ScoringWeights } from "../../spec/decision.js";
import { ALL_DIMENSIONS, DEFAULT_WEIGHTS } from "../../spec/decision.js";

export function emptyWeights(): ScoringWeights {
  return { time: 0, transit: 0, preference: 0, crowd: 0, budget: 0, popularity: 0 };
}

/** 把任意权重归一化为和为 1（全 0 时回退默认） */
export function normalizeWeights(w: ScoringWeights): ScoringWeights {
  const sum = ALL_DIMENSIONS.reduce((s, d) => s + Math.max(0, w[d]), 0);
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };
  const out = emptyWeights();
  for (const d of ALL_DIMENSIONS) out[d] = Math.max(0, w[d]) / sum;
  return out;
}

/** 群体便捷判断：是否含敏感人群（老人/幼儿） */
export function hasVulnerable(group: Group): boolean {
  return group.ageGroup.seniors > 0 || group.ageGroup.youngChildren > 0;
}
