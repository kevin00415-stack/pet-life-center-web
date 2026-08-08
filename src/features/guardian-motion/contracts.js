export const SKELETON_SCHEMA_VERSION = "guardian-motion-skeleton-v2";
export const GEOMETRY_POLICY_VERSION = "guardian-motion-geometry-v2";
export const TEMPORAL_POLICY_VERSION = "guardian-motion-temporal-v1";
export const MOTION_CONTRACT_VERSION = "guardian-motion-contract-v1";
export const CANONICALIZATION_VERSION = "guardian-motion-canonical-v1";

export const LANDMARK_STATES = Object.freeze(["OBSERVED", "OCCLUDED", "OUT_OF_FRAME", "UNKNOWN", "ESTIMATED"]);
export const LANDMARK_KEYS = Object.freeze([
  "HEAD", "NOSE", "NECK",
  "LEFT_SHOULDER", "RIGHT_SHOULDER",
  "SPINE_FRONT", "SPINE_MID", "SPINE_REAR",
  "LEFT_HIP", "RIGHT_HIP",
  "LEFT_FRONT_ELBOW", "RIGHT_FRONT_ELBOW",
  "LEFT_FRONT_WRIST", "RIGHT_FRONT_WRIST",
  "LEFT_FRONT_PAW", "RIGHT_FRONT_PAW",
  "LEFT_REAR_KNEE", "RIGHT_REAR_KNEE",
  "LEFT_REAR_ANKLE", "RIGHT_REAR_ANKLE",
  "LEFT_REAR_PAW", "RIGHT_REAR_PAW",
  "TAIL_BASE", "TAIL_MID", "TAIL_TIP", "BODY_CENTER"
]);
export const SIDE_DEPENDENT_LANDMARKS = Object.freeze(LANDMARK_KEYS.filter((key) => key.startsWith("LEFT_") || key.startsWith("RIGHT_")));

export const SKELETON_POLICY = deepFreeze({
  version: "guardian-motion-skeleton-policy-v1",
  minimumLandmarkConfidence: 0.6,
  minimumVisibility: 0.5,
  minimumSideConfidence: 0.75,
  minimumCompleteCoverage: 0.6,
  maximumCameraMotionForTemporalDisplacement: 0.5
});

export function observedValue(value, unit, confidence, evidenceCoverage = 1) {
  if (!finiteValue(value)) throw new Error("OBSERVED_VALUE_INVALID");
  return Object.freeze({ availability: "OBSERVED", value: clone(value), unit, confidence: clamp01(confidence), reasonCode: null, evidenceCoverage: clamp01(evidenceCoverage) });
}

export function unknownValue(reasonCode, unit = null) {
  return Object.freeze({ availability: "UNKNOWN", value: null, unit, confidence: 0, reasonCode, evidenceCoverage: 0 });
}

export function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("NON_FINITE_CANONICAL_VALUE");
    return JSON.stringify(Object.is(value, -0) ? 0 : Math.round(value * 1e9) / 1e9);
  }
  return JSON.stringify(value);
}

export function deterministicChecksum(value) {
  const text = canonicalize(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function clamp01(value) { return Math.max(0, Math.min(1, value)); }
export function deepFreeze(value) { Object.freeze(value); for (const child of Object.values(value)) if (child && typeof child === "object" && !Object.isFrozen(child)) deepFreeze(child); return value; }
function finiteValue(value) { if (typeof value === "number") return Number.isFinite(value); if (!value || typeof value !== "object") return false; return Object.values(value).every(finiteValue); }
function clone(value) { return structuredClone(value); }
