import "dotenv/config";
// ============================================================
// eval/runner.ts — Harness Runner
// 喂场景用例 → 跑 Agent → 断言 → 输出评估报告
// 使用方式：npx tsx eval/runner.ts
// ============================================================

import { runFullPipeline } from "../src/planner/engine.js";
import { ALL_CASES, type EvalCase } from "./cases.js";
import { calcPlanMetrics, type EvalResult } from "./metrics.js";

async function runEvalCase(testCase: EvalCase): Promise<EvalResult> {
  const start = performance.now();

  try {
    // 运行完整规划流程
    const result = await runFullPipeline(testCase.rawText);

    const elapsed = Math.round(performance.now() - start);

    if (!result.success || !result.state.selectedPlan) {
      return {
        caseName: testCase.name,
        passed: false,
        planMetrics: null,
        errors: [...result.state.errors, result.message],
        durationMs: elapsed,
      };
    }

    const plan = result.state.selectedPlan;
    const metrics = calcPlanMetrics(plan);

    // 核心断言
    const checks: { rule: string; passed: boolean }[] = [];

    // 1. 可行性分
    checks.push({
      rule: `feasibilityScore >= ${testCase.minScore}`,
      passed: plan.feasibilityScore >= testCase.minScore,
    });

    // 2. 必须包含景点
    checks.push({
      rule: "has_attraction",
      passed: metrics.hasAttraction,
    });

    // 3. 必须包含餐厅
    checks.push({
      rule: "has_restaurant",
      passed: metrics.hasRestaurant,
    });

    // 4. 时长在预期内
    checks.push({
      rule: "duration_in_range",
      passed: plan.totalDurationHours >= 3 && plan.totalDurationHours <= 7,
    });

    const allPassed = checks.every((c) => c.passed);
    const errors = checks.filter((c) => !c.passed).map((c) => c.rule);

    return {
      caseName: testCase.name,
      passed: allPassed,
      planMetrics: metrics,
      errors,
      durationMs: elapsed,
    };
  } catch (err) {
    return {
      caseName: testCase.name,
      passed: false,
      planMetrics: null,
      errors: [err instanceof Error ? err.message : String(err)],
      durationMs: Math.round(performance.now() - start),
    };
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("  Harness Evaluation Runner");
  console.log("=".repeat(60));
  console.log();

  const results: EvalResult[] = [];

  for (const testCase of ALL_CASES) {
    console.log(`▶ 运行用例: ${testCase.name} — ${testCase.description}`);
    const result = await runEvalCase(testCase);
    results.push(result);

    const icon = result.passed ? "✓" : "✗";
    console.log(`  ${icon} ${result.caseName} (${result.durationMs}ms)`);

    if (result.planMetrics) {
      const m = result.planMetrics;
      console.log(`    方案: ${m.summary}`);
      console.log(`    时长: ${m.totalDurationHours}h | 通勤: ${m.transitMinutes}min | 活动: ${m.activityMinutes}min`);
      console.log(`    得分: ${m.feasibilityScore} | 拥堵: ${m.maxCongestion}`);
      if (result.planMetrics.activities) {
        for (const act of result.planMetrics.activities) {
          const icon = act.type === "attraction" ? "🎯" : act.type === "restaurant" ? "🍽️" : act.type === "break" ? "☕️" : "📦";
          console.log(`      ${icon} ${act.start}→${act.end}  ${act.name}  [${act.type}]`);
        }
      }
    }

    if (result.errors.length > 0) {
      console.log(`    错误: ${result.errors.join(", ")}`);
    }

    console.log();
  }

  // 汇总
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log("=".repeat(60));
  console.log(`  结果: ${passed}/${total} 通过`);
  console.log("=".repeat(60));

  // 退出码
  process.exit(passed === total ? 0 : 1);
}

main().catch((err) => {
  console.error("Evaluation failed:", err);
  process.exit(1);
});

