import { LANDMARK_KEYS, SKELETON_POLICY, TEMPORAL_POLICY_VERSION, deepFreeze, observedValue, unknownValue } from "./contracts.js";

export function computeTemporalStability(skeletonFrames, geometryFrames) {
  if (!skeletonFrames.length) return deepFreeze({ policyVersion: TEMPORAL_POLICY_VERSION, status: "INSUFFICIENT_TEMPORAL_EVIDENCE", confidence: 0 });
  assertMonotonicTimestamps(skeletonFrames);
  const cameraMotionRisk = mean(skeletonFrames.map((frame) => frame.cameraMotionRisk));
  const landmarkJitter = {};
  const frameToFrameDisplacement = {};
  for (const key of LANDMARK_KEYS) {
    const observations = skeletonFrames.map((frame) => frame.landmarks[key]).filter(isObserved);
    landmarkJitter[key] = observations.length >= 2 ? jitter(observations) : unknownValue("INSUFFICIENT_LANDMARK_SEQUENCE", "normalized_distance");
    frameToFrameDisplacement[key] = cameraMotionRisk >= SKELETON_POLICY.maximumCameraMotionForTemporalDisplacement
      ? unknownValue("CAMERA_MOTION_RISK", "normalized_per_second")
      : displacement(skeletonFrames, key);
  }
  const sideFrames = skeletonFrames.filter((frame) => frame.anatomicalSide.status === "RESOLVED");
  const sideConsistency = sideFrames.length
    ? observedValue(sideFrames.length / skeletonFrames.length, "ratio", Math.min(...sideFrames.map((frame) => frame.anatomicalSide.confidence)))
    : unknownValue("ANATOMICAL_SIDE_AMBIGUOUS", "ratio");
  const trackingContinuity = observedValue(mean(skeletonFrames.map((frame) => frame.trackingContinuity)), "ratio", mean(skeletonFrames.map((frame) => frame.trackingConfidence)));
  const occlusionRecovery = observedValue(countOcclusionRecoveries(skeletonFrames), "count", mean(skeletonFrames.map((frame) => frame.trackingConfidence)));
  const jointAngleContinuity = summarizeGeometryContinuity(geometryFrames, "jointAngles", "radian_change");
  const tailLandmarkContinuity = coverageForKeys(skeletonFrames, ["TAIL_BASE", "TAIL_MID", "TAIL_TIP"]);
  const bodyAxisContinuity = bodyAxisChange(geometryFrames);
  const observedTemporal = [sideConsistency, trackingContinuity, occlusionRecovery, tailLandmarkContinuity, bodyAxisContinuity, ...Object.values(jointAngleContinuity)].filter((value) => value.availability === "OBSERVED");
  return deepFreeze({
    policyVersion: TEMPORAL_POLICY_VERSION,
    startTimestampMs: skeletonFrames[0].timestampMs,
    endTimestampMs: skeletonFrames.at(-1).timestampMs,
    landmarkJitter: Object.freeze(landmarkJitter), frameToFrameDisplacement: Object.freeze(frameToFrameDisplacement),
    sideConsistency, occlusionRecovery, trackingContinuity, jointAngleContinuity: Object.freeze(jointAngleContinuity),
    tailLandmarkContinuity, bodyAxisContinuity, cameraMotionRisk,
    confidence: observedTemporal.length ? Math.min(...observedTemporal.map((value) => value.confidence)) : 0,
    status: observedTemporal.length ? "COMPLETE_OR_PARTIAL" : "INSUFFICIENT_TEMPORAL_EVIDENCE"
  });
}

function jitter(points) {
  const center = { x: median(points.map((point) => point.x)), y: median(points.map((point) => point.y)) };
  return observedValue(median(points.map((point) => distance(point, center))), "normalized_distance", Math.min(...points.map((point) => point.confidence)));
}

function displacement(frames, key) {
  const values = [];
  const confidences = [];
  for (let index = 1; index < frames.length; index += 1) {
    const previous = frames[index - 1];
    const current = frames[index];
    const a = previous.landmarks[key];
    const b = current.landmarks[key];
    const seconds = (current.timestampMs - previous.timestampMs) / 1000;
    if (!isObserved(a) || !isObserved(b) || seconds <= 0) continue;
    values.push(distance(a, b) / seconds);
    confidences.push(Math.min(a.confidence, b.confidence));
  }
  return values.length ? observedValue(median(values), "normalized_per_second", Math.min(...confidences), values.length / Math.max(1, frames.length - 1)) : unknownValue("INSUFFICIENT_ADJACENT_LANDMARKS", "normalized_per_second");
}

function summarizeGeometryContinuity(frames, property, unit) {
  const keys = frames.length ? Object.keys(frames[0][property]) : [];
  return Object.fromEntries(keys.map((key) => {
    const differences = [];
    const confidences = [];
    for (let index = 1; index < frames.length; index += 1) {
      const a = frames[index - 1][property][key];
      const b = frames[index][property][key];
      if (a.availability !== "OBSERVED" || b.availability !== "OBSERVED") continue;
      differences.push(Math.abs(b.value - a.value));
      confidences.push(Math.min(a.confidence, b.confidence));
    }
    return [key, differences.length ? observedValue(median(differences), unit, Math.min(...confidences), differences.length / Math.max(1, frames.length - 1)) : unknownValue("INSUFFICIENT_JOINT_SEQUENCE", unit)];
  }));
}

function bodyAxisChange(frames) {
  const values = [];
  const confidences = [];
  for (let index = 1; index < frames.length; index += 1) {
    const a = frames[index - 1].bodyAxis;
    const b = frames[index].bodyAxis;
    if (a.availability !== "OBSERVED" || b.availability !== "OBSERVED") continue;
    values.push(Math.abs(wrappedAngleDifference(b.value.angle, a.value.angle)));
    confidences.push(Math.min(a.confidence, b.confidence));
  }
  return values.length ? observedValue(median(values), "radian_change", Math.min(...confidences), values.length / Math.max(1, frames.length - 1)) : unknownValue("INSUFFICIENT_BODY_AXIS_SEQUENCE", "radian_change");
}

function coverageForKeys(frames, keys) {
  const opportunities = frames.length * keys.length;
  const observed = frames.flatMap((frame) => keys.map((key) => frame.landmarks[key])).filter(isObserved);
  if (!opportunities) return unknownValue("NO_TEMPORAL_OPPORTUNITY", "ratio");
  if (!observed.length) return unknownValue("TAIL_LANDMARKS_NOT_OBSERVED", "ratio");
  return observedValue(observed.length / opportunities, "ratio", Math.min(...observed.map((point) => point.confidence)));
}

function countOcclusionRecoveries(frames) {
  let count = 0;
  for (const key of LANDMARK_KEYS) for (let index = 1; index < frames.length; index += 1) if (frames[index - 1].landmarks[key].state === "OCCLUDED" && frames[index].landmarks[key].state === "OBSERVED") count += 1;
  return count;
}

function assertMonotonicTimestamps(frames) { for (let index = 1; index < frames.length; index += 1) if (frames[index].timestampMs <= frames[index - 1].timestampMs) throw new Error("INVALID_TIMESTAMP_ORDER"); }
function wrappedAngleDifference(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }
function isObserved(point) { return point?.state === "OBSERVED"; }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function median(values) { const sorted = [...values].sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; }
