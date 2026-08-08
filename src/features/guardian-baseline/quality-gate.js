export const G2A_QUALITY_POLICY_VERSION = "gbe-g2a-quality-v1";

export const G2A_QUALITY_POLICY = deepFreeze({
  version: G2A_QUALITY_POLICY_VERSION,
  hard: {
    corruptionRatio: 0.5,
    cameraMotionRisk: 0.75,
    occlusionRatio: 0.6,
    outOfFrameRatio: 0.5,
    minimumUsableDurationMs: 4_000,
    minimumTrackingCoverage: 0.5,
    minimumVisibleBodyCoverage: 0.45
  },
  partial: {
    cameraMotionRisk: 0.25,
    occlusionRatio: 0.2,
    lowLightRisk: 0.55,
    blurRisk: 0.45,
    orientationInstability: 0.5
  }
});

export function evaluateQualityGate(metrics, policy = G2A_QUALITY_POLICY) {
  const reasons = [];
  if (metrics.identitySwitchDetected) reasons.push("IDENTITY_SWITCH_DETECTED");
  if (metrics.corruptionRatio >= policy.hard.corruptionRatio) reasons.push("FRAME_CORRUPTION");
  if (metrics.cameraMotionRisk >= policy.hard.cameraMotionRisk) reasons.push("CAMERA_SHAKE");
  if (metrics.occlusionRatio >= policy.hard.occlusionRatio) reasons.push("PROLONGED_OCCLUSION");
  if (metrics.outOfFrameRatio >= policy.hard.outOfFrameRatio) reasons.push("PET_LEFT_FRAME");
  if (metrics.usableDurationMs < policy.hard.minimumUsableDurationMs) reasons.push("CAPTURE_TOO_SHORT");
  if (metrics.trackingCoverage < policy.hard.minimumTrackingCoverage) reasons.push("POOR_TRACKING");
  if (metrics.visibleBodyCoverage < policy.hard.minimumVisibleBodyCoverage) reasons.push("LOW_BODY_COVERAGE");

  const hardFailure = reasons.length > 0;
  const partialReasons = [];
  if (metrics.cameraMotionRisk >= policy.partial.cameraMotionRisk) partialReasons.push("CAMERA_MOTION_RISK");
  if (metrics.occlusionRatio >= policy.partial.occlusionRatio) partialReasons.push("OCCLUSION_RISK");
  if (metrics.lowLightRisk >= policy.partial.lowLightRisk) partialReasons.push("LOW_LIGHT");
  if (metrics.blurRisk >= policy.partial.blurRisk) partialReasons.push("BLUR_RISK");
  if (metrics.orientationInstability >= policy.partial.orientationInstability) partialReasons.push("ORIENTATION_INSTABILITY");
  const result = hardFailure ? "INSUFFICIENT_CAPTURE" : partialReasons.length ? "PARTIALLY_USABLE" : "USABLE";
  return Object.freeze({
    result,
    policyVersion: policy.version,
    reasons: Object.freeze(hardFailure ? reasons : partialReasons),
    suppressedFeatureGroups: Object.freeze(result === "USABLE" ? [] : ["TREND_UPDATE"])
  });
}

function deepFreeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) if (child && typeof child === "object" && !Object.isFrozen(child)) deepFreeze(child);
  return value;
}
