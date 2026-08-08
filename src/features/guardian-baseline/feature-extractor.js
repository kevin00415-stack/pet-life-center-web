import { normalizeTechnicalFrames } from "./normalization.js";
import { segmentMotion } from "./segmentation.js";
import { evaluateQualityGate } from "./quality-gate.js";

export const FEATURE_AVAILABILITY = Object.freeze({ OBSERVED: "OBSERVED", NOT_OBSERVED: "NOT_OBSERVED", UNKNOWN: "UNKNOWN" });
export const G1_FEATURE_SCHEMA_VERSION = "gbe-g2a-features-v1";
export const G2A_FEATURE_KEYS = Object.freeze([
  "usableDuration", "movementRatio", "restRatio", "motionIntensity", "continuousActivityDuration",
  "pauseFrequency", "turningFrequency", "transitionDuration", "trackedBodyCoverage", "movementRegularity"
]);

export function createDeterministicFeatureExtractor() {
  return { callCount: 0, async extract(request) { this.callCount += 1; return extractDeterministicFeatures(request); } };
}

export function extractDeterministicFeatures({ analysisRunId, petId, video, purpose }) {
  if (!analysisRunId || !petId || !video?.id || video.petId !== petId) throw new Error("PET_SCOPE_MISMATCH");
  const normalized = normalizeTechnicalFrames(video);
  const frames = normalized.frames.map((frame) => frame.trackedPetId === null ? Object.freeze({ ...frame, trackedPetId: petId }) : frame);
  const metrics = recalculateLegacyTracking(normalized.trackingMetrics, normalized.frames, frames, petId);
  const qualityGate = evaluateQualityGate(metrics);
  const segments = segmentMotion(frames);
  const opportunityDuration = metrics.usableDurationMs;
  const motionFrames = frames.filter((frame) => frame.usable && Number.isFinite(frame.normalizedMotion));
  const motionDuration = sum(motionFrames.map((frame) => frame.durationMs));
  const evidenceCoverage = ratio(motionDuration, opportunityDuration);
  const explicitNotObserved = frames.length > 0 && frames.every((frame) => frame.motionAvailability === FEATURE_AVAILABILITY.NOT_OBSERVED);

  let features;
  if (metrics.identitySwitchDetected) features = Object.fromEntries(G2A_FEATURE_KEYS.map((key) => [key, unknown("IDENTITY_SWITCH_DETECTED", opportunityDuration)]));
  else {
    const movementDuration = durationOf(segments, ["MOVEMENT", "TRANSITION", "TURN"]);
    const restDuration = durationOf(segments, ["REST"]);
    const transitions = segments.filter((segment) => segment.type === "TRANSITION");
    const turns = segments.filter((segment) => segment.type === "TURN");
    const pauses = countPauses(segments);
    const activityRuns = segments.filter((segment) => ["MOVEMENT", "TRANSITION", "TURN"].includes(segment.type));
    const motionUnavailable = !motionFrames.length;
    const motionDatum = (factory, absentReason = "MOTION_SIGNAL_UNAVAILABLE") => explicitNotObserved
      ? notObserved("MOTION_EVENT_NOT_OBSERVED", opportunityDuration)
      : motionUnavailable ? unknown(absentReason, opportunityDuration) : factory();
    features = {
      usableDuration: positive(video.durationMs) ? observed(opportunityDuration, "ms", metrics.usableFrameRatio, video.durationMs, metrics.usableFrameRatio) : unknown("INVALID_VIDEO_DURATION", 0),
      movementRatio: motionDatum(() => observed(ratio(movementDuration, opportunityDuration), "ratio", evidenceCoverage, opportunityDuration, evidenceCoverage)),
      restRatio: motionDatum(() => observed(ratio(restDuration, opportunityDuration), "ratio", evidenceCoverage, opportunityDuration, evidenceCoverage)),
      motionIntensity: motionDatum(() => observed(median(motionFrames.map((frame) => frame.normalizedMotion)), "body_relative", evidenceCoverage, opportunityDuration, evidenceCoverage)),
      continuousActivityDuration: motionDatum(() => observed(Math.max(0, ...activityRuns.map((segment) => segment.durationMs)), "ms", evidenceCoverage, opportunityDuration, evidenceCoverage)),
      pauseFrequency: motionDatum(() => observed(ratePerMinute(pauses, opportunityDuration), "per_minute", evidenceCoverage, opportunityDuration, evidenceCoverage)),
      turningFrequency: turns.length ? observed(ratePerMinute(turns.length, opportunityDuration), "per_minute", evidenceCoverage, opportunityDuration, evidenceCoverage) : notObserved("TURN_NOT_OBSERVED", opportunityDuration),
      transitionDuration: transitions.length ? observed(median(transitions.map((segment) => segment.durationMs)), "ms", meanConfidence(transitions), opportunityDuration, ratio(sum(transitions.map((item) => item.durationMs)), opportunityDuration)) : notObserved("TRANSITION_NOT_OBSERVED", opportunityDuration),
      trackedBodyCoverage: hasBodyCoverageEvidence(video) && metrics.trackingCoverage > 0 ? observed(metrics.visibleBodyCoverage, "ratio", metrics.trackingContinuity, opportunityDuration, metrics.trackingCoverage) : unknown("TRACKING_UNAVAILABLE", opportunityDuration),
      movementRegularity: activityRuns.length >= 3 ? observed(regularity(activityRuns.map((segment) => segment.durationMs)), "ratio", meanConfidence(activityRuns), opportunityDuration, evidenceCoverage) : unknown("INSUFFICIENT_ACTIVITY_SEGMENTS", opportunityDuration)
    };
  }
  features = Object.freeze(Object.fromEntries(G2A_FEATURE_KEYS.map((key) => [key, features[key]])));
  const observedMask = Object.freeze(Object.fromEntries(G2A_FEATURE_KEYS.map((key) => [key, features[key].availability === FEATURE_AVAILABILITY.OBSERVED])));
  const status = qualityGate.result === "INSUFFICIENT_CAPTURE" ? "INSUFFICIENT_CAPTURE" : "COMPLETE";
  return Object.freeze({
    status,
    failureCode: metrics.identitySwitchDetected ? "IDENTITY_SWITCH_DETECTED" : qualityGate.reasons[0] ?? null,
    qualityGate,
    vector: Object.freeze({
      id: `vector-${analysisRunId}`, analysisRunId, petId, videoId: video.id, purpose,
      schemaVersion: G1_FEATURE_SCHEMA_VERSION, extractorVersion: "gbe-g2a-deterministic-v1",
      usableDurationMs: opportunityDuration, features, observedMask,
      segments, qualitySummary: Object.freeze({ ...metrics, usable: qualityGate.result !== "INSUFFICIENT_CAPTURE", qualityResult: qualityGate.result, qualityPolicyVersion: qualityGate.policyVersion })
    })
  });
}

function recalculateLegacyTracking(metrics, original, frames, petId) {
  if (!original.some((frame) => frame.trackedPetId === null)) return metrics;
  const total = metrics.totalDurationMs;
  const tracked = sum(frames.filter((frame) => frame.trackedPetId === petId && frame.inFrame).map((frame) => frame.durationMs));
  return Object.freeze({ ...metrics, trackingCoverage: ratio(tracked, total), trackingContinuity: ratio(tracked, total) });
}
function hasBodyCoverageEvidence(video) { return video.technicalFrames.some((frame) => Number.isFinite(frame.trackedBodyCoverage) || Number.isFinite(frame.visibleBodyCoverage)); }
function observed(value, unit, confidence, opportunityDuration, evidenceCoverage) { return Object.freeze({ availability: "OBSERVED", value, unit, confidence: clamp01(confidence), reasonCode: null, opportunityDuration, evidenceCoverage: clamp01(evidenceCoverage) }); }
export function notObserved(reasonCode, opportunityDuration = 0) { return Object.freeze({ availability: "NOT_OBSERVED", value: null, unit: null, confidence: 1, reasonCode, opportunityDuration, evidenceCoverage: 0 }); }
function unknown(reasonCode, opportunityDuration = 0) { return Object.freeze({ availability: "UNKNOWN", value: null, unit: null, confidence: 0, reasonCode, opportunityDuration, evidenceCoverage: 0 }); }
function durationOf(segments, types) { return sum(segments.filter((item) => types.includes(item.type)).map((item) => item.durationMs)); }
function countPauses(segments) { return segments.filter((item, index) => item.type === "REST" && index > 0 && index < segments.length - 1 && segments[index - 1].type !== "UNKNOWN" && segments[index + 1].type !== "UNKNOWN").length; }
function ratePerMinute(count, duration) { return duration ? count * 60_000 / duration : 0; }
function regularity(values) { const avg = sum(values) / values.length; const variance = sum(values.map((value) => (value - avg) ** 2)) / values.length; return clamp01(1 - Math.sqrt(variance) / Math.max(avg, 1)); }
function median(values) { const sorted = [...values].sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; }
function meanConfidence(items) { return items.length ? sum(items.map((item) => item.confidence)) / items.length : 0; }
function positive(value) { return Number.isFinite(value) && value > 0; }
function ratio(value, total) { return total ? value / total : 0; }
function sum(values) { return values.reduce((total, value) => total + value, 0); }
function clamp01(value) { return Math.max(0, Math.min(1, value)); }
