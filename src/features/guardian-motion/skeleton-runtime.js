import {
  LANDMARK_KEYS, LANDMARK_STATES, SIDE_DEPENDENT_LANDMARKS, SKELETON_POLICY,
  SKELETON_SCHEMA_VERSION, clamp01, deepFreeze, observedValue, unknownValue
} from "./contracts.js";

export function createSkeletonRuntime({ policy = SKELETON_POLICY } = {}) {
  return Object.freeze({
    runtimeVersion: "guardian-skeleton-runtime-v1",
    buildFrame({ frame, estimate, petId, videoId, previousSideToken = null }) {
      const side = resolveAnatomicalSide(estimate.anatomicalSideEvidence, previousSideToken, frame.trackingContinuity);
      const landmarks = {};
      for (const key of LANDMARK_KEYS) {
        landmarks[key] = side.status !== "RESOLVED" && SIDE_DEPENDENT_LANDMARKS.includes(key)
          ? unknownLandmark("ANATOMICAL_SIDE_AMBIGUOUS")
          : validateLandmark(estimate.landmarks[key], policy);
      }
      const measurements = {
        bodyBoundingBox: validateBoundingBox(estimate.measurements.bodyBoundingBox, policy),
        bodyLength: validateMeasurement(estimate.measurements.bodyLength, "normalized", policy),
        bodyHeight: validateMeasurement(estimate.measurements.bodyHeight, "normalized", policy)
      };
      const observed = Object.values(landmarks).filter((landmark) => landmark.state === "OBSERVED");
      const coverage = observed.length / LANDMARK_KEYS.length;
      const bodyConfidence = observed.length ? mean(observed.map((landmark) => landmark.confidence)) : 0;
      const limbConfidence = Object.freeze(Object.fromEntries(["LEFT_FRONT", "RIGHT_FRONT", "LEFT_REAR", "RIGHT_REAR"].map((limb) => [limb, computeLimbConfidence(landmarks, limb)])));
      const result = {
        schemaVersion: SKELETON_SCHEMA_VERSION, frameIndex: frame.frameIndex, timestampMs: frame.timestampMs,
        durationMs: frame.durationMs, petId, videoId, landmarks: Object.freeze(landmarks), measurements: Object.freeze(measurements),
        anatomicalSide: side, trackingConfidence: clamp01(frame.trackingConfidence ?? bodyConfidence),
        trackingContinuity: clamp01(frame.trackingContinuity ?? 1), cameraMotionRisk: clamp01(frame.cameraMotionRisk ?? frame.cameraMotion ?? 0),
        visibility: coverage, occlusion: Object.values(landmarks).filter((landmark) => landmark.state === "OCCLUDED").length / LANDMARK_KEYS.length,
        confidence: Object.freeze({ perLandmark: Object.freeze(Object.fromEntries(LANDMARK_KEYS.map((key) => [key, landmarks[key].confidence]))), perLimb: limbConfidence, bodySkeleton: bodyConfidence, anatomicalSide: side.confidence }),
        status: coverage >= policy.minimumCompleteCoverage ? "COMPLETE" : coverage > 0 ? "PARTIAL" : "INSUFFICIENT_SKELETON"
      };
      return deepFreeze(result);
    }
  });
}

export function resolveAnatomicalSide(evidence = {}, previousToken = null, trackingContinuity = 1, policy = SKELETON_POLICY) {
  const confidence = clamp01(evidence.confidence ?? 0);
  const token = typeof evidence.identityToken === "string" ? evidence.identityToken : null;
  if (evidence.status !== "RESOLVED" || confidence < policy.minimumSideConfidence || !token) return Object.freeze({ status: "AMBIGUOUS", confidence, identityToken: null, reasonCode: "ANATOMICAL_SIDE_AMBIGUOUS" });
  if (previousToken && previousToken !== token && trackingContinuity >= 0.6) return Object.freeze({ status: "AMBIGUOUS", confidence: 0, identityToken: null, reasonCode: "ANATOMICAL_SIDE_IDENTITY_CHANGED" });
  return Object.freeze({ status: "RESOLVED", confidence, identityToken: token, reasonCode: null });
}

function validateLandmark(candidate, policy) {
  if (!candidate || !LANDMARK_STATES.includes(candidate.state)) return unknownLandmark("LANDMARK_UNAVAILABLE");
  const confidence = clamp01(candidate.confidence ?? 0);
  const visibility = clamp01(candidate.visibility ?? 0);
  if (candidate.state === "OBSERVED") {
    if (!validCoordinate(candidate.x) || !validCoordinate(candidate.y)) return unknownLandmark("LANDMARK_OUT_OF_RANGE");
    if (confidence < policy.minimumLandmarkConfidence || visibility < policy.minimumVisibility) return unknownLandmark("LANDMARK_CONFIDENCE_LOW");
    return Object.freeze({ state: "OBSERVED", x: candidate.x, y: candidate.y, confidence, visibility, occlusion: clamp01(candidate.occlusion ?? 0), reasonCode: null });
  }
  if (candidate.state === "ESTIMATED" && validCoordinate(candidate.x) && validCoordinate(candidate.y)) return Object.freeze({ state: "ESTIMATED", x: candidate.x, y: candidate.y, confidence, visibility, occlusion: clamp01(candidate.occlusion ?? 0), reasonCode: candidate.reasonCode ?? "SHORT_GAP_ESTIMATE" });
  return Object.freeze({ state: candidate.state, x: null, y: null, confidence: 0, visibility, occlusion: clamp01(candidate.occlusion ?? (candidate.state === "OCCLUDED" ? 1 : 0)), reasonCode: candidate.reasonCode ?? candidate.state });
}

function validateBoundingBox(box, policy) {
  if (!box || box.availability !== "OBSERVED" || !validCoordinate(box.x) || !validCoordinate(box.y) || !positive(box.width) || !positive(box.height) || box.x + box.width > 1 || box.y + box.height > 1 || (box.confidence ?? 0) < policy.minimumLandmarkConfidence) return unknownValue("BODY_BOUNDING_BOX_UNAVAILABLE", "normalized_box");
  return observedValue({ x: box.x, y: box.y, width: box.width, height: box.height }, "normalized_box", box.confidence);
}

function validateMeasurement(value, unit, policy) {
  if (!value || value.availability !== "OBSERVED" || !positive(value.value) || (value.confidence ?? 0) < policy.minimumLandmarkConfidence) return unknownValue("BODY_MEASUREMENT_UNAVAILABLE", unit);
  return observedValue(value.value, unit, value.confidence);
}

function unknownLandmark(reasonCode) { return Object.freeze({ state: "UNKNOWN", x: null, y: null, confidence: 0, visibility: 0, occlusion: 0, reasonCode }); }
function computeLimbConfidence(landmarks, limb) { const keys = Object.keys(landmarks).filter((key) => key.startsWith(limb)); const observed = keys.map((key) => landmarks[key]).filter((item) => item.state === "OBSERVED"); return observed.length === keys.length && keys.length ? Math.min(...observed.map((item) => item.confidence)) : 0; }
function validCoordinate(value) { return Number.isFinite(value) && value >= 0 && value <= 1; }
function positive(value) { return Number.isFinite(value) && value > 0; }
function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
