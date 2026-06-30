import { useEffect, useRef, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { streamDecide } from "../api.js";
import {
  DimensionLabel,
  ObjectiveLabel,
  STAGE_ORDER,
  STAGE_LABEL,
} from "../constants.js";
import type {
  DoneEvent,
  PlanCandidate,
  PlanningStage,
  SegmentInfo,
  StageEvent,
} from "../types.js";

const EXAMPLES = [
  "带5岁娃和减肥老婆出去玩4-6小时",
  "陪爸妈逛逛，轻松点，半天时间",
  "二人世界，浪漫一点，预算充裕",
  "和朋友3人聚会，下午到晚上",
];

interface Props {
  segments: SegmentInfo[];
}

export default function DecisionPage({ segments }: Props) {
  const [text, setText] = useState(EXAMPLES[0]);
  const [segment, setSegment] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [activeStage, setActiveStage] = useState<PlanningStage | null>(null);
  const [doneStages, setDoneStages] = useState<Set<PlanningStage>>(new Set());
  const [stageMsg, setStageMsg] = useState<string>("");
  const [result, setResult] = useState<DoneEvent | null>(null);
  const [error, setError] = useState<string>("");
  const [selectedPareto, setSelectedPareto] = useState<number>(0);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => stopRef.current?.();
  }, []);

  function reset() {
    setActiveStage(null);
    setDoneStages(new Set());
    setStageMsg("");
    setResult(null);
    setError("");
    setSelectedPareto(0);
  }

  function run() {
    if (!text.trim() || running) return;
    reset();
    setRunning(true);

    const stop = streamDecide(
      {
        q: text.trim(),
        segment: (segment || undefined) as SegmentInfo["segment"] | undefined,
      },
      {
        onStage: (e: StageEvent) => {
          setActiveStage(e.stage);
          setStageMsg(e.message);
          setDoneStages((prev) => {
            const next = new Set(prev);
            const idx = STAGE_ORDER.indexOf(e.stage);
            for (let i = 0; i < idx; i++) next.add(STAGE_ORDER[i]);
            return next;
          });
        },
        onDone: (e: DoneEvent) => {
          setResult(e);
          setDoneStages(new Set(STAGE_ORDER as PlanningStage[]));
          setActiveStage(null);
          setRunning(false);
          if (!e.success) setError(e.message);
        },
        onError: (e) => {
          setError(e.message);
          setRunning(false);
          setActiveStage(null);
        },
      }
    );
    stopRef.current = stop;
  }

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setRunning(false);
    setActiveStage(null);
  }

  const decision = result?.decision;
  const selectedCandidate: PlanCandidate | undefined =
    decision?.pareto?.[selectedPareto] ?? decision?.recommended;

  return (
    <div className="decision-page">
      {/* 输入区 */}
      <div className="card decision-input-card">
        <div className="section-title">输入出行诉求</div>
        <div className="decision-input-row">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="例如：带5岁娃和减肥老婆出去玩4-6小时"
            disabled={running}
            onKeyDown={(e) => e.key === "Enter" && run()}
          />
          <select value={segment} onChange={(e) => setSegment(e.target.value)} disabled={running}>
            <option value="">默认分层</option>
            {segments.map((s) => (
              <option key={s.segment} value={s.segment}>
                {s.label}
              </option>
            ))}
          </select>
          {running ? (
            <button className="btn-secondary" onClick={stop}>
              中止
            </button>
          ) : (
            <button className="btn-primary" onClick={run} disabled={!text.trim()}>
              一键决策
            </button>
          )}
        </div>
        <div className="examples">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              className="example-chip"
              onClick={() => !running && setText(ex)}
              disabled={running}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* 阶段进度 */}
      {(running || doneStages.size > 0) && (
        <div className="card stage-progress">
          <div className="section-title">规划进度</div>
          <div className="stage-list">
            {STAGE_ORDER.map((stage) => {
              const isDone = doneStages.has(stage);
              const isActive = activeStage === stage;
              const cls = isActive ? "active" : isDone ? "done" : "";
              return (
                <div key={stage} className={`stage-item ${cls}`}>
                  <div className="stage-dot" />
                  <div className="stage-label">{STAGE_LABEL[stage]}</div>
                  {isActive && stageMsg && <div className="stage-msg">{stageMsg}</div>}
                </div>
              );
            })}
          </div>
          {error && <div className="error-text" style={{ marginTop: 8 }}>{error}</div>}
        </div>
      )}

      {/* 决策结果 */}
      {decision && selectedCandidate && (
        <>
          {/* 主方案 + 雷达图 */}
          <div className="card plan-card">
            <div className="plan-card-header">
              <div>
                <span className={`objective-badge objective-${selectedCandidate.objective}`}>
                  {ObjectiveLabel[selectedCandidate.objective]}
                </span>
                <span style={{ fontWeight: 600 }}>
                  {selectedCandidate.plan.summary || "推荐方案"}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="plan-score-total">
                  {selectedCandidate.score.total.toFixed(1)}
                </div>
                <div className="plan-confidence">
                  置信度 {(selectedCandidate.score.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* 时间线 */}
            <div className="timeline">
              {selectedCandidate.plan.activities.map((act, i) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-time">
                    {act.start} → {act.end}
                  </div>
                  <div className="timeline-body">
                    <div className="timeline-name">
                      {act.placeName}
                      <span className={`timeline-type type-${act.type}`}>
                        {act.type === "attraction" ? "景点" : act.type === "break" ? "茶歇" : "餐饮"}
                      </span>
                      {act.crowdLevel && (
                        <span className={`crowd-${act.crowdLevel}`} style={{ marginLeft: 8, fontSize: 12 }}>
                          {act.crowdLevel === "low" ? "空闲" : act.crowdLevel === "medium" ? "适中" : "拥挤"}
                        </span>
                      )}
                    </div>
                    {act.address && (
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        {act.address}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 可解释 */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>为什么推荐这个方案</div>
              {selectedCandidate.explanation.highlights.length > 0 && (
                <div style={{ fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>亮点：</span>
                  {selectedCandidate.explanation.highlights.join("；")}
                </div>
              )}
              {selectedCandidate.explanation.tradeoffs.length > 0 && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: "var(--warn)", fontWeight: 600 }}>取舍：</span>
                  {selectedCandidate.explanation.tradeoffs.join("；")}
                </div>
              )}
            </div>
          </div>

          {/* 雷达图 */}
          <div className="card">
            <div className="section-title">多维评分（6 维）</div>
            <div className="radar-container">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={selectedCandidate.score.dimensions.map((d) => ({
                    dimension: DimensionLabel[d.dimension],
                    score: Math.round(d.score),
                    weight: Math.round(d.weight * 100),
                  }))}
                >
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="评分"
                    dataKey="score"
                    stroke="#f0a500"
                    fill="#ffc300"
                    fillOpacity={0.5}
                  />
                  <Tooltip
                    formatter={(v: number, n: string) => [v, n === "score" ? "评分" : "权重%"]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 帕累托对比 */}
          {decision.pareto.length > 1 && (
            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <div className="section-title">帕累托多方案对比（点击切换）</div>
              <div className="pareto-grid">
                {decision.pareto.map((c, i) => (
                  <div
                    key={c.id}
                    className={`pareto-card ${i === selectedPareto ? "selected" : ""}`}
                    onClick={() => setSelectedPareto(i)}
                  >
                    <div className="pareto-header">
                      <span className={`objective-badge objective-${c.objective}`}>
                        {ObjectiveLabel[c.objective]}
                      </span>
                      <span className="pareto-score">{c.score.total.toFixed(1)}</span>
                    </div>
                    <div style={{ fontSize: 13 }}>
                      通勤 {c.plan.totalTransitMinutes}min · 总时长 {c.plan.totalDurationMinutes}min
                    </div>
                    <div className="pareto-places">
                      {c.plan.activities.map((a) => a.placeName).join(" → ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 备注 */}
          {result?.notes && result.notes.length > 0 && (
            <div className="notes-list" style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>规划说明</div>
              <ul>
                {result.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
