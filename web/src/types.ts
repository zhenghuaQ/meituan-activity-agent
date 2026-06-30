// ============================================================
// web/src/types.ts — 前端类型定义（与 spec/ 对齐，仅保留 UI 所需）
//
// 注：前端独立 tsconfig，不直接 import 后端 spec/，
//     手动同步核心类型避免跨项目依赖。
// ============================================================

// ─── 决策契约（spec/decision.ts） ─────────────────────

export type ScoreDimension =
  | "time"
  | "transit"
  | "preference"
  | "crowd"
  | "budget"
  | "popularity";

export type PlanObjective =
  | "balanced"
  | "time_saver"
  | "budget_saver"
  | "experience";

export interface DimensionScore {
  dimension: ScoreDimension;
  score: number;
  weight: number;
  weighted: number;
  reason: string;
}

export interface PlanScore {
  total: number;
  dimensions: DimensionScore[];
  confidence: number;
}

export interface PlanExplanation {
  highlights: string[];
  tradeoffs: string[];
  whyNotOthers?: string[];
}

export interface PlanCandidate {
  id: string;
  objective: PlanObjective;
  plan: Plan;
  score: PlanScore;
  explanation: PlanExplanation;
}

export interface DecisionResult {
  recommended: PlanCandidate;
  pareto: PlanCandidate[];
  confidence: number;
  notes: string[];
}

export type WeatherCondition = "clear" | "rain" | "snow" | "hot" | "cold" | "unknown";

// ─── 画像契约（spec/profile.ts） ─────────────────────

export type UserSegment =
  | "balanced"
  | "family_first"
  | "comfort_senior"
  | "quality_seeker"
  | "budget_conscious"
  | "explorer"
  | "efficiency";

export interface UserProfile {
  id: string;
  name?: string;
  segment: UserSegment;
  override: UserPreferenceOverride;
  stats: ProfileStats;
  createdAt: number;
  updatedAt: number;
}

export interface UserPreferenceOverride {
  weights?: Partial<Record<ScoreDimension, number>>;
  budget?: "low" | "medium" | "high";
  maxDistanceKm?: number;
  dietaryRestrictions?: string[];
  preferredCuisine?: string[];
}

export interface ProfileStats {
  decisionCount: number;
  lastActiveAt: number;
}

export interface SegmentInfo {
  segment: UserSegment;
  label: string;
  description: string;
}

// ─── Plan/Activity（spec/types.ts 精简） ─────────────

export type ActivityType = "attraction" | "break" | "meal";

export interface Activity {
  order: number;
  type: ActivityType;
  placeId: string;
  placeName: string;
  start: string;
  end: string;
  address?: string;
  notes?: string[];
  crowdLevel?: "low" | "medium" | "high";
}

export interface Plan {
  id: string;
  activities: Activity[];
  totalDurationMinutes: number;
  totalTransitMinutes: number;
  totalCostRange?: { min: number; max: number };
  summary?: string;
}

// ─── SSE 事件（planner/engine.ts StageEvent） ─────────

export type PlanningStage =
  | "intent_parsing"
  | "follow_up_questions"
  | "candidate_generation"
  | "feasibility_check"
  | "fine_scheduling";

export interface StageEvent {
  stage: PlanningStage;
  message: string;
  ts?: number;
}

export interface DoneEvent {
  success: boolean;
  message: string;
  decision?: DecisionResult;
  selectedPlan?: Plan;
  notes: string[];
}

export interface ErrorEvent {
  message: string;
}

// ─── 指标（server/metrics.ts snapshot） ──────────────

export interface MetricsSnapshot {
  uptimeMs: number;
  requests: number;
  errors: number;
  decisions: number;
  degraded: number;
  rateLimited: number;
  latency: { avgMs: number; p95Ms: number; samples: number };
  routes: Record<string, { count: number; errors: number; avgMs: number }>;
}

// ─── 运行时降级开关（server/flags.ts） ───────────────

export interface RuntimeFlags {
  rateLimit: boolean;
  forceMockIntent: boolean;
  cache: boolean;
}

// ─── 决策请求体（server/app.ts DecideBody） ──────────

export interface DecideRequest {
  text: string;
  segment?: UserSegment;
  profileId?: string;
  autoSegment?: boolean;
  weather?: WeatherCondition;
}

// ─── 健康检查（server/app.ts /health） ──────────────

export interface HealthInfo {
  status: string;
  version: string;
  env: string;
  flags: unknown;
  runtime: RuntimeFlags;
  uptimeMs: number;
}
