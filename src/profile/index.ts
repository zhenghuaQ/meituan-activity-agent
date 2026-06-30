// ============================================================
// src/profile/index.ts — 画像模块出口
// ============================================================

export {
  SEGMENT_PROFILES,
  getSegmentProfile,
  ALL_SEGMENTS,
} from "./segments.js";

export {
  resolveWeights,
  inferSegment,
  applyProfileToConstraints,
  createProfile,
  touchProfileStats,
} from "./profile.js";

export { ProfileStore, getProfileStore, resetProfileStore } from "./store.js";
