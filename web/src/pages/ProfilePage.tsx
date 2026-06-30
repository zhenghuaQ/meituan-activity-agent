import { useCallback, useEffect, useState } from "react";
import {
  createProfile as apiCreateProfile,
  deleteProfile as apiDeleteProfile,
  listProfiles,
  listSegments,
} from "../api.js";
import type { SegmentInfo, UserProfile } from "../types.js";

export default function ProfilePage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [segments, setSegments] = useState<SegmentInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [error, setError] = useState("");
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newSegment, setNewSegment] = useState<string>("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [ps, ss] = await Promise.all([listProfiles(), listSegments()]);
      setProfiles(ps);
      setSegments(ss);
      // 仅在未选中时默认选第一个，避免依赖 selectedId 导致重复拉取
      setSelectedId((cur) => cur || (ps.length > 0 ? ps[0].id : ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function create() {
    if (!newId.trim()) {
      setError("请填写画像 ID");
      return;
    }
    setError("");
    try {
      const seg = newSegment || segments[0]?.segment;
      const p = await apiCreateProfile({
        id: newId.trim(),
        name: newName.trim() || undefined,
        segment: seg as SegmentInfo["segment"],
      });
      setProfiles((prev) => [p, ...prev.filter((x) => x.id !== p.id)]);
      setSelectedId(p.id);
      setNewId("");
      setNewName("");
      setNewSegment("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function remove(id: string) {
    if (!confirm(`确认删除画像 ${id}？`)) return;
    setError("");
    try {
      await apiDeleteProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) setSelectedId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const selected = profiles.find((p) => p.id === selectedId);

  return (
    <div>
      <div className="section-title">用户画像管理</div>
      {error && <div className="error-text" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="profile-layout">
        {/* 左侧：画像列表 + 新建 */}
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>新建画像</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                type="text"
                placeholder="画像 ID（如 user_001）"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
              />
              <input
                type="text"
                placeholder="名称（可选）"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <select value={newSegment} onChange={(e) => setNewSegment(e.target.value)}>
                <option value="">选择分层</option>
                {segments.map((s) => (
                  <option key={s.segment} value={s.segment}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button className="btn-primary" onClick={create}>
                创建
              </button>
            </div>
          </div>

          <div className="profile-list">
            {profiles.length === 0 && (
              <div className="empty-state" style={{ padding: 20 }}>暂无画像</div>
            )}
            {profiles.map((p) => (
              <div
                key={p.id}
                className={`profile-item ${p.id === selectedId ? "selected" : ""}`}
                onClick={() => setSelectedId(p.id)}
              >
                <div className="profile-name">{p.name || p.id}</div>
                <div className="profile-meta">
                  {segments.find((s) => s.segment === p.segment)?.label || p.segment} · 决策 {p.stats.decisionCount} 次
                </div>
                <button
                  className="btn-danger"
                  style={{ marginTop: 6, fontSize: 11, padding: "2px 8px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(p.id);
                  }}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧：详情 */}
        <div>
          {selected ? (
            <div className="card">
              <div className="row-between" style={{ marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.name || selected.id}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>ID: {selected.id}</div>
                </div>
                <span className={`objective-badge objective-balanced`}>
                  {segments.find((s) => s.segment === selected.segment)?.label || selected.segment}
                </span>
              </div>

              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                <div>
                  <strong>累计决策：</strong>
                  {selected.stats.decisionCount} 次
                </div>
                <div>
                  <strong>最近活跃：</strong>
                  {selected.stats.lastActiveAt
                    ? new Date(selected.stats.lastActiveAt).toLocaleString()
                    : "—"}
                </div>
                <div>
                  <strong>创建时间：</strong>
                  {new Date(selected.createdAt).toLocaleString()}
                </div>

                {selected.override.budget && (
                  <div>
                    <strong>预算：</strong>
                    {selected.override.budget === "low" ? "经济" : selected.override.budget === "medium" ? "中等" : "充裕"}
                  </div>
                )}
                {selected.override.maxDistanceKm && (
                  <div>
                    <strong>最大距离：</strong>
                    {selected.override.maxDistanceKm} km
                  </div>
                )}
                {selected.override.dietaryRestrictions && selected.override.dietaryRestrictions.length > 0 && (
                  <div>
                    <strong>忌口：</strong>
                    {selected.override.dietaryRestrictions.join("、")}
                  </div>
                )}
                {selected.override.preferredCuisine && selected.override.preferredCuisine.length > 0 && (
                  <div>
                    <strong>偏好菜系：</strong>
                    {selected.override.preferredCuisine.join("、")}
                  </div>
                )}
              </div>

              {selected.override.weights && Object.keys(selected.override.weights).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>自定义权重覆盖</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
                    {Object.entries(selected.override.weights).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--muted)" }}>{k}</span>
                        <span>{((v as number) * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card empty-state">
              选择左侧画像查看详情，或新建一个画像
            </div>
          )}

          {/* 分层说明 */}
          {segments.length > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="section-title">分层说明</div>
              <div className="segment-grid">
                {segments.map((s) => (
                  <div key={s.segment} className="segment-card">
                    <div className="segment-label">{s.label}</div>
                    <div className="segment-desc">{s.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
